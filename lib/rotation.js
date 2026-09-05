import { getRedis } from './redis'
import { getDb } from './db'

const ACTIVE_KEY = 'gemini:keys:active'
const COOLDOWN_KEY = 'gemini:keys:cooldown'

export async function getAvailableKey() {
  const redis = getRedis()
  const now = Date.now()

  const expired = await redis.zrangebyscore(COOLDOWN_KEY, 0, now)

  if (expired && expired.length > 0) {
    const pipeline = redis.pipeline()
    for (const key of expired) {
      pipeline.zrem(COOLDOWN_KEY, key)
      pipeline.zadd(ACTIVE_KEY, { score: 0, member: key })
    }
    await pipeline.exec()
  }

  const keys = await redis.zrange(ACTIVE_KEY, 0, 0)

  if (!keys || keys.length === 0) {
    return null
  }

  const selectedKey = keys[0]
  await redis.zadd(ACTIVE_KEY, { score: now, member: selectedKey })

  return selectedKey
}

export async function markKeySuccess(apiKey) {
  const redis = getRedis()
  const sql = getDb()
  const now = Date.now()

  await redis.zadd(ACTIVE_KEY, { score: now, member: apiKey })

  await sql`
    UPDATE api_keys
    SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE key = ${apiKey}
  `
}

export async function markKeyCooldown(apiKey, durationMs) {
  const redis = getRedis()
  const sql = getDb()
  const cooldownUntil = Date.now() + durationMs

  const pipeline = redis.pipeline()
  pipeline.zrem(ACTIVE_KEY, apiKey)
  pipeline.zadd(COOLDOWN_KEY, { score: cooldownUntil, member: apiKey })
  await pipeline.exec()

  await sql`
    UPDATE api_keys
    SET error_count = error_count + 1
    WHERE key = ${apiKey}
  `
}

export async function logEvent(apiKey, event, detail = null) {
  const sql = getDb()
  await sql`
    INSERT INTO logs (key_id, event, detail)
    SELECT id, ${event}, ${detail}
    FROM api_keys
    WHERE key = ${apiKey}
  `
}

export async function addKeyToRedis(apiKey) {
  const redis = getRedis()
  await redis.zadd(ACTIVE_KEY, { score: 0, member: apiKey })
}

export async function removeKeyFromRedis(apiKey) {
  const redis = getRedis()
  const pipeline = redis.pipeline()
  pipeline.zrem(ACTIVE_KEY, apiKey)
  pipeline.zrem(COOLDOWN_KEY, apiKey)
  await pipeline.exec()
}

export async function getRedisStatus() {
  const redis = getRedis()
  const [activeCount, cooldownCount] = await Promise.all([
    redis.zcard(ACTIVE_KEY),
    redis.zcard(COOLDOWN_KEY),
  ])
  return { activeCount, cooldownCount }
}
