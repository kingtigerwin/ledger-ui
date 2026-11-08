import type { Locale } from './api/types'

// English is Australian English: dates as 3 Nov 2026, amounts in AUD as $12.34.
const INTL_LOCALES: Record<Locale, string> = { en: 'en-AU', 'zh-CN': 'zh-CN' }

let LOCALE = INTL_LOCALES.en

/** The language dates and amounts are written in; `I18nProvider` sets it. */
export function setFormatLocale(locale: Locale) {
  LOCALE = INTL_LOCALES[locale]
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(
    amount,
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The month where the customer is. `toISOString` is UTC: early on the 1st in Sydney, that's last month. */
export function localMonth(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

/** The date where the customer is, as ledger-api takes it. */
export function localDate(now: Date): string {
  return `${localMonth(now)}-${pad(now.getDate())}`
}

/** "2026-01" → "2025-12" */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return localMonth(new Date(y, m - 2, 1))
}

export function partOfDay(now: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = now.getHours()
  if (hour < 12) return 'morning'
  return hour < 18 ? 'afternoon' : 'evening'
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

export function formatCents(cents: number, currency = 'AUD'): string {
  return formatCurrency(cents / 100, currency)
}

/** "2026-10" → "October 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, 1))
}
