import { describe, expect, it } from 'vitest'
import { greeting, localDate, localMonth } from './format'

describe('given the customer local clock', () => {
  it('keeps the local date just after midnight on the 1st', () => {
    const now = new Date(2026, 10, 1, 0, 30)
    expect(localDate(now)).toBe('2026-11-01')
    expect(localMonth(now)).toBe('2026-11')
  })

  it.each([
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good afternoon'],
    [18, 'Good evening'],
  ])('at %i:00 says %s', (hour, expected) => {
    expect(greeting(new Date(2026, 10, 1, hour))).toBe(expected)
  })
})
