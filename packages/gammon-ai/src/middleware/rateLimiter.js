"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('RateLimiter');
// Defensive wrapper around config.rateLimit so we don't crash if it's undefined at runtime
const rateLimitConfig = config_1.config.rateLimit ?? {
    enabled: false,
    bypassUserIds: [],
    defaultMessage: 'Too many requests. Please try again later.',
    auth: undefined,
    gnubg: undefined
};
const forwardedIp = (req) => {
    const header = req.headers['x-forwarded-for'];
    if (!header) {
        return null;
    }
    if (Array.isArray(header)) {
        return header[0];
    }
    return header.split(',')[0]?.trim() ?? null;
};
const resolveKey = (req) => {
    if (req.user?.id) {
        return `user:${req.user.id}`;
    }
    const ip = req.ip || forwardedIp(req) || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
};
const shouldBypass = (req) => {
    if (!rateLimitConfig.enabled) {
        return true;
    }
    if (config_1.config.nodeEnv === 'test' && process.env.RATE_LIMIT_TEST_MODE !== 'true') {
        return true;
    }
    if (req.user?.role && req.user.role.toLowerCase() === 'admin') {
        return true;
    }
    if (req.user?.id && rateLimitConfig.bypassUserIds.includes(req.user.id)) {
        return true;
    }
    return false;
};
const createRateLimiter = (scope) => {
    const settings = rateLimitConfig[scope];
    if (!settings || !rateLimitConfig.enabled) {
        const noop = ((_req, _res, next) => next());
        noop.resetKey = () => { };
        noop.getKey = async () => undefined;
        return noop;
    }
    const message = settings.message ?? config_1.config.rateLimit.defaultMessage;
    return (0, express_rate_limit_1.default)({
        windowMs: settings.windowMs,
        max: settings.max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: message
        },
        keyGenerator: (req) => resolveKey(req),
        skip: (req) => shouldBypass(req),
        handler: (req, res, _next, options) => {
            const key = resolveKey(req);
            logger.warn('Rate limit exceeded', {
                scope,
                key,
                limit: options.limit,
                windowMs: settings.windowMs
            });
            res.status(options.statusCode).json({
                success: false,
                error: message
            });
        }
    });
};
exports.createRateLimiter = createRateLimiter;
//# sourceMappingURL=rateLimiter.js.map