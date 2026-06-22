// Shared safe-URL gate for external subscription links, used on BOTH the write
// path (actions.ts) and the read/render path (detail page, payments table) so
// that unsafe values already stored in the DB are never rendered as clickable
// links. Mirrors the mobile rule (mobile lib/url.ts):
//   • https://…                         → allowed
//   • http://localhost | 127.0.0.1      → allowed only when NODE_ENV !== 'production'
//   • any other http://                 → null
//   • javascript:/data:/file:/intent:/ftp:/other schemes, empty, malformed → null
// A bare string without a protocol is rejected (we do not guess/add https://).
export function getSafeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return null
  }

  if (u.protocol === 'https:') return trimmed
  if (
    u.protocol === 'http:' &&
    process.env.NODE_ENV !== 'production' &&
    (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  ) {
    return trimmed
  }
  return null
}
