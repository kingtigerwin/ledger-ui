import type { Locale } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { useI18n } from './useI18n'

// Each language in its own words, so someone who can't read the current one still finds theirs.
const NAMES: Record<Locale, string> = { en: 'English', 'zh-CN': '简体中文' }

/** Chooses the language; for a signed-in user, it's saved to their profile and follows them. */
export function LanguageMenu() {
  const { locale, choice, t, choose } = useI18n()
  const { state, authRequest } = useAuth()

  const handleChange = (value: string) => {
    const next = value === 'auto' ? null : (value as Locale)
    choose(next)
    if (state.status === 'signedIn') {
      // Already shown and remembered on this browser; the profile catches up on the next choice.
      authRequest('/api/v1/auth/me', {
        method: 'PATCH',
        body: { locale: next },
      }).catch(() => {})
    }
  }

  return (
    <select
      aria-label={t.language.label}
      value={choice ?? 'auto'}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
    >
      <option value="auto">
        {t.language.auto}
        {choice === null && ` · ${NAMES[locale]}`}
      </option>
      {Object.entries(NAMES).map(([value, name]) => (
        <option key={value} value={value} lang={value}>
          {name}
        </option>
      ))}
    </select>
  )
}
