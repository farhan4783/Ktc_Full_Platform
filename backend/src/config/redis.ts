import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis connection error:', err.message);
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function getCache(key: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (err: any) {
    logger.error(`Error getting cache for key ${key}:`, err.message);
    return null;
  }
}

export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  try {
    const client = getRedisClient();
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
  } catch (err: any) {
    logger.error(`Error setting cache for key ${key}:`, err.message);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (err: any) {
    logger.error(`Error deleting cache for key ${key}:`, err.message);
  }
}

export default getRedisClient;
