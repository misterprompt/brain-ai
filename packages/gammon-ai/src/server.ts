// src/server.ts
import { requestIdMiddleware } from './middleware/requestId';
import { createRateLimiter } from './middleware/rateLimiter';
import { metricsRegistry } from './metrics/registry';
import { ddosProtection } from './middleware/ddos';
import { metricsMiddleware } from './middleware/metrics';
import { createPrismaMock } from './lib/prismaMock';
import {
  speedLimit,
  sanitizeInput,
  requestSizeLimits,
  securityHeaders,
  compressionConfig,
  requestTimeout,
  auditLog
} from './security-middleware';

// Import routes
import playersRouter from './routes/players';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import gamesRouter from './routes/games';
import tournamentsRouter from './routes/tournaments';
import leaderboardsRouter from './routes/leaderboards';
import gnubgRouter from './routes/gnubg';
import gnubgDebugRouter from './routes/gnubgDebug';
import adminRouter from './routes/admin';
import { initWebSocketServer } from './websocket/server';
import { GameSessionRegistryScheduler } from './services/gameSessionRegistry';
import { cacheService } from './cache-service';

// --- Environment Validation ---
const hasPgSplitConfig = Boolean(process.env.PGHOST);
const secretKeys: string[] = ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const isProductionEnv = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const isMockDb = process.env.MOCK_DB === 'true' || (!hasDatabaseUrl && config.nodeEnv === 'development');

if (isMockDb) {
  if (!process.env.ACCESS_TOKEN_SECRET) process.env.ACCESS_TOKEN_SECRET = 'mock-access-secret';
  if (!process.env.REFRESH_TOKEN_SECRET) process.env.REFRESH_TOKEN_SECRET = 'mock-refresh-secret';
  logger.info('⚠️  Using Mock Secrets for Development');
}

if (!hasDatabaseUrl && !hasPgSplitConfig && !isMockDb) {
  logger.error('[startup] Critical configuration: either DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT must be set.');
  process.exit(1);
}

if (isProductionEnv && !process.env.PORT) {
  logger.error('[startup] Critical configuration: PORT is required in production.');
  process.exit(1);
}

if (hasPgSplitConfig) {
  validateEnv(secretKeys);
  validateEnv(undefined, { allowMissingDatabase: true });
} else {
  if (!isMockDb) {
    validateEnv(['DATABASE_URL', ...secretKeys]);
  } else {
    validateEnv(secretKeys);
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
let prismaClient: PrismaClient;

if (isMockDb) {
  prismaClient = createPrismaMock();
} else {
  prismaClient = new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
}

export const prisma = prismaClient;

// --- Express App Initialization ---
const app = express();

// Internal health endpoint (Docker/Ops)
app.get('/health/internal', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ app: 'ok', db: 'up' });
  } catch (error) {
    logger.error('Internal health check failed', error);
    res.status(500).json({ app: 'ok', db: 'down' });
  }
});

// --- Middleware Pipeline ---
app.use(express.json({ limit: requestSizeLimits.json }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimits.urlencoded }));
app.use(compressionConfig);
app.use(securityHeaders);

// HPP Protection
const hpp = require('hpp');
app.use(hpp());

app.use(sanitizeInput);
app.use(auditLog);
app.use(requestTimeout(30000));
app.use(ddosProtection);
app.use(speedLimit);

// CORS
const allowedOrigins = new Set(config.cors.origins);
const exposedHeaders = config.cors.exposedHeaders.split(',').map(header => header.trim());

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (/^https:\/\/.*\.netlify\.app$/i.test(origin) || /^https:\/\/.*\.onrender\.com$/i.test(origin)) {
      return callback(null, true);
    }
    logger.warn(`Blocked CORS origin: ${origin}`);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: config.cors.allowCredentials,
  methods: config.cors.allowMethods,
  allowedHeaders: config.cors.allowHeaders,
  exposedHeaders,
  maxAge: config.cors.maxAge,
  optionsSuccessStatus: 204
};

app.use('/health', (req, res, next) => next()); // Skip CORS for health check
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate Limiting
app.use('/health', (req, res, next) => next()); // Skip Rate Limit for health check
app.use('/api/auth', createRateLimiter('auth'));

// AI Rate Limiter: 10 req/sec per IP
const aiRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please slow down.' }
});

// Custom Middleware
app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(metricsMiddleware);

// --- Routes ---
app.use('/api/players', playersRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/games', gamesRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/leaderboards', leaderboardsRouter);
app.use('/api/gnubg', aiRateLimiter, gnubgRouter);
app.use('/api/gnubg-debug', gnubgDebugRouter);
app.use('/api/admin', adminRouter);

// Metrics Endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsRegistry.metrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to collect Prometheus metrics', error);
    res.status(500).json({ status: 'error', message: 'Failed to collect metrics' });
  }
});

// Health Check Endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.users.count();
    const gameCount = await prisma.games.count();
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
      environment: config.nodeEnv
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Root Endpoint
// Serve Frontend
import path from 'path';
const publicPath = path.join(__dirname, '../public');

// API Root Info (keep for debugging, but not on root /)
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'GammonGuru API',
    version: '1.0.0',
    status: 'online'
  });
});

// Static files
app.use(express.static(publicPath));

// SPA fallback for non-API routes
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error Handling Middleware
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const sanitizedError = {
    error: 'Internal server error',
    message: config.nodeEnv === 'development' && error instanceof Error ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  };

  const errorDetails = error instanceof Error ? {
    errorMessage: error.message,
    errorStack: error.stack
  } : { errorMessage: 'Unknown error' };

  logger.error('Application Error Details:', {
    ...errorDetails,
    requestMethod: req.method,
    requestUrl: req.url,
    requestIp: req.ip,
    requestUserId: (req as { user?: { id?: string } }).user?.id || 'anonymous'
  });

  if (!res.headersSent) {
    res.status(500).json(sanitizedError);
  }
});

// --- Server Startup ---
let server: Server | null = null;

if (config.nodeEnv !== 'test') {
  server = app.listen(config.port, () => {
    logger.info(`Server listening on :${config.port}`);
    logger.info(`🛡️  ENTERPRISE-GRADE GammonGuru API running on port ${config.port}`);

    initWebSocketServer(server as Server);
    logger.info('🕸️  WebSocket Server initialized');

    GameSessionRegistryScheduler.start(config.session.cleanupIntervalMs);
    logger.info('🧹 GameSessionRegistry cleanup scheduler started');
  });

  server.on('error', (error) => {
    logger.error('🚨 HTTP server error', error);
  });
}

// --- Graceful Shutdown ---
const shutdown = async (signal: string) => {
  logger.info(`🛡️ ${signal} received, secure shutdown initiated`);
  GameSessionRegistryScheduler.stop();

  if (server) {
    server.close(async () => {
      logger.info('🔒 HTTP server closed securely');
      await prisma.$disconnect();
      logger.info('🗄️  Database connection closed');
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    logger.info('🗄️  Database connection closed');
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;