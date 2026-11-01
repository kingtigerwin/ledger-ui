import { describe, expect, it } from 'vitest'
import { newUlid } from './ulid'

describe('given a new ULID', () => {
  it('is 26 characters of Crockford base32', () => {
    expect(newUlid()).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
  })

  it('encodes the time first, so later ones sort later', () => {
    expect(newUlid(0).slice(0, 10)).toBe('0000000000')
    expect(newUlid(32).slice(0, 10)).toBe('0000000010')
    expect(newUlid(2_000_000) > newUlid(1_000_000)).toBe(true)
  })

  it('differs each time, even in the same millisecond', () => {
    expect(newUlid(1_000)).not.toBe(newUlid(1_000))
  })
})
