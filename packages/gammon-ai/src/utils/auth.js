"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePlayerInGame = ensurePlayerInGame;
function ensurePlayerInGame(req, game) {
    const authReq = req;
    const userId = authReq.user?.id;
    if (!userId) {
        return false;
    }
    const whitePlayerId = game.whitePlayerId ?? game.player1?.id;
    const blackPlayerId = game.blackPlayerId ?? game.player2?.id ?? null;
    return userId === whitePlayerId || (!!blackPlayerId && userId === blackPlayerId);
}
//# sourceMappingURL=auth.js.map