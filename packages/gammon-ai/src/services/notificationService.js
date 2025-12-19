"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const server_1 = require("../websocket/server");
const buildTimestamp = () => new Date().toISOString();
function buildQuotaExhaustedNotification(params) {
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
    };
}
function buildTournamentUpdateNotification(params) {
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
    };
}
function buildQuotaResetNotification(params) {
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
    };
}
function buildVictoryNotification(params) {
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
    };
}
function buildInvitationNotification(params) {
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
    };
}
const defaultDispatch = (userId, notification) => {
    (0, server_1.sendNotification)(userId, notification);
};
class NotificationService {
    dispatch;
    constructor(dispatch = defaultDispatch) {
        this.dispatch = dispatch;
    }
    notifyQuotaExhausted(userId, params) {
        const notification = buildQuotaExhaustedNotification(params);
        this.dispatch(userId, notification);
        return notification;
    }
    notifyQuotaReset(userId, params) {
        const notification = buildQuotaResetNotification(params);
        this.dispatch(userId, notification);
        return notification;
    }
    notifyVictory(userId, params) {
        const notification = buildVictoryNotification(params);
        this.dispatch(userId, notification);
        return notification;
    }
    notifyInvitation(userId, params) {
        const notification = buildInvitationNotification(params);
        this.dispatch(userId, notification);
        return notification;
    }
    notifyTournamentUpdate(userId, params) {
        const notification = buildTournamentUpdateNotification(params);
        this.dispatch(userId, notification);
        return notification;
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notificationService.js.map