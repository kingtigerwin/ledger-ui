import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Locale } from '../api/types'
import { setFormatLocale } from '../format'
import { I18nContext } from './context'
import { browserLanguage, readChoice, saveChoice } from './detect'
import { en, type Messages } from './en'
import { zhCN } from './zh-CN'

const MESSAGES: Record<Locale, Messages> = { en, 'zh-CN': zhCN }

/** Shows the language chosen in the menu, else the browser's, else English. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState(readChoice)
  const [detected] = useState(() => browserLanguage())
  const locale = choice ?? detected
  // Set while rendering, before the children format anything: they re-render with this.
  setFormatLocale(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const choose = useCallback((next: Locale | null) => {
    saveChoice(next)
    setChoice(next)
  }, [])

  const value = useMemo(
    () => ({ locale, choice, t: MESSAGES[locale], choose }),
    [locale, choice, choose],
  )
  return <I18nContext value={value}>{children}</I18nContext>
}
