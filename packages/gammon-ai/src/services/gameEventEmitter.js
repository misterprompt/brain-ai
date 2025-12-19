"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameEventEmitter = void 0;
exports.emitGameEvent = emitGameEvent;
const events_1 = require("events");
exports.gameEventEmitter = new events_1.EventEmitter();
function emitGameEvent(gameId, type, payload, userId = null) {
    exports.gameEventEmitter.emit('gameEvent', { gameId, type, payload, userId });
}
//# sourceMappingURL=gameEventEmitter.js.map