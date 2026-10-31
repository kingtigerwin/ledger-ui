import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api/client'
import { ApiError } from '../api/client'
import { AuthContext, type AuthContextValue, type AuthState } from './context'

/**
 * API Gateway answers 403 when the authorizer refuses a token, whether it has expired or its
 * user was disabled or deleted, and with its own body, so there's no ledger-api error code.
 * A 403 from ledger-api itself (`forbidden`) means the token is fine and the answer is no.
 */
const isTokenRefused = (err: unknown) =>
  err instanceof ApiError &&
  (err.status === 401 || (err.status === 403 && err.code === 'http_error'))

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  // The access token lives only in memory; a reload gets a new one from the HttpOnly refresh cookie.
  const tokenRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const signOutLocally = useCallback(() => {
    tokenRef.current = null
    queryClient.clear()
    setState({ status: 'signedOut' })
  }, [queryClient])

  useEffect(() => {
    api
      .refresh()
      .then(async ({ accessToken }) => {
        tokenRef.current = accessToken
        setState({ status: 'signedIn', user: await api.fetchMe(accessToken) })
      })
      .catch(() => setState({ status: 'signedOut' }))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { accessToken } = await api.login(username, password)
    tokenRef.current = accessToken
    setState({ status: 'signedIn', user: await api.fetchMe(accessToken) })
  }, [])

  const logout = useCallback(async () => {
    // Signing out locally matters more than telling the server, so a failed call doesn't block it.
    await api.logout().catch(() => {})
    signOutLocally()
  }, [signOutLocally])

  const authRequest = useCallback<AuthContextValue['authRequest']>(
    async (path, options) => {
      try {
        return await api.request(path, {
          ...options,
          token: tokenRef.current ?? undefined,
        })
      } catch (err) {
        if (!isTokenRefused(err)) throw err
      }
      // The access token lasts 15 minutes; get another and try once more. If the user was
      // disabled or deleted, refreshing fails too and signs them out.
      let accessToken: string
      try {
        ;({ accessToken } = await api.refresh())
      } catch {
        signOutLocally()
        throw new ApiError(401, 'session_expired', 'Please sign in again.')
      }
      tokenRef.current = accessToken
      return api.request(path, { ...options, token: accessToken })
    },
    [signOutLocally],
  )

  const value = useMemo(
    () => ({ state, login, logout, authRequest }),
    [state, login, logout, authRequest],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
