/**
 * Gmail REST API — работает через fetch без SDK googleapis.
 * Управляет токенами: проверяет expiry, делает refresh при необходимости.
 */

export interface GmailTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
}

export interface EmailSnippet {
  id: string
  subject: string
  from: string
  date: string   // YYYY-MM-DD
  snippet: string
  body: string   // первые 800 символов текстового тела
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Обновить access_token если он протух */
export async function refreshIfNeeded(tokens: GmailTokens): Promise<GmailTokens> {
  const now = new Date()
  // Обновляем за 2 минуты до истечения
  if (tokens.expiresAt.getTime() - now.getTime() > 2 * 60 * 1000) {
    return tokens
  }

  if (!tokens.refreshToken) {
    throw new Error('Refresh token отсутствует — нужно переподключить Gmail')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Не удалось обновить токен Gmail (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json() as {
    access_token: string
    expires_in: number
    error?: string
  }

  if (data.error) throw new Error(`Gmail token refresh error: ${data.error}`)

  return {
    ...tokens,
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

/** Декодирует base64url в строку */
function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

/** Рекурсивно извлекает text/plain из MIME-дерева */
function extractTextFromParts(parts: GmailPart[] | undefined, depth = 0): string {
  if (!parts || depth > 4) return ''
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data)
    }
    if (part.parts) {
      const nested = extractTextFromParts(part.parts, depth + 1)
      if (nested) return nested
    }
  }
  return ''
}

interface GmailPart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
}

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessage {
  id: string
  snippet?: string
  payload?: {
    headers?: GmailHeader[]
    body?: { data?: string }
    parts?: GmailPart[]
    mimeType?: string
  }
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function parseDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** Список ID писем за указанный период */
export async function listMessageIds(
  accessToken: string,
  query: string,
  maxResults = 200,
): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })

  const res = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gmail API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json() as { messages?: Array<{ id: string }> }
  return (data.messages ?? []).map((m) => m.id)
}

/** Получить содержимое одного письма */
export async function getMessage(
  accessToken: string,
  id: string,
): Promise<EmailSnippet | null> {
  const res = await fetch(`${GMAIL_API}/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return null

  const msg = await res.json() as GmailMessage
  const headers = msg.payload?.headers ?? []

  const subject = getHeader(headers, 'Subject')
  const from = getHeader(headers, 'From')
  const dateStr = getHeader(headers, 'Date')

  // Извлекаем текстовое тело
  let body = ''
  if (msg.payload?.mimeType === 'text/plain' && msg.payload.body?.data) {
    body = decodeBase64Url(msg.payload.body.data)
  } else if (msg.payload?.parts) {
    body = extractTextFromParts(msg.payload.parts)
  }

  return {
    id,
    subject,
    from,
    date: parseDate(dateStr),
    snippet: msg.snippet ?? '',
    body: body.slice(0, 800),
  }
}

/** Получить батч писем параллельно (не более 20 одновременно) */
export async function fetchEmails(
  accessToken: string,
  ids: string[],
): Promise<EmailSnippet[]> {
  const BATCH = 20
  const results: EmailSnippet[] = []

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const fetched = await Promise.all(batch.map((id) => getMessage(accessToken, id)))
    results.push(...fetched.filter((m): m is EmailSnippet => m !== null))
  }

  return results
}
