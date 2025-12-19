import type { UserPlan } from '../services/subscriptionService';

export type NotificationKind =
  | 'quota_exhausted'
  | 'quota_reset'
  | 'victory'
  | 'invitation'
  | 'tournament_update';

export interface BaseNotification<TData> {
  kind: NotificationKind;
  title: string;
  message: string;
  data: TData;
  timestamp: string;
}

export interface QuotaExhaustedData {
  plan: UserPlan;
  remainingDailyQuota: number;
  remainingPremiumQuota: number;
  remainingExtraQuota: number;
}

export type QuotaExhaustedNotification = BaseNotification<QuotaExhaustedData> & {
  kind: 'quota_exhausted';
};

export interface QuotaResetData {
  plan: UserPlan;
  dailyQuota: number;
  premiumQuota: number;
  extraQuota: number;
}

export type QuotaResetNotification = BaseNotification<QuotaResetData> & {
  kind: 'quota_reset';
};

export interface VictoryData {
  gameId: string;
  opponentId: string | null;
  opponentUsername: string | null;
}

export type VictoryNotification = BaseNotification<VictoryData> & {
  kind: 'victory';
};

export type InvitationSource = 'match' | 'tournament';

export interface InvitationData {
  source: InvitationSource;
  contextId: string;
  inviterId: string;
  inviterUsername: string | null;
}

export type InvitationNotification = BaseNotification<InvitationData> & {
  kind: 'invitation';
};

export interface TournamentUpdateData {
  tournamentId: string;
  round: number;
  message: string;
  payload?: Record<string, unknown> | null;
}

export type TournamentUpdateNotification = BaseNotification<TournamentUpdateData> & {
  kind: 'tournament_update';
};

export type NotificationEnvelope =
  | QuotaExhaustedNotification
  | QuotaResetNotification
  | VictoryNotification
  | InvitationNotification
  | TournamentUpdateNotification;
