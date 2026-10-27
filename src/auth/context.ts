import { createContext } from 'react'
import type { request } from '../api/client'
import type { User } from '../api/types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }

export interface AuthContextValue {
  state: AuthState
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** `request` with the access token, refreshed once and retried on a 401. */
  authRequest: <T>(
    path: string,
    options?: Omit<NonNullable<Parameters<typeof request>[1]>, 'token'>,
  ) => Promise<T>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
