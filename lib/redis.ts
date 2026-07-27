import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: Redis | null = null;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // Stop retrying quickly if offline
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on("error", () => {
    // Silent error fallback when Redis is offline in local standalone dev mode
  });
} catch {
  redisClient = null;
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  try {
    if (redisClient.status === "wait") {
      await redisClient.connect().catch(() => {});
    }
    if (redisClient.status !== "ready") return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  if (!redisClient) return;
  try {
    if (redisClient.status === "wait") {
      await redisClient.connect().catch(() => {});
    }
    if (redisClient.status !== "ready") return;
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Fallback gracefully on cache set failure
  }
}

export async function clearCache(pattern = "*"): Promise<void> {
  if (!redisClient) return;
  try {
    if (redisClient.status === "wait") {
      await redisClient.connect().catch(() => {});
    }
    if (redisClient.status !== "ready") return;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch {
    // Fallback gracefully
  }
}

export { redisClient };
