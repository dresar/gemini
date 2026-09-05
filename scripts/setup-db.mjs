import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

async function setup() {
  console.log('🔧 Membuat tabel database...')

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL UNIQUE,
      label TEXT,
      status VARCHAR(20) DEFAULT 'active',
      usage_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
      event VARCHAR(20) NOT NULL,
      detail TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_logs_key_id ON logs(key_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status)`

  console.log('✅ Database setup selesai!')
}

setup().catch((err) => {
  console.error('❌ Setup gagal:', err.message)
  process.exit(1)
})
