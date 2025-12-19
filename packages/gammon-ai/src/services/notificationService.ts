import type {
  NotificationEnvelope,
  QuotaExhaustedNotification,
  QuotaResetNotification,
  VictoryNotification,
  InvitationNotification,
  InvitationSource,
  TournamentUpdateNotification
} from '../types/notifications';
import type { UserPlan } from './subscriptionService';
import { sendNotification } from '../websocket/server';

const buildTimestamp = () => new Date().toISOString();

function buildQuotaExhaustedNotification(params: {
  plan: UserPlan;
  remainingDailyQuota: number;
  remainingPremiumQuota: number;
  remainingExtraQuota: number;
}): QuotaExhaustedNotification {
  return {
    kind: 'quota_exhausted',
    title: 'Quota IA épuisé',
    message: "Vous avez atteint la limite de vos analyses IA.",
    data: {
      plan: params.plan,
      remainingDailyQuota: params.remainingDailyQuota,
      remainingPremiumQuota: params.remainingPremiumQuota,
      remainingExtraQuota: params.remainingExtraQuota
    },
    timestamp: buildTimestamp()
  } satisfies QuotaExhaustedNotification;
}

function buildTournamentUpdateNotification(params: {
  tournamentId: string;
  round: number;
  message: string;
  payload?: Record<string, unknown> | null;
}): TournamentUpdateNotification {
  return {
    kind: 'tournament_update',
    title: 'Mise à jour tournoi',
    message: params.message,
    data: {
      tournamentId: params.tournamentId,
      round: params.round,
      message: params.message,
      payload: params.payload ?? null
    },
    timestamp: buildTimestamp()
  } satisfies TournamentUpdateNotification;
}

function buildQuotaResetNotification(params: {
  plan: UserPlan;
  dailyQuota: number;
  premiumQuota: number;
  extraQuota: number;
}): QuotaResetNotification {
  return {
    kind: 'quota_reset',
    title: 'Quota IA rechargé',
    message: 'Vos analyses IA sont de nouveau disponibles.',
    data: {
      plan: params.plan,
      dailyQuota: params.dailyQuota,
      premiumQuota: params.premiumQuota,
      extraQuota: params.extraQuota
    },
    timestamp: buildTimestamp()
  } satisfies QuotaResetNotification;
}

function buildVictoryNotification(params: {
  gameId: string;
  opponentId: string | null;
  opponentUsername: string | null;
}): VictoryNotification {
  return {
    kind: 'victory',
    title: 'Victoire !',
    message: "Bravo ! Vous venez de gagner une partie.",
    data: {
      gameId: params.gameId,
      opponentId: params.opponentId,
      opponentUsername: params.opponentUsername
    },
    timestamp: buildTimestamp()
  } satisfies VictoryNotification;
}

function buildInvitationNotification(params: {
  source: InvitationSource;
  contextId: string;
  inviterId: string;
  inviterUsername: string | null;
}): InvitationNotification {
  const isTournament = params.source === 'tournament';
  return {
    kind: 'invitation',
    title: isTournament ? 'Invitation à un tournoi' : 'Invitation à une partie',
    message: isTournament
      ? 'Vous êtes invité à rejoindre un tournoi sur Guruu Gammon.'
      : 'Vous êtes invité à jouer une partie sur Guruu Gammon.',
    data: {
      source: params.source,
      contextId: params.contextId,
      inviterId: params.inviterId,
      inviterUsername: params.inviterUsername
    },
    timestamp: buildTimestamp()
  } satisfies InvitationNotification;
}

export type NotificationDispatch = (userId: string, notification: NotificationEnvelope) => void;

const defaultDispatch: NotificationDispatch = (userId, notification) => {
  sendNotification(userId, notification);
};

export class NotificationService {
  constructor(private readonly dispatch: NotificationDispatch = defaultDispatch) {}

  notifyQuotaExhausted(userId: string, params: {
    plan: UserPlan;
    remainingDailyQuota: number;
    remainingPremiumQuota: number;
    remainingExtraQuota: number;
  }) {
    const notification = buildQuotaExhaustedNotification(params);
    this.dispatch(userId, notification);
    return notification;
  }

  notifyQuotaReset(userId: string, params: {
    plan: UserPlan;
    dailyQuota: number;
    premiumQuota: number;
    extraQuota: number;
  }) {
    const notification = buildQuotaResetNotification(params);
    this.dispatch(userId, notification);
    return notification;
  }

  notifyVictory(userId: string, params: {
    gameId: string;
    opponentId: string | null;
    opponentUsername: string | null;
  }) {
    const notification = buildVictoryNotification(params);
    this.dispatch(userId, notification);
    return notification;
  }

  notifyInvitation(userId: string, params: {
    source: InvitationSource;
    contextId: string;
    inviterId: string;
    inviterUsername: string | null;
  }) {
    const notification = buildInvitationNotification(params);
    this.dispatch(userId, notification);
    return notification;
  }

  notifyTournamentUpdate(userId: string, params: {
    tournamentId: string;
    round: number;
    message: string;
    payload?: Record<string, unknown> | null;
  }) {
    const notification = buildTournamentUpdateNotification(params);
    this.dispatch(userId, notification);
    return notification;
  }
}

export const notificationService = new NotificationService();
