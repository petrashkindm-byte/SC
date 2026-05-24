import { createHmac, timingSafeEqual } from 'crypto'

export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET not set')
  const ts = Date.now().toString()
  const sig = createHmac('sha256', secret).update(`${userId}:${ts}`).digest('hex')
  return Buffer.from(`${userId}.${ts}.${sig}`).toString('base64url')
}

// Returns userId if token is valid, null otherwise.
export function validateUnsubscribeToken(token: string): string | null {
  try {
    const secret = process.env.UNSUBSCRIBE_SECRET
    if (!secret) return null
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split('.')
    if (parts.length !== 3) return null
    const [userId, ts, sig] = parts
    if (!userId || !ts || !sig) return null
    const expectedSig = createHmac('sha256', secret).update(`${userId}:${ts}`).digest('hex')
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null
    return userId
  } catch {
    return null
  }
}
