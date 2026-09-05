import { handle } from 'hono/vercel'
import app from '@/lib/hono-app'

export const runtime = 'edge'

const handler = handle(app)

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
