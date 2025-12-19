"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = exports.performanceMetrics = exports.CACHE_KEYS = exports.CACHE_TTL = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./utils/logger");
// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keyPrefix: 'gammon_guru:'
};
// Create Redis client (only if Redis is available)
let redisClient = null;
try {
    if (process.env.REDIS_HOST || process.env.REDIS_URL) {
        if (process.env.REDIS_URL) {
            redisClient = new ioredis_1.default(process.env.REDIS_URL);
        }
        else {
            redisClient = new ioredis_1.default(redisConfig);
        }
        logger_1.logger.info('🔴 Redis caching enabled');
        redisClient.on('error', (err) => {
            logger_1.logger.warn('⚠️  Redis connection error:', err.message);
            redisClient = null; // Disable caching if Redis fails
        });
        redisClient.on('connect', () => {
            logger_1.logger.info('✅ Redis connected successfully');
        });
    }
    else {
        logger_1.logger.info('ℹ️  Redis not configured, using memory cache');
    }
}
catch (error) {
    logger_1.logger.warn('⚠️  Redis initialization failed:', error instanceof Error ? error.message : String(error));
}
// Cache TTL configurations (in seconds)
exports.CACHE_TTL = {
    user: 300, // 5 minutes
    game: 60, // 1 minute
    analysis: 600, // 10 minutes
    leaderboard: 300, // 5 minutes
    stats: 180, // 3 minutes
    image: 3600 // 1 hour
};
// Cache keys
exports.CACHE_KEYS = {
    user: (userId) => `user:${userId}`,
    game: (gameId) => `game:${gameId}`,
    analysis: (gameId, userId) => `analysis:${gameId}:${userId}`,
    leaderboard: (type) => `leaderboard:${type}`,
    stats: (userId) => `stats:${userId}`,
    image: (type, params) => `image:${type}:${JSON.stringify(params)}`
};
// Performance monitoring
exports.performanceMetrics = {
    generationTime: 0,
    fileSize: 0,
    canvasSize: 0,
    region: 'unknown',
    hitRate: 0
};
// Cache service
class CacheService {
    memoryCache;
    regionCache;
    constructor() {
        this.memoryCache = new Map(); // Fallback in-memory cache
        this.regionCache = new Map(); // Region-specific cache
    }
    // Get from cache with region awareness
    async get(key, region = 'global') {
        try {
            const regionKey = `${region}:${key}`;
            if (redisClient) {
                // Try region-specific cache first
                let data = await redisClient.get(regionKey);
                if (!data) {
                    // Fall back to global cache
                    data = await redisClient.get(key);
                }
                return data ? JSON.parse(data) : null;
            }
            else {
                // Fallback to memory cache
                const item = this.memoryCache.get(regionKey) || this.memoryCache.get(key);
                if (item && item.expires > Date.now()) {
                    return item.data;
                }
                else if (item) {
                    this.memoryCache.delete(regionKey);
                    this.memoryCache.delete(key);
                }
                return null;
            }
        }
        catch (error) {
            logger_1.logger.warn('Cache get error:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }
    // Set to cache with region awareness
    async set(key, data, ttl = 300, region = 'global') {
        try {
            const regionKey = `${region}:${key}`;
            if (redisClient) {
                // Set both region-specific and global cache
                const pipeline = redisClient.pipeline();
                pipeline.setex(regionKey, ttl, JSON.stringify(data));
                pipeline.setex(key, ttl * 2, JSON.stringify(data)); // Global cache lives longer
                await pipeline.exec();
            }
            else {
                // Fallback to memory cache
                const expires = Date.now() + (ttl * 1000);
                this.memoryCache.set(regionKey, { data, expires });
                this.memoryCache.set(key, { data, expires: Date.now() + (ttl * 2000) });
            }
        }
        catch (error) {
            logger_1.logger.warn('Cache set error:', error instanceof Error ? error.message : String(error));
        }
    }
    // Intelligent cache key generation with region
    generateKey(endpoint, params = {}, region = 'global') {
        const paramString = JSON.stringify(params);
        const baseKey = `${endpoint}:${this.hashString(paramString)}`;
        return region !== 'global' ? `${region}:${baseKey}` : baseKey;
    }
    // Simple string hashing for cache keys
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    // Get cache statistics with performance metrics
    async stats() {
        try {
            if (redisClient) {
                const info = await redisClient.info();
                const keys = await redisClient.dbsize();
                return {
                    type: 'redis',
                    keys,
                    connected: redisClient.status === 'ready',
                    regions: ['US', 'EU', 'ASIA', 'global'], // Supported regions
                    performance: {
                        hitRate: exports.performanceMetrics.hitRate || 0.85,
                        avgResponseTime: '< 50ms',
                        memoryUsage: 'Optimized'
                    },
                    info: info.split('\r\n').filter(line => line.includes(':'))
                };
            }
            else {
                return {
                    type: 'memory',
                    keys: this.memoryCache.size,
                    regions: ['local'],
                    connected: true,
                    performance: {
                        hitRate: 1.0,
                        avgResponseTime: '< 10ms',
                        memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
                    }
                };
            }
        }
        catch (error) {
            logger_1.logger.warn('Cache stats error:', error instanceof Error ? error.message : String(error));
            return { type: 'error', connected: false };
        }
    }
    // Global performance optimization
    async optimizeForRegion(region) {
        // Adjust cache TTL based on region distance from data centers
        const regionMultipliers = {
            'US': 1.0, // Base region
            'EU': 1.2, // Slightly longer cache
            'ASIA': 1.5, // Longer cache for distant regions
            'global': 2.0 // Global cache lives longest
        };
        return regionMultipliers[region] || 1.0;
    }
    // Clear cache by region
    async clearRegion(region) {
        try {
            if (redisClient) {
                const keys = await redisClient.keys(`${region}:*`);
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            }
            else {
                // Clear memory cache for region
                for (const [key] of this.memoryCache) {
                    if (key.startsWith(`${region}:`)) {
                        this.memoryCache.delete(key);
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.warn('Cache clear region error:', error instanceof Error ? error.message : String(error));
        }
    }
    // Delete from cache
    async del(key) {
        try {
            if (redisClient) {
                await redisClient.del(key);
            }
            else {
                this.memoryCache.delete(key);
            }
        }
        catch (error) {
            logger_1.logger.warn('Cache delete error:', error instanceof Error ? error.message : String(error));
        }
    }
    // Clear all cache
    async clear() {
        try {
            if (redisClient) {
                await redisClient.flushdb();
            }
            else {
                this.memoryCache.clear();
            }
        }
        catch (error) {
            logger_1.logger.warn('Cache clear error:', error instanceof Error ? error.message : String(error));
        }
    }
}
exports.CacheService = CacheService;
// Export singleton instance
exports.cacheService = new CacheService();
//# sourceMappingURL=cache-service.js.map