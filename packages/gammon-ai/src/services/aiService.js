"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = exports.setAIProvider = exports.addExtraQuota = exports.getQuotaStatus = exports.checkQuota = exports.QuotaExceededError = void 0;
exports.getBestMove = getBestMove;
exports.evaluatePosition = evaluatePosition;
const prisma_1 = require("../lib/prisma");
const subscriptionService_1 = require("./subscriptionService");
const gnubgProvider_1 = require("../providers/gnubgProvider");
let activeProvider = new gnubgProvider_1.GNUBGProvider();
const FREE_QUOTA = 5;
const PREMIUM_QUOTA = 10;
const quotaKey = (userId, date) => ({
    userId_date: {
        userId,
        date
    }
});
const startOfUtcDay = (date = new Date()) => {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return utc;
};
async function getQuotaRecord(userId, day) {
    let record = await prisma_1.prisma.analysisQuota.findUnique({
        where: quotaKey(userId, day)
    });
    if (record) {
        return record;
    }
    const previous = await prisma_1.prisma.analysisQuota.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
    });
    record = await prisma_1.prisma.analysisQuota.create({
        data: {
            userId,
            date: day,
            count: 0,
            extraQuota: 0,
            initialFree: previous ? previous.initialFree : true
        }
    });
    return record;
}
class QuotaExceededError extends Error {
    statusCode = 429;
    constructor(message = 'Quota IA atteint. Chaque analyse a un coût. Passez Premium ou achetez des analyses supplémentaires.') {
        super(message);
        this.name = 'QuotaExceededError';
    }
}
exports.QuotaExceededError = QuotaExceededError;
const resolveLimit = (plan, quota) => {
    if (plan === 'premium') {
        return PREMIUM_QUOTA;
    }
    return quota.initialFree ? FREE_QUOTA : 0;
};
const maybeDisableInitialFree = (plan, quota, nextCount) => {
    if (plan === 'free' && quota.initialFree && nextCount >= FREE_QUOTA) {
        return { initialFree: false };
    }
    return {};
};
const checkQuota = async (userId) => {
    if (!userId) {
        return 'limit';
    }
    const today = startOfUtcDay();
    const quota = await getQuotaRecord(userId, today);
    const plan = await subscriptionService_1.SubscriptionService.getUserPlan(userId);
    const limit = resolveLimit(plan, quota);
    if (limit > 0 && quota.count < limit) {
        const nextCount = quota.count + 1;
        await prisma_1.prisma.analysisQuota.update({
            where: quotaKey(userId, today),
            data: {
                count: { increment: 1 },
                ...maybeDisableInitialFree(plan, quota, nextCount)
            }
        });
        return 'ok';
    }
    if (quota.extraQuota > 0) {
        await prisma_1.prisma.analysisQuota.update({
            where: quotaKey(userId, today),
            data: {
                extraQuota: { decrement: 1 },
                ...(plan === 'free' && quota.initialFree ? { initialFree: false } : {})
            }
        });
        return 'ok';
    }
    if (plan === 'free' && quota.initialFree && limit === 0) {
        await prisma_1.prisma.analysisQuota.update({
            where: quotaKey(userId, today),
            data: { initialFree: false }
        });
    }
    return 'limit';
};
exports.checkQuota = checkQuota;
const getQuotaStatus = async (userId) => {
    const today = startOfUtcDay();
    const quota = await getQuotaRecord(userId, today);
    const plan = await subscriptionService_1.SubscriptionService.getUserPlan(userId);
    const limit = resolveLimit(plan, quota);
    return {
        plan,
        used: quota.count,
        limit,
        extra: quota.extraQuota
    };
};
exports.getQuotaStatus = getQuotaStatus;
const addExtraQuota = async (userId, amount) => {
    if (!userId) {
        throw new Error('User identifier is required to purchase analyses');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid amount provided for quota purchase');
    }
    const today = startOfUtcDay();
    await getQuotaRecord(userId, today);
    const updated = await prisma_1.prisma.analysisQuota.update({
        where: quotaKey(userId, today),
        data: {
            extraQuota: { increment: Math.trunc(amount) }
        }
    });
    return updated.extraQuota;
};
exports.addExtraQuota = addExtraQuota;
const setAIProvider = (provider) => {
    activeProvider = provider;
};
exports.setAIProvider = setAIProvider;
async function getBestMove(input) {
    if (!input.userId) {
        throw new Error('userId is required for AI analysis');
    }
    const quota = await (0, exports.checkQuota)(input.userId);
    if (quota === 'limit') {
        throw new QuotaExceededError();
    }
    return activeProvider.getBestMove(input);
}
async function evaluatePosition(input) {
    if (!input.userId) {
        throw new Error('userId is required for AI analysis');
    }
    const quota = await (0, exports.checkQuota)(input.userId);
    if (quota === 'limit') {
        throw new QuotaExceededError();
    }
    return activeProvider.evaluatePosition(input);
}
exports.AIService = {
    getBestMove,
    evaluatePosition,
    checkQuota: exports.checkQuota,
    getQuotaStatus: exports.getQuotaStatus,
    addExtraQuota: exports.addExtraQuota
};
//# sourceMappingURL=aiService.js.map