import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/useAuth'
import { useI18n } from './useI18n'

/**
 * Once per sign-in: the language saved on the profile wins, so it follows the customer to a new
 * device. A profile with none takes the one chosen on this browser, so their emails match.
 */
export function LanguageSync() {
  const { state, authRequest } = useAuth()
  const { choice, choose } = useI18n()
  const syncedFor = useRef<string | null>(null)
  const user = state.status === 'signedIn' ? state.user : null

  useEffect(() => {
    if (!user) {
      syncedFor.current = null
      return
    }
    if (syncedFor.current === user.id) return
    syncedFor.current = user.id
    if (user.locale) {
      if (user.locale !== choice) choose(user.locale)
    } else if (choice) {
      authRequest('/api/v1/auth/me', {
        method: 'PATCH',
        body: { locale: choice },
      }).catch(() => {})
    }
  }, [user, choice, choose, authRequest])

  return null
}
