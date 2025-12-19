"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
// src/middleware/requestId.ts
const crypto_1 = require("crypto");
const requestIdMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id']?.toString() ?? (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
//# sourceMappingURL=requestId.js.map