import { describe, expect, it } from 'vitest'
import { browserLanguage, readChoice, saveChoice } from './detect'

describe('given the languages a browser asks for', () => {
  it.each([
    [['zh-CN'], 'zh-CN'],
    [['zh'], 'zh-CN'],
    [['zh-Hans-CN', 'en'], 'zh-CN'],
    [['zh-TW'], 'zh-CN'],
    [['en-AU', 'zh-CN'], 'en'],
    [['ja', 'zh-CN'], 'zh-CN'],
    [['fr-FR', 'de'], 'en'],
    [[], 'en'],
  ])('shows %j in %s', (languages, expected) => {
    expect(browserLanguage(languages)).toBe(expected)
  })
})

describe('given a choice from the language menu', () => {
  it('remembers it, and forgets it again for Auto', () => {
    expect(readChoice()).toBeNull()

    saveChoice('zh-CN')
    expect(readChoice()).toBe('zh-CN')

    saveChoice(null)
    expect(readChoice()).toBeNull()
  })

  it('ignores a stored value that is not a language Ledger has', () => {
    localStorage.setItem('ledger.lang', 'fr')
    expect(readChoice()).toBeNull()
  })
})
