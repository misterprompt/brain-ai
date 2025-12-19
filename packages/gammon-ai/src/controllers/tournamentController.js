"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTournamentOverview = exports.getTournamentBracket = exports.getTournamentStandings = exports.reportTournamentMatch = exports.startTournament = exports.getTournamentLeaderboard = exports.getTournamentParticipants = exports.getTournament = exports.joinTournament = exports.leaveTournament = exports.createTournament = void 0;
const zod_1 = require("zod");
const tournamentServer_js_1 = require("../websocket/tournamentServer.js");
const notificationService_1 = require("../services/notificationService");
const tournamentService_1 = require("../services/tournamentService");
const createTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1)
});
const adminIds = () => (process.env.TOURNAMENT_ADMIN_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
const isTournamentAdmin = (userId) => {
    if (!userId) {
        return false;
    }
    const admins = adminIds();
    return admins.length === 0 ? false : admins.includes(userId);
};
const createTournament = async (req, res) => {
    try {
        if (!req.user || !isTournamentAdmin(req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'Only tournament administrators can create tournaments.'
            });
        }
        const { name } = createTournamentSchema.parse(req.body ?? {});
        const tournament = await tournamentService_1.TournamentService.createTournament({
            name,
            createdBy: req.user.id
        });
        return res.status(201).json({ success: true, data: tournament });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: error.issues.map((i) => i.message).join(', ') });
        }
        return res.status(500).json({ success: false, error: 'Failed to create tournament' });
    }
};
exports.createTournament = createTournament;
const leaveTournament = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const tournamentId = req.params.id ?? '';
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        await tournamentService_1.TournamentService.leaveTournament(tournamentId, req.user.id);
        (0, tournamentServer_js_1.broadcastTournamentEvent)(tournamentId, 'tournamentUpdated', {
            tournamentId,
            type: 'participantLeft',
            userId: req.user.id
        });
        await tournamentService_1.TournamentService.notifyParticipants({
            tournamentId,
            message: `${req.user.username ?? 'Un joueur'} a quitté le tournoi`,
            payload: {
                userId: req.user.id,
                action: 'leave'
            },
            excludeUserIds: [req.user.id]
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error instanceof Error && error.message === 'User not registered in this tournament') {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(500).json({ success: false, error: 'Failed to leave tournament' });
    }
};
exports.leaveTournament = leaveTournament;
const joinTournament = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const tournamentId = req.params.id ?? '';
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        const participant = await tournamentService_1.TournamentService.joinTournament(tournamentId, req.user.id);
        (0, tournamentServer_js_1.broadcastTournamentEvent)(tournamentId, 'playerJoined', {
            tournamentId,
            userId: req.user.id
        });
        const tournament = await tournamentService_1.TournamentService.getTournament(tournamentId);
        if (tournament?.createdBy && tournament.createdBy !== req.user.id) {
            notificationService_1.notificationService.notifyInvitation(tournament.createdBy, {
                source: 'tournament',
                contextId: tournamentId,
                inviterId: req.user.id,
                inviterUsername: req.user.username ?? null
            });
        }
        await tournamentService_1.TournamentService.notifyParticipants({
            tournamentId,
            message: `${req.user.username ?? 'Un joueur'} a rejoint le tournoi`,
            payload: {
                userId: req.user.id,
                action: 'join'
            },
            excludeUserIds: [req.user.id]
        });
        return res.status(201).json({ success: true, data: participant });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Tournament not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.includes('no longer accepting')) {
                return res.status(400).json({ success: false, error: error.message });
            }
            if (error.message === 'Tournament is full') {
                return res.status(409).json({ success: false, error: error.message });
            }
            if (error.message === 'User already registered in this tournament') {
                return res.status(409).json({ success: false, error: error.message });
            }
        }
        return res.status(500).json({ success: false, error: 'Failed to join tournament' });
    }
};
exports.joinTournament = joinTournament;
const getTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        const tournament = await tournamentService_1.TournamentService.getTournament(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, error: 'Tournament not found' });
        }
        return res.json({ success: true, data: tournament });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch tournament' });
    }
};
exports.getTournament = getTournament;
const getTournamentParticipants = async (req, res) => {
    try {
        const tournamentId = req.params.id ?? '';
        const participants = await tournamentService_1.TournamentService.listParticipants(tournamentId);
        return res.json({ success: true, data: participants });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch participants' });
    }
};
exports.getTournamentParticipants = getTournamentParticipants;
const getTournamentLeaderboard = async (req, res) => {
    try {
        const tournamentId = req.params.id ?? '';
        const participants = await tournamentService_1.TournamentService.listLeaderboard(tournamentId);
        return res.json({ success: true, data: participants });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
};
exports.getTournamentLeaderboard = getTournamentLeaderboard;
const startTournament = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const tournamentId = req.params.id ?? '';
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        const tournament = await tournamentService_1.TournamentService.getTournament(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, error: 'Tournament not found' });
        }
        const role = await tournamentService_1.TournamentService.getUserRole(tournamentId, req.user.id);
        if (role !== 'ORGANIZER' && !isTournamentAdmin(req.user.id)) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN' });
        }
        await tournamentService_1.TournamentService.startTournament(tournamentId);
        return res.status(200).json({ success: true });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('At least two participants')) {
                return res.status(400).json({ success: false, error: error.message });
            }
        }
        return res.status(500).json({ success: false, error: 'Failed to start tournament' });
    }
};
exports.startTournament = startTournament;
const reportTournamentMatch = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const tournamentId = req.params.id ?? '';
        const matchId = req.params.matchId ?? '';
        if (!tournamentId || !matchId) {
            return res.status(400).json({ success: false, error: 'Invalid identifiers' });
        }
        const bodySchema = zod_1.z.object({
            winnerParticipantId: zod_1.z.string().min(1),
            gameId: zod_1.z.string().optional()
        });
        const payload = bodySchema.parse(req.body ?? {});
        const tournament = await tournamentService_1.TournamentService.getTournament(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, error: 'Tournament not found' });
        }
        const isOwner = tournament.createdBy === req.user.id;
        if (!isOwner && !isTournamentAdmin(req.user.id)) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN' });
        }
        await tournamentService_1.TournamentService.reportMatchResult({
            matchId,
            winnerParticipantId: payload.winnerParticipantId,
            gameId: payload.gameId ?? null
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: error.issues.map((issue) => issue.message).join(', ') });
        }
        if (error instanceof Error) {
            if (error.message === 'Tournament not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.includes('not registered')) {
                return res.status(404).json({ success: false, error: error.message });
            }
        }
        return res.status(500).json({ success: false, error: 'Failed to report match result' });
    }
};
exports.reportTournamentMatch = reportTournamentMatch;
const getTournamentStandings = async (req, res) => {
    try {
        const tournamentId = req.params.id ?? '';
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        const standings = await tournamentService_1.TournamentService.getStandings(tournamentId);
        return res.json({ success: true, data: standings });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch standings' });
    }
};
exports.getTournamentStandings = getTournamentStandings;
const getTournamentBracket = async (req, res) => {
    try {
        const tournamentId = req.params.id ?? '';
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        const bracket = await tournamentService_1.TournamentService.getBracket(tournamentId);
        return res.json({ success: true, data: bracket });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch bracket' });
    }
};
exports.getTournamentBracket = getTournamentBracket;
const getTournamentOverview = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const tournamentId = req.params.id ?? '';
        if (!tournamentId) {
            return res.status(400).json({ success: false, error: 'Invalid tournament identifier' });
        }
        const overview = await tournamentService_1.TournamentService.getOverview(tournamentId, req.user.id);
        return res.json({ success: true, data: overview });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Tournament not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(500).json({ success: false, error: 'Failed to build overview' });
    }
};
exports.getTournamentOverview = getTournamentOverview;
//# sourceMappingURL=tournamentController.js.map