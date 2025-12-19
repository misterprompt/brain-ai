// src/services/subscriptionService.ts
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type UserPlan = 'free' | 'premium';

// Using string literals that match the enum values in schema.prisma
const ACTIVE_STATUSES: SubscriptionStatus[] = ['ACTIVE'];
const PREMIUM_PLANS: SubscriptionPlan[] = ['PREMIUM', 'VIP'];

export const SubscriptionService = {
  async getUserPlan(userId: string): Promise<UserPlan> {
    if (!userId) {
      return 'free';
    }

    const subscription = await prisma.subscriptions.findUnique({
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
