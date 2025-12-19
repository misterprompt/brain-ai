import type { NotificationEnvelope, QuotaExhaustedNotification, QuotaResetNotification, VictoryNotification, InvitationNotification, InvitationSource, TournamentUpdateNotification } from '../types/notifications';
import type { UserPlan } from './subscriptionService';
export type NotificationDispatch = (userId: string, notification: NotificationEnvelope) => void;
export declare class NotificationService {
    private readonly dispatch;
    constructor(dispatch?: NotificationDispatch);
    notifyQuotaExhausted(userId: string, params: {
        plan: UserPlan;
        remainingDailyQuota: number;
        remainingPremiumQuota: number;
        remainingExtraQuota: number;
    }): QuotaExhaustedNotification;
    notifyQuotaReset(userId: string, params: {
        plan: UserPlan;
        dailyQuota: number;
        premiumQuota: number;
        extraQuota: number;
    }): QuotaResetNotification;
    notifyVictory(userId: string, params: {
        gameId: string;
        opponentId: string | null;
        opponentUsername: string | null;
    }): VictoryNotification;
    notifyInvitation(userId: string, params: {
        source: InvitationSource;
        contextId: string;
        inviterId: string;
        inviterUsername: string | null;
    }): InvitationNotification;
    notifyTournamentUpdate(userId: string, params: {
        tournamentId: string;
        round: number;
        message: string;
        payload?: Record<string, unknown> | null;
    }): TournamentUpdateNotification;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notificationService.d.ts.map