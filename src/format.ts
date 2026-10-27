const LOCALE = 'en-AU'

export function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(
    amount,
  )
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
