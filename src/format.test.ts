import { describe, expect, it } from 'vitest'
import {
  capitalise,
  greeting,
  localDate,
  localMonth,
  previousMonth,
} from './format'

describe('given a plain product name', () => {
  it.each([
    ['chicken drumsticks', 'Chicken drumsticks'],
    ['香蕉', '香蕉'],
    ['', ''],
  ])('writes %s as %s', (text, expected) => {
    expect(capitalise(text)).toBe(expected)
  })
})

describe('given the customer local clock', () => {
  it('keeps the local date just after midnight on the 1st', () => {
    const now = new Date(2026, 10, 1, 0, 30)
    expect(localDate(now)).toBe('2026-11-01')
    expect(localMonth(now)).toBe('2026-11')
  })

  it.each([
    ['2026-11', '2026-10'],
    ['2026-01', '2025-12'],
  ])('the month before %s is %s', (month, expected) => {
    expect(previousMonth(month)).toBe(expected)
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
