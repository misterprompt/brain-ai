"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gnubgService = void 0;
exports.getHint = getHint;
exports.evaluatePosition = evaluatePosition;
exports.analyzeGame = analyzeGame;
// src/services/gnubgService.ts
const client_1 = require("@prisma/client");
const gnubgProvider_1 = require("../providers/gnubgProvider");
const logger_1 = require("../utils/logger");
const prisma_1 = require("../lib/prisma");
const quotaMetrics_1 = require("../metrics/quotaMetrics");
const subscriptionService_1 = require("./subscriptionService");
const aiService_1 = require("./aiService");
const notificationService_1 = require("./notificationService");
const provider = new gnubgProvider_1.GNUBGProvider();
const logger = new logger_1.Logger('GNUBGService');
const FREE_DAILY_QUOTA = 5;
const PREMIUM_DAILY_QUOTA = 10;
const asQuotaClient = (client) => client;
const quotaDelegate = (client) => asQuotaClient(client).iAQuota;
const toQuotaRecord = (record) => {
    const quota = record;
    return {
        id: quota.id,
        userId: quota.userId,
        dailyQuota: quota.dailyQuota,
        premiumQuota: quota.premiumQuota,
        extrasUsed: quota.extrasUsed,
        resetAt: quota.resetAt instanceof Date ? quota.resetAt : new Date(quota.resetAt)
    };
};
const nextResetAt = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
const initialQuota = (plan) => ({
    dailyQuota: plan === 'free' ? FREE_DAILY_QUOTA : 0,
    premiumQuota: plan === 'premium' ? PREMIUM_DAILY_QUOTA : 0
});
const resetQuotaIfNeeded = (record, plan) => {
    const now = new Date();
    if (record.resetAt.getTime() > now.getTime()) {
        return record;
    }
    const seed = initialQuota(plan);
    return {
        ...record,
        dailyQuota: seed.dailyQuota,
        premiumQuota: seed.premiumQuota,
        extrasUsed: 0,
        resetAt: nextResetAt(now)
    };
};
const ensureQuotaRecord = async (client, userId, plan) => {
    const delegate = quotaDelegate(client);
    const existing = await delegate.findUnique({ where: { userId } });
    let record = existing ? toQuotaRecord(existing) : null;
    if (!record) {
        const seed = initialQuota(plan);
        const created = await delegate.create({
            data: {
                userId,
                dailyQuota: seed.dailyQuota,
                premiumQuota: seed.premiumQuota,
                extrasUsed: 0,
                resetAt: nextResetAt()
            }
        });
        record = toQuotaRecord(created);
        return { record, reset: true };
    }
    const reset = resetQuotaIfNeeded(record, plan);
    if (reset === record) {
        return { record, reset: false };
    }
    const updatedResult = await delegate.update({
        where: { userId },
        data: {
            dailyQuota: reset.dailyQuota,
            premiumQuota: reset.premiumQuota,
            extrasUsed: reset.extrasUsed,
            resetAt: reset.resetAt
        }
    });
    const updated = toQuotaRecord(updatedResult);
    return { record: updated, reset: true };
};
const buildFieldFilter = (field) => {
    if (field === 'premiumQuota') {
        return { premiumQuota: { gt: 0 } };
    }
    if (field === 'dailyQuota') {
        return { dailyQuota: { gt: 0 } };
    }
    return { extrasUsed: { gt: 0 } };
};
const buildFieldDecrement = (field) => {
    if (field === 'premiumQuota') {
        return { premiumQuota: { decrement: 1 } };
    }
    if (field === 'dailyQuota') {
        return { dailyQuota: { decrement: 1 } };
    }
    return { extrasUsed: { decrement: 1 } };
};
const decrementQuotaField = async (client, userId, field) => {
    const delegate = quotaDelegate(client);
    const result = await delegate.updateMany({
        where: {
            userId,
            ...buildFieldFilter(field)
        },
        data: buildFieldDecrement(field)
    });
    if (result.count === 0) {
        return null;
    }
    const record = await delegate.findUnique({ where: { userId } });
    return record ? toQuotaRecord(record) : null;
};
const consumeQuotaInTransaction = async (client, userId, plan) => {
    if (plan === 'premium') {
        const premium = await decrementQuotaField(client, userId, 'premiumQuota');
        if (premium) {
            return { record: premium, source: 'premium' };
        }
    }
    const daily = await decrementQuotaField(client, userId, 'dailyQuota');
    if (daily) {
        return { record: daily, source: 'daily' };
    }
    const extras = await decrementQuotaField(client, userId, 'extrasUsed');
    if (extras) {
        return { record: extras, source: 'extras' };
    }
    return null;
};
const checkAndConsumeQuota = async (userId) => {
    const plan = await subscriptionService_1.SubscriptionService.getUserPlan(userId);
    let quotaResetDaily = null;
    let quotaResetPremium = null;
    let exhaustedDailyQuota = null;
    let exhaustedPremiumQuota = null;
    let lastConsumptionSource = null;
    try {
        const consumption = await prisma_1.prisma.$transaction(async (tx) => {
            const ensureResult = await ensureQuotaRecord(tx, userId, plan);
            if (ensureResult.reset) {
                quotaResetDaily = ensureResult.record.dailyQuota;
                quotaResetPremium = ensureResult.record.premiumQuota;
            }
            const result = await consumeQuotaInTransaction(tx, userId, plan);
            if (!result) {
                const exhaustedDelegate = quotaDelegate(tx);
                const exhaustedRaw = await exhaustedDelegate.findUnique({ where: { userId } });
                const exhaustedRecord = exhaustedRaw ? toQuotaRecord(exhaustedRaw) : null;
                if (exhaustedRecord) {
                    exhaustedDailyQuota = exhaustedRecord.dailyQuota;
                    exhaustedPremiumQuota = exhaustedRecord.premiumQuota;
                }
                throw new aiService_1.QuotaExceededError();
            }
            lastConsumptionSource = result.source;
            return result;
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
        const quota = consumption.record;
        logger.debug('Quota consumed', {
            userId,
            plan,
            consumedFrom: consumption.source,
            dailyQuota: quota.dailyQuota,
            premiumQuota: quota.premiumQuota,
            extrasRemaining: quota.extrasUsed
        });
        quotaMetrics_1.quotaConsumptionTotal.labels(plan, consumption.source).inc();
        if (quotaResetDaily !== null && quotaResetPremium !== null) {
            const dailyQuotaAfterConsumption = quotaResetDaily - (lastConsumptionSource === 'daily' ? 1 : 0);
            const premiumQuotaAfterConsumption = quotaResetPremium - (lastConsumptionSource === 'premium' ? 1 : 0);
            notificationService_1.notificationService.notifyQuotaReset(userId, {
                plan,
                dailyQuota: Math.max(0, dailyQuotaAfterConsumption),
                premiumQuota: Math.max(0, premiumQuotaAfterConsumption),
                extraQuota: 0
            });
        }
    }
    catch (error) {
        if (error instanceof aiService_1.QuotaExceededError) {
            logger.warn('Quota exhausted', {
                userId,
                plan,
                quota: {
                    dailyQuota: exhaustedDailyQuota,
                    premiumQuota: exhaustedPremiumQuota
                }
            });
            quotaMetrics_1.quotaExhaustedTotal.labels(plan).inc();
            const remainingDaily = exhaustedDailyQuota ?? 0;
            const remainingPremium = exhaustedPremiumQuota ?? 0;
            notificationService_1.notificationService.notifyQuotaExhausted(userId, {
                plan,
                remainingDailyQuota: Math.max(0, remainingDaily),
                remainingPremiumQuota: Math.max(0, remainingPremium),
                remainingExtraQuota: 0
            });
        }
        throw error;
    }
};
const buildAnalyzeInput = (input) => {
    const payload = {
        boardState: input.board,
        dice: 'dice' in input && typeof input.dice !== 'undefined' ? input.dice : null
    };
    if ('move' in input && typeof input.move !== 'undefined') {
        payload.move = input.move ?? null;
    }
    if (input.userId) {
        payload.userId = input.userId;
    }
    if (input.gameId) {
        payload.gameId = input.gameId;
    }
    return payload;
};
async function getHint(input) {
    try {
        if (input.userId) {
            await checkAndConsumeQuota(input.userId);
        }
        return await provider.getBestMove(buildAnalyzeInput(input));
    }
    catch (error) {
        logger.error('Failed to fetch hint from GNUBG', error);
        throw error;
    }
}
async function evaluatePosition(input) {
    try {
        if (input.userId) {
            await checkAndConsumeQuota(input.userId);
        }
        return await provider.evaluatePosition(buildAnalyzeInput(input));
    }
    catch (error) {
        logger.error('Failed to evaluate position via GNUBG', error);
        throw error;
    }
}
async function analyzeGame(input) {
    try {
        return await provider.analyzeGame(input.moves);
    }
    catch (error) {
        logger.error('Failed to analyze game via GNUBG', error);
        throw error;
    }
}
exports.gnubgService = {
    getHint,
    evaluatePosition,
    analyzeGame
};
//# sourceMappingURL=gnubgService.js.map