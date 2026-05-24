import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function makeRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = makeRedis()

// 20 req / 60 s — chat, analyze, what-if, daily-tip
const aiLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:ai' })
  : null

// 5 req / 60 s — scan/file (PDF+AI, most expensive endpoint)
const scanLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s'), prefix: 'rl:scan' })
  : null

type LimitResult = { limited: boolean; retryAfter: number }

export async function checkAiLimit(userId: string): Promise<LimitResult> {
  if (!aiLimiter) return { limited: false, retryAfter: 0 }
  const { success, reset } = await aiLimiter.limit(userId)
  return { limited: !success, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) }
}

export async function checkScanLimit(userId: string): Promise<LimitResult> {
  if (!scanLimiter) return { limited: false, retryAfter: 0 }
  const { success, reset } = await scanLimiter.limit(userId)
  return { limited: !success, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) }
}
