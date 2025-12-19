"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastTournamentEvent = exports.handleTournamentConnection = exports.__testUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
const connections = new Map();
exports.__testUtils = {
    addConnection(socket, context) {
        connections.set(socket, context);
    },
    clearConnections() {
        connections.clear();
    }
};
const getAuthHeader = (req) => {
    let authHeader = req.headers.authorization ?? null;
    if (!authHeader) {
        const protocolHeader = req.headers['sec-websocket-protocol'];
        if (typeof protocolHeader === 'string') {
            const bearer = protocolHeader
                .split(',')
                .map((value) => value.trim())
                .find((value) => value.startsWith('Bearer '));
            if (bearer) {
                authHeader = bearer;
            }
        }
    }
    return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};
const verifyUser = (token) => {
    if (!config_1.config.accessTokenSecret) {
        return null;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.accessTokenSecret);
        return decoded?.userId ?? null;
    }
    catch (error) {
        return null;
    }
};
const handleTournamentConnection = async (socket, req, url) => {
    const tournamentId = url.searchParams.get('tournamentId');
    if (!tournamentId) {
        socket.close(1008, 'Missing tournament identifier');
        return;
    }
    const token = getAuthHeader(req);
    if (!token) {
        socket.close(1008, 'Unauthorized');
        return;
    }
    const userId = verifyUser(token);
    if (!userId) {
        socket.close(1008, 'Unauthorized');
        return;
    }
    const participant = await prisma_1.prisma.tournament_participants.findUnique({
        where: {
            tournament_id_user_id: {
                tournament_id: tournamentId,
                user_id: userId
            }
        }
    });
    if (!participant) {
        socket.close(1008, 'Unauthorized');
        return;
    }
    const context = { userId, tournamentId };
    connections.set(socket, context);
    socket.on('message', (raw) => {
        try {
            // Currently, no client-originated messages are processed. Validate JSON to avoid malformed payloads.
            const payload = JSON.parse(raw.toString());
            if (!payload || typeof payload !== 'object') {
                throw new Error('Invalid payload');
            }
        }
        catch (error) {
            socket.send(JSON.stringify({
                success: false,
                error: 'Invalid message format'
            }));
        }
    });
    socket.on('close', () => {
        connections.delete(socket);
    });
};
exports.handleTournamentConnection = handleTournamentConnection;
const broadcastTournamentEvent = (tournamentId, type, payload) => {
    for (const [socket, context] of connections.entries()) {
        if (context.tournamentId !== tournamentId) {
            continue;
        }
        try {
            socket.send(JSON.stringify({
                type,
                payload,
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            socket.close(1011, 'Broadcast failure');
            connections.delete(socket);
        }
    }
};
exports.broadcastTournamentEvent = broadcastTournamentEvent;
//# sourceMappingURL=tournamentServer.js.map