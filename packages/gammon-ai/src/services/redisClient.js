"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
let client = null;
let hasWarnedMissingConfig = false;
let hasLoggedConnect = false;
function createRedisClient() {
    const url = process.env.SESSION_REDIS_URL ?? process.env.REDIS_URL;
    const host = process.env.SESSION_REDIS_HOST ?? process.env.REDIS_HOST;
    if (!url && !host) {
        if (!hasWarnedMissingConfig) {
            logger_1.logger.warn('Redis read-through disabled: no SESSION_REDIS_URL/REDIS_URL or SESSION_REDIS_HOST provided');
            hasWarnedMissingConfig = true;
        }
        return null;
    }
    if (url) {
        return new ioredis_1.default(url);
    }
    const options = {
        host: host,
        port: Number(process.env.SESSION_REDIS_PORT ?? process.env.REDIS_PORT ?? 6379),
        enableReadyCheck: false
    };
    const password = process.env.SESSION_REDIS_PASSWORD ?? process.env.REDIS_PASSWORD;
    if (typeof password === 'string' && password.length > 0) {
        options.password = password;
    }
    const dbValue = process.env.SESSION_REDIS_DB ?? process.env.REDIS_DB;
    if (typeof dbValue !== 'undefined') {
        const parsed = Number(dbValue);
        if (Number.isFinite(parsed)) {
            options.db = parsed;
        }
    }
    return new ioredis_1.default(options);
}
function attachListeners(redis) {
    redis.on('connect', () => {
        if (!hasLoggedConnect) {
            logger_1.logger.info('Redis client connected for GameSessionRegistry read-through cache');
            hasLoggedConnect = true;
        }
    });
    redis.on('error', (error) => {
        logger_1.logger.error('Redis client error', {
            context: 'GameSessionRegistryRedis',
            message: error.message
        });
    });
    redis.on('end', () => {
        logger_1.logger.info('Redis client connection closed for GameSessionRegistry read-through cache');
    });
}
function getRedisClient() {
    if (client) {
        return client;
    }
    client = createRedisClient();
    if (client) {
        attachListeners(client);
    }
    return client;
}
async function closeRedisClient() {
    if (!client) {
        return;
    }
    try {
        await client.quit();
    }
    catch (error) {
        logger_1.logger.warn('Failed to quit Redis client cleanly', {
            context: 'GameSessionRegistryRedis',
            message: error instanceof Error ? error.message : String(error)
        });
    }
    finally {
        client = null;
    }
}
//# sourceMappingURL=redisClient.js.map