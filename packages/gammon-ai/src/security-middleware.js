"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationRules = exports.auditLog = exports.sanitizeError = exports.requestTimeout = exports.compressionConfig = exports.securityHeaders = exports.requestSizeLimits = exports.sanitizeInput = exports.validateRequest = exports.speedLimit = exports.rateLimits = void 0;
// Security and Performance Middleware
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Express slow down has ESM export issues with Node.js v22+, use require
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const express_validator_1 = require("express-validator");
const logger_1 = require("./utils/logger");
const auditLogger = new logger_1.Logger('AuditLog');
const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const parseList = (value) => (typeof value === 'string'
    ? value.split(',').map(item => item.trim()).filter(Boolean)
    : []);
const appendSources = (target, sources) => {
    for (const source of sources) {
        if (source && !target.includes(source)) {
            target.push(source);
        }
    }
};
const defaultFrontendOrigins = ['https://gammon-guru.app', 'https://app.gammonguru.com'];
const trustedFrontends = Array.from(new Set([
    ...defaultFrontendOrigins,
    ...parseList(process.env.FRONTEND_URL),
    ...parseList(process.env.CORS_ORIGIN)
]));
const connectSrc = ["'self'", 'https:', 'wss:'];
const imgSrc = ["'self'", 'data:', 'https:'];
const styleSrc = ["'self'", 'https://fonts.googleapis.com'];
const fontSrc = ["'self'", 'https://fonts.gstatic.com'];
const scriptSrc = ["'self'"];
if (!isProduction) {
    appendSources(connectSrc, ['http://localhost:*', 'ws:', 'http:']);
    appendSources(imgSrc, ['http://localhost:*']);
    appendSources(styleSrc, ["'unsafe-inline'", 'http://localhost:*']);
    appendSources(scriptSrc, ["'unsafe-inline'", "'unsafe-eval'"]);
}
else {
    appendSources(styleSrc, ["'unsafe-inline'"]);
}
appendSources(connectSrc, trustedFrontends);
appendSources(imgSrc, trustedFrontends);
appendSources(connectSrc, parseList(process.env.CSP_CONNECT_SRC));
appendSources(imgSrc, parseList(process.env.CSP_IMG_SRC));
appendSources(styleSrc, parseList(process.env.CSP_STYLE_SRC));
appendSources(fontSrc, parseList(process.env.CSP_FONT_SRC));
appendSources(scriptSrc, parseList(process.env.CSP_SCRIPT_SRC));
// Rate limiting configurations
const createRateLimit = (windowMs, maxRequests, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs: windowMs,
        max: maxRequests,
        message: {
            error: 'Too many requests',
            message: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Redis store in production
        // store: new RedisStore({ /* redis config */ })
    });
};
// Different rate limits for different endpoints
exports.rateLimits = {
    // Strict limits for auth endpoints
    auth: createRateLimit(15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per 15 minutes
    'Too many authentication attempts. Try again in 15 minutes.'),
    // Moderate limits for game actions
    game: createRateLimit(60 * 1000, // 1 minute
    60, // 60 requests per minute
    'Too many game requests. Slow down!'),
    // Generous limits for read operations
    read: createRateLimit(60 * 1000, // 1 minute
    120, // 120 requests per minute
    'Too many requests. Please wait.'),
    // Strict limits for image generation
    images: createRateLimit(60 * 1000, // 1 minute
    30, // 30 images per minute
    'Too many image requests. Slow down!'),
    // Very generous limits for health checks
    health: createRateLimit(60 * 1000, // 1 minute
    1000, // 1000 requests per minute
    'Health check limit exceeded')
};
// Slow down progressive delays (disabled outside production to keep tests fast)
// TEMPORARY: Disabled due to ESM issues with express-slow-down on Node.js 22+
exports.speedLimit = Object.assign((req, _res, next) => next(), {
    resetKey: () => { },
    store: undefined
});
// Input validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
exports.validateRequest = validateRequest;
// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
    // Remove null bytes and control characters
    const sanitizeString = (str) => {
        if (typeof str !== 'string')
            return str;
        // Remove control characters using Unicode escape ranges to satisfy no-control-regex
        let result = '';
        for (let i = 0; i < str.length; i += 1) {
            const code = str.charCodeAt(i);
            if ((code >= 0 && code <= 31) || (code >= 127 && code <= 159)) {
                continue;
            }
            result += str[i];
        }
        return result.trim();
    };
    // Sanitize all string inputs
    const sanitizeObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    };
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        sanitizeObject(req.params);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
// Request size limits
exports.requestSizeLimits = {
    json: '10mb',
    urlencoded: '10mb',
    text: '1mb'
};
// Security headers configuration
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc,
            fontSrc,
            imgSrc,
            scriptSrc,
            connectSrc,
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});
// Compression configuration
exports.compressionConfig = (0, compression_1.default)({
    level: 6, // Good balance between speed and compression
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Don't compress images, they're already compressed
        if (req.headers.accept && req.headers.accept.includes('image/')) {
            return false;
        }
        return compression_1.default.filter(req, res);
    }
});
// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request timeout',
                    message: 'The request took too long to process'
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));
        next();
    };
};
exports.requestTimeout = requestTimeout;
// Error sanitization middleware
const sanitizeError = (error, req, res, _next) => {
    // Don't leak internal errors
    const sanitizedError = {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
    // Log the full error for monitoring
    console.error('Sanitized Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    if (!res.headersSent) {
        res.status(500).json(sanitizedError);
    }
};
exports.sanitizeError = sanitizeError;
// Audit logging middleware
const auditLog = (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const requestId = req.requestId || res.get('X-Request-Id') || undefined;
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            status: res.statusCode,
            durationMs: duration,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous',
            contentLength: Number(res.get('Content-Length') || 0),
            origin: req.get('Origin') || undefined,
            referer: req.get('Referer') || undefined,
            requestId
        };
        const logMethod = res.statusCode >= 400 ? auditLogger.warn.bind(auditLogger) : auditLogger.info.bind(auditLogger);
        logMethod('HTTP request audit', logEntry);
        if (!isProduction) {
            console.log('AUDIT:', JSON.stringify(logEntry));
        }
        // In production, send to monitoring service
        // monitoringService.log('api_request', logEntry)
    });
    next();
};
exports.auditLog = auditLog;
// Validation rules for common inputs
exports.validationRules = {
    userId: (0, express_validator_1.param)('userId').isUUID().withMessage('Invalid user ID'),
    gameId: (0, express_validator_1.param)('gameId').isString().isLength({ min: 10, max: 50 }).withMessage('Invalid game ID'),
    register: [
        (0, express_validator_1.body)('name').isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
        (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Invalid email'),
        (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],
    login: [
        (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Invalid email'),
        (0, express_validator_1.body)('password').exists().withMessage('Password is required')
    ],
    gameMove: [
        (0, express_validator_1.body)('from').optional().isString().withMessage('Invalid from position'),
        (0, express_validator_1.body)('to').optional().isString().withMessage('Invalid to position'),
        (0, express_validator_1.body)('gnubgNotation').optional().isString().matches(/^[0-9bar]+\/[0-9off]+\*?$/).withMessage('Invalid GNUBG notation')
    ]
};
//# sourceMappingURL=security-middleware.js.map