import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSafeExternalUrl } from './safe-url'

describe('getSafeExternalUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null for empty / null / undefined', () => {
    expect(getSafeExternalUrl(null)).toBeNull()
    expect(getSafeExternalUrl(undefined)).toBeNull()
    expect(getSafeExternalUrl('')).toBeNull()
    expect(getSafeExternalUrl('   ')).toBeNull()
  })

  it('returns null for an invalid URL / bare domain (no protocol added)', () => {
    expect(getSafeExternalUrl('not a url')).toBeNull()
    expect(getSafeExternalUrl('example.com')).toBeNull()
    expect(getSafeExternalUrl('www.example.com/path')).toBeNull()
  })

  it('keeps https URLs (trimmed)', () => {
    expect(getSafeExternalUrl('https://example.com')).toBe('https://example.com')
    expect(getSafeExternalUrl('  https://example.com/path?q=1  ')).toBe('https://example.com/path?q=1')
  })

  it('rejects dangerous / non-web schemes', () => {
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(getSafeExternalUrl('data:text/html,<script>1</script>')).toBeNull()
    expect(getSafeExternalUrl('file:///etc/passwd')).toBeNull()
    expect(getSafeExternalUrl('intent://scan/#Intent;scheme=zxing;end')).toBeNull()
    expect(getSafeExternalUrl('ftp://example.com/file')).toBeNull()
  })

  it('rejects non-localhost http in production and in dev', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(getSafeExternalUrl('http://example.com')).toBeNull()
    vi.stubEnv('NODE_ENV', 'development')
    expect(getSafeExternalUrl('http://example.com')).toBeNull()
  })

  it('allows http://localhost and http://127.0.0.1 only outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(getSafeExternalUrl('http://localhost:3000')).toBe('http://localhost:3000')
    expect(getSafeExternalUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000')

    vi.stubEnv('NODE_ENV', 'production')
    expect(getSafeExternalUrl('http://localhost:3000')).toBeNull()
    expect(getSafeExternalUrl('http://127.0.0.1:3000')).toBeNull()
  })
})
