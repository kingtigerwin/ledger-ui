import type { Locale } from '../api/types'

export const LOCALES: Locale[] = ['en', 'zh-CN']

const STORAGE_KEY = 'ledger.lang'

/** Any Chinese, Traditional included, gets Simplified: closer for its reader than English. */
function match(tag: string): Locale | null {
  const t = tag.toLowerCase()
  if (t === 'zh' || t.startsWith('zh-')) return 'zh-CN'
  if (t === 'en' || t.startsWith('en-')) return 'en'
  return null
}

/**
 * The first of the browser's languages that Ledger has, else English. Browsers start the list
 * from the system's language, so this follows the device unless its owner changed it.
 */
export function browserLanguage(
  languages: readonly string[] = navigator.languages ?? [navigator.language],
): Locale {
  for (const tag of languages) {
    const locale = tag ? match(tag) : null
    if (locale) return locale
  }
  return 'en'
}

/** The language chosen in the menu on this browser; null for Auto. Private windows may refuse storage. */
export function readChoice(): Locale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LOCALES.find((l) => l === saved) ?? null
  } catch {
    return null
  }
}

export function saveChoice(locale: Locale | null) {
  try {
    if (locale) localStorage.setItem(STORAGE_KEY, locale)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Still shown for this visit; it just isn't remembered.
  }
}
