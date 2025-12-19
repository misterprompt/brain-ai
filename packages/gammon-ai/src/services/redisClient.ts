import Redis, { Redis as RedisClient, RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

let client: RedisClient | null = null;
let hasWarnedMissingConfig = false;
let hasLoggedConnect = false;

function createRedisClient(): RedisClient | null {
  const url = process.env.SESSION_REDIS_URL ?? process.env.REDIS_URL;
  const host = process.env.SESSION_REDIS_HOST ?? process.env.REDIS_HOST;

  if (!url && !host) {
    if (!hasWarnedMissingConfig) {
      logger.warn('Redis read-through disabled: no SESSION_REDIS_URL/REDIS_URL or SESSION_REDIS_HOST provided');
      hasWarnedMissingConfig = true;
    }
    return null;
  }

  if (url) {
    return new Redis(url);
  }

  const options: RedisOptions = {
    host: host as string,
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

  return new Redis(options);

}

function attachListeners(redis: RedisClient) {
  redis.on('connect', () => {
    if (!hasLoggedConnect) {
      logger.info('Redis client connected for GameSessionRegistry read-through cache');
      hasLoggedConnect = true;
    }
  });

  redis.on('error', (error) => {
    logger.error('Redis client error', {
      context: 'GameSessionRegistryRedis',
      message: error.message
    });
  });

  redis.on('end', () => {
    logger.info('Redis client connection closed for GameSessionRegistry read-through cache');
  });
}

export function getRedisClient(): RedisClient | null {
  if (client) {
    return client;
  }

  client = createRedisClient();
  if (client) {
    attachListeners(client);
  }
  return client;
}

export async function closeRedisClient(): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    logger.warn('Failed to quit Redis client cleanly', {
      context: 'GameSessionRegistryRedis',
      message: error instanceof Error ? error.message : String(error)
    });
  } finally {
    client = null;
  }
}
