import { createContext } from 'react'
import type { Locale } from '../api/types'
import type { Messages } from './en'

export interface I18nContextValue {
  /** The language on screen. */
  locale: Locale
  /** The language chosen in the menu; null for Auto, which follows the browser. */
  choice: Locale | null
  t: Messages
  /** Shows and remembers `choice` on this browser; saving it to the profile is the caller's part. */
  choose: (choice: Locale | null) => void
}

export const I18nContext = createContext<I18nContextValue | null>(null)
