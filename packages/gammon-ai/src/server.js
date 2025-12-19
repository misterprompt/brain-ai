"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const validateEnv_1 = require("./utils/validateEnv");
const loggerMiddleware_1 = require("./middleware/loggerMiddleware");
const requestId_1 = require("./middleware/requestId");
const rateLimiter_1 = require("./middleware/rateLimiter");
const registry_1 = require("./metrics/registry");
const ddos_1 = require("./middleware/ddos");
const metrics_1 = require("./middleware/metrics");
const prismaMock_1 = require("./lib/prismaMock");
const security_middleware_1 = require("./security-middleware");
// Import routes
const players_1 = __importDefault(require("./routes/players"));
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const games_1 = __importDefault(require("./routes/games"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const leaderboards_1 = __importDefault(require("./routes/leaderboards"));
const gnubg_1 = __importDefault(require("./routes/gnubg"));
const gnubgDebug_1 = __importDefault(require("./routes/gnubgDebug"));
const admin_1 = __importDefault(require("./routes/admin"));
const server_1 = require("./websocket/server");
const gameSessionRegistry_1 = require("./services/gameSessionRegistry");
// --- Environment Validation ---
const hasPgSplitConfig = Boolean(process.env.PGHOST);
const secretKeys = ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const isProductionEnv = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const isMockDb = process.env.MOCK_DB === 'true' || (!hasDatabaseUrl && config_1.config.nodeEnv === 'development');
if (isMockDb) {
    if (!process.env.ACCESS_TOKEN_SECRET)
        process.env.ACCESS_TOKEN_SECRET = 'mock-access-secret';
    if (!process.env.REFRESH_TOKEN_SECRET)
        process.env.REFRESH_TOKEN_SECRET = 'mock-refresh-secret';
    logger_1.logger.info('⚠️  Using Mock Secrets for Development');
}
if (!hasDatabaseUrl && !hasPgSplitConfig && !isMockDb) {
    logger_1.logger.error('[startup] Critical configuration: either DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT must be set.');
    process.exit(1);
}
if (isProductionEnv && !process.env.PORT) {
    logger_1.logger.error('[startup] Critical configuration: PORT is required in production.');
    process.exit(1);
}
if (hasPgSplitConfig) {
    (0, validateEnv_1.validateEnv)(secretKeys);
    (0, validateEnv_1.validateEnv)(undefined, { allowMissingDatabase: true });
}
else {
    if (!isMockDb) {
        (0, validateEnv_1.validateEnv)(['DATABASE_URL', ...secretKeys]);
    }
    else {
        (0, validateEnv_1.validateEnv)(secretKeys);
    }
}
if (!process.env.DATABASE_URL && hasPgSplitConfig) {
    const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
    if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE && PGPORT) {
        const encodedPassword = encodeURIComponent(PGPASSWORD);
        process.env.DATABASE_URL = `postgresql://${PGUSER}:${encodedPassword}@${PGHOST}:${PGPORT}/${PGDATABASE}?schema=public`;
    }
}
// --- Database Initialization ---
let prismaClient;
if (isMockDb) {
    prismaClient = (0, prismaMock_1.createPrismaMock)();
}
else {
    prismaClient = new client_1.PrismaClient({
        log: config_1.config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
}
exports.prisma = prismaClient;
// --- Express App Initialization ---
const app = (0, express_1.default)();
// Internal health endpoint (Docker/Ops)
app.get('/health/internal', async (_req, res) => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ app: 'ok', db: 'up' });
    }
    catch (error) {
        logger_1.logger.error('Internal health check failed', error);
        res.status(500).json({ app: 'ok', db: 'down' });
    }
});
// --- Middleware Pipeline ---
app.use(express_1.default.json({ limit: security_middleware_1.requestSizeLimits.json }));
app.use(express_1.default.urlencoded({ extended: true, limit: security_middleware_1.requestSizeLimits.urlencoded }));
app.use(security_middleware_1.compressionConfig);
app.use(security_middleware_1.securityHeaders);
// HPP Protection
const hpp = require('hpp');
app.use(hpp());
app.use(security_middleware_1.sanitizeInput);
app.use(security_middleware_1.auditLog);
app.use((0, security_middleware_1.requestTimeout)(30000));
app.use(ddos_1.ddosProtection);
app.use(security_middleware_1.speedLimit);
// CORS
const allowedOrigins = new Set(config_1.config.cors.origins);
const exposedHeaders = config_1.config.cors.exposedHeaders.split(',').map(header => header.trim());
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.has(origin))
            return callback(null, true);
        if (/^https:\/\/.*\.netlify\.app$/i.test(origin) || /^https:\/\/.*\.onrender\.com$/i.test(origin)) {
            return callback(null, true);
        }
        logger_1.logger.warn(`Blocked CORS origin: ${origin}`);
        return callback(new Error('CORS origin not allowed'));
    },
    credentials: config_1.config.cors.allowCredentials,
    methods: config_1.config.cors.allowMethods,
    allowedHeaders: config_1.config.cors.allowHeaders,
    exposedHeaders,
    maxAge: config_1.config.cors.maxAge,
    optionsSuccessStatus: 204
};
app.use('/health', (req, res, next) => next()); // Skip CORS for health check
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// Rate Limiting
app.use('/health', (req, res, next) => next()); // Skip Rate Limit for health check
app.use('/api/auth', (0, rateLimiter_1.createRateLimiter)('auth'));
// AI Rate Limiter: 10 req/sec per IP
const aiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1000, // 1 second
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests, please slow down.' }
});
// Custom Middleware
app.use(requestId_1.requestIdMiddleware);
app.use(loggerMiddleware_1.loggerMiddleware);
app.use(metrics_1.metricsMiddleware);
// --- Routes ---
app.use('/api/players', players_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
app.use('/api/games', games_1.default);
app.use('/api/tournaments', tournaments_1.default);
app.use('/api/leaderboards', leaderboards_1.default);
app.use('/api/gnubg', aiRateLimiter, gnubg_1.default);
app.use('/api/gnubg-debug', gnubgDebug_1.default);
app.use('/api/admin', admin_1.default);
// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        const metrics = await registry_1.metricsRegistry.metrics();
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
    }
    catch (error) {
        logger_1.logger.error('Failed to collect Prometheus metrics', error);
        res.status(500).json({ status: 'error', message: 'Failed to collect metrics' });
    }
});
// Health Check Endpoint
app.get('/health', async (req, res) => {
    try {
        const userCount = await exports.prisma.users.count();
        const gameCount = await exports.prisma.games.count();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        const wsStats = require('./websocket/server').getWebSocketStats?.() || {};
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.round(uptime),
            database: {
                connected: true,
                users: userCount,
                games: gameCount,
                mode: isMockDb ? 'mock' : 'postgres'
            },
            websocket: wsStats,
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
            },
            environment: config_1.config.nodeEnv
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});
// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'GammonGuru API - Enterprise Security Enabled',
        version: '1.0.0',
        security: 'Enterprise-grade protection active'
    });
});
// Error Handling Middleware
app.use((error, req, res, _next) => {
    const sanitizedError = {
        error: 'Internal server error',
        message: config_1.config.nodeEnv === 'development' && error instanceof Error ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    };
    const errorDetails = error instanceof Error ? {
        errorMessage: error.message,
        errorStack: error.stack
    } : { errorMessage: 'Unknown error' };
    logger_1.logger.error('Application Error Details:', {
        ...errorDetails,
        requestMethod: req.method,
        requestUrl: req.url,
        requestIp: req.ip,
        requestUserId: req.user?.id || 'anonymous'
    });
    if (!res.headersSent) {
        res.status(500).json(sanitizedError);
    }
});
// --- Server Startup ---
let server = null;
if (config_1.config.nodeEnv !== 'test') {
    server = app.listen(config_1.config.port, () => {
        logger_1.logger.info(`Server listening on :${config_1.config.port}`);
        logger_1.logger.info(`🛡️  ENTERPRISE-GRADE GammonGuru API running on port ${config_1.config.port}`);
        (0, server_1.initWebSocketServer)(server);
        logger_1.logger.info('🕸️  WebSocket Server initialized');
        gameSessionRegistry_1.GameSessionRegistryScheduler.start(config_1.config.session.cleanupIntervalMs);
        logger_1.logger.info('🧹 GameSessionRegistry cleanup scheduler started');
    });
    server.on('error', (error) => {
        logger_1.logger.error('🚨 HTTP server error', error);
    });
}
// --- Graceful Shutdown ---
const shutdown = async (signal) => {
    logger_1.logger.info(`🛡️ ${signal} received, secure shutdown initiated`);
    gameSessionRegistry_1.GameSessionRegistryScheduler.stop();
    if (server) {
        server.close(async () => {
            logger_1.logger.info('🔒 HTTP server closed securely');
            await exports.prisma.$disconnect();
            logger_1.logger.info('🗄️  Database connection closed');
            process.exit(0);
        });
    }
    else {
        await exports.prisma.$disconnect();
        logger_1.logger.info('🗄️  Database connection closed');
        process.exit(0);
    }
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
exports.default = app;
//# sourceMappingURL=server.js.map