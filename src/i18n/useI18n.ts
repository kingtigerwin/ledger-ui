import { use } from 'react'
import { I18nContext } from './context'

export function useI18n() {
  const i18n = use(I18nContext)
  if (!i18n) throw new Error('useI18n must be used inside <I18nProvider>')
  return i18n
}
