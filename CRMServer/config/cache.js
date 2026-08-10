const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis;

function getRedis() {
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
        });

        redis.on('connect', () => logger.info('Redis connected'));
        redis.on('error', (err) => {
            // Non-fatal: cache miss is acceptable if Redis is unavailable
            logger.warn(`Redis error (cache disabled): ${err.message}`);
        });
    }
    return redis;
}

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS, 10);

/**
 * Wrap an async resolver with Redis cache.
 * @param {string} key      - Cache key
 * @param {Function} fn     - Async function that returns the data to cache
 * @param {number} [ttl]    - TTL in seconds (default: CACHE_TTL_SECONDS)
 */
async function withCache(key, fn, ttl = DEFAULT_TTL) {
    const r = getRedis();
    try {
        const cached = await r.get(key);
        if (cached) {
            logger.debug(`Cache HIT: ${key}`);
            return JSON.parse(cached);
        }
    } catch (_) { /* Redis unavailable – fall through */ }

    const data = await fn();

    try {
        await r.set(key, JSON.stringify(data), 'EX', ttl);
        logger.debug(`Cache SET: ${key} (TTL ${ttl}s)`);
    } catch (_) { /* Redis unavailable – ignore */ }

    return data;
}

/**
 * Invalidate all keys matching a pattern (uses SCAN to avoid blocking).
 */
async function invalidatePattern(pattern) {
    const r = getRedis();
    try {
        let cursor = '0';
        do {
            const [next, keys] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = next;
            if (keys.length) await r.del(...keys);
        } while (cursor !== '0');
    } catch (_) { /* ignore */ }
}

module.exports = { getRedis, withCache, invalidatePattern };
