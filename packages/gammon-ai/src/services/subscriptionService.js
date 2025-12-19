"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../lib/prisma");
// Using string literals that match the enum values in schema.prisma
const ACTIVE_STATUSES = ['ACTIVE'];
const PREMIUM_PLANS = ['PREMIUM', 'VIP'];
exports.SubscriptionService = {
    async getUserPlan(userId) {
        if (!userId) {
            return 'free';
        }
        const subscription = await prisma_1.prisma.subscriptions.findUnique({
            where: { user_id: userId }
        });
        if (!subscription) {
            return 'free';
        }
        const isActive = ACTIVE_STATUSES.includes(subscription.status);
        const isPremiumPlan = PREMIUM_PLANS.includes(subscription.plan);
        return isActive && isPremiumPlan ? 'premium' : 'free';
    }
};
//# sourceMappingURL=subscriptionService.js.map