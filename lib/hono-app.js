import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getDb } from './db'
import { getRedis } from './redis'
import {
  getAvailableKey,
  markKeySuccess,
  markKeyCooldown,
  logEvent,
  addKeyToRedis,
  removeKeyFromRedis,
  getRedisStatus,
} from './rotation'

const app = new Hono().basePath('/api')

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

function maskKey(key) {
  if (!key || key.length < 12) return '••••••••'
  return key.slice(0, 8) + '••••' + key.slice(-4)
}

// ─── POST /api/generate ───
app.post('/generate', async (c) => {
  const body = await c.req.json()
  const { prompt, model = 'gemini-pro' } = body

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return c.json({ error: 'Prompt diperlukan' }, 400)
  }

  const maxRetries = 3
  let lastError = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = await getAvailableKey()

    if (!apiKey) {
      return c.json({ error: 'Tidak ada API key tersedia' }, 503)
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt.trim() }] }],
          }),
          signal: controller.signal,
        }
      )

      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        await Promise.all([
          markKeySuccess(apiKey),
          logEvent(apiKey, 'success'),
        ])
        return c.json({ success: true, data, meta: { attempt: attempt + 1, model } })
      }

      if (response.status === 429) {
        const cooldownMs = 60000 + Math.random() * 60000
        await Promise.all([
          markKeyCooldown(apiKey, cooldownMs),
          logEvent(apiKey, 'cooldown', 'Rate limit 429'),
        ])
        lastError = 'Rate limited (429)'
        continue
      }

      if (response.status === 403) {
        await Promise.all([
          markKeyCooldown(apiKey, 300000),
          logEvent(apiKey, 'error', 'Forbidden 403'),
        ])
        lastError = 'Forbidden (403)'
        continue
      }

      const errorText = await response.text()
      await Promise.all([
        markKeyCooldown(apiKey, 60000),
        logEvent(apiKey, 'error', `HTTP ${response.status}`),
      ])
      lastError = `HTTP ${response.status}: ${errorText.slice(0, 200)}`
    } catch (err) {
      if (err.name === 'AbortError') {
        await Promise.all([
          markKeyCooldown(apiKey, 60000),
          logEvent(apiKey, 'error', 'Timeout'),
        ])
        lastError = 'Timeout'
        continue
      }
      lastError = err.message
    }
  }

  return c.json({ error: 'Semua percobaan gagal', detail: lastError }, 503)
})

// ─── POST /api/keys/import ───
app.post('/keys/import', async (c) => {
  const sql = getDb()
  const body = await c.req.json()
  const { keys } = body

  if (!keys || typeof keys !== 'string') {
    return c.json({ error: 'Format: { "keys": "key1\\nkey2\\nkey3" }' }, 400)
  }

  const keyList = keys.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 0)

  if (keyList.length === 0) {
    return c.json({ error: 'Tidak ada key valid' }, 400)
  }

  let imported = 0
  let duplicates = 0

  for (const key of keyList) {
    try {
      const result = await sql`
        INSERT INTO api_keys (key, status)
        VALUES (${key}, 'active')
        ON CONFLICT (key) DO NOTHING
        RETURNING id
      `
      if (result.length > 0) {
        await addKeyToRedis(key)
        imported++
      } else {
        duplicates++
      }
    } catch {
      duplicates++
    }
  }

  return c.json({ success: true, imported, duplicates, total: keyList.length })
})

// ─── GET /api/keys ───
app.get('/keys', async (c) => {
  const sql = getDb()
  const redis = getRedis()

  const [dbKeys, activeKeys, cooldownKeys] = await Promise.all([
    sql`SELECT id, key, status, usage_count, error_count, last_used_at, created_at FROM api_keys ORDER BY created_at DESC`,
    redis.zrange('gemini:keys:active', 0, -1),
    redis.zrange('gemini:keys:cooldown', 0, -1),
  ])

  const activeSet = new Set(activeKeys || [])
  const cooldownSet = new Set(cooldownKeys || [])

  const result = dbKeys.map((k) => ({
    id: k.id,
    key_masked: maskKey(k.key),
    db_status: k.status,
    redis_status: activeSet.has(k.key) ? 'active' : cooldownSet.has(k.key) ? 'cooldown' : 'inactive',
    usage_count: k.usage_count,
    error_count: k.error_count,
    last_used_at: k.last_used_at,
    created_at: k.created_at,
  }))

  return c.json({ keys: result })
})

// ─── DELETE /api/keys/:id ───
app.delete('/keys/:id', async (c) => {
  const sql = getDb()
  const id = c.req.param('id')

  const rows = await sql`SELECT key FROM api_keys WHERE id = ${id}`
  if (rows.length === 0) {
    return c.json({ error: 'Key tidak ditemukan' }, 404)
  }

  await removeKeyFromRedis(rows[0].key)
  await sql`DELETE FROM api_keys WHERE id = ${id}`

  return c.json({ success: true })
})

// ─── PATCH /api/keys/:id/toggle ───
app.patch('/keys/:id/toggle', async (c) => {
  const sql = getDb()
  const id = c.req.param('id')

  const rows = await sql`SELECT key, status FROM api_keys WHERE id = ${id}`
  if (rows.length === 0) {
    return c.json({ error: 'Key tidak ditemukan' }, 404)
  }

  const newStatus = rows[0].status === 'active' ? 'disabled' : 'active'
  await sql`UPDATE api_keys SET status = ${newStatus} WHERE id = ${id}`

  if (newStatus === 'disabled') {
    await removeKeyFromRedis(rows[0].key)
  } else {
    await addKeyToRedis(rows[0].key)
  }

  return c.json({ success: true, status: newStatus })
})

// ─── GET /api/stats ───
app.get('/stats', async (c) => {
  const sql = getDb()
  const redisStatus = await getRedisStatus()

  const [totalKeys, totalLogs, successLogs, errorLogs, recentLogs] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM api_keys`,
    sql`SELECT COUNT(*)::int AS count FROM logs`,
    sql`SELECT COUNT(*)::int AS count FROM logs WHERE event = 'success'`,
    sql`SELECT COUNT(*)::int AS count FROM logs WHERE event = 'error'`,
    sql`
      SELECT l.id, l.event, l.detail, l.created_at, k.key
      FROM logs l
      LEFT JOIN api_keys k ON l.key_id = k.id
      ORDER BY l.created_at DESC
      LIMIT 30
    `,
  ])

  const total = totalLogs[0]?.count || 0
  const success = successLogs[0]?.count || 0
  const errors = errorLogs[0]?.count || 0
  const successRate = total > 0 ? Math.round((success / total) * 10000) / 100 : 0

  return c.json({
    total_keys: totalKeys[0]?.count || 0,
    active_keys: redisStatus.activeCount,
    cooldown_keys: redisStatus.cooldownCount,
    total_requests: total,
    success_count: success,
    error_count: errors,
    success_rate: successRate,
    recent_logs: (recentLogs || []).map((l) => ({
      id: l.id,
      event: l.event,
      detail: l.detail,
      key_masked: maskKey(l.key),
      created_at: l.created_at,
    })),
  })
})

// ─── Health Check ───
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

export default app
