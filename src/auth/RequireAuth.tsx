import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { useAuth } from './useAuth'

interface RequireAuthProps {
  children: ReactNode
  /** Only users with this role get in; others go to the chat. */
  role?: Role
}

/** Shows its children only to signed-in users; everyone else is sent to the login page. */
export function RequireAuth({ children, role }: RequireAuthProps) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }
  if (state.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (role && state.user.role !== role) return <Navigate to="/chat" replace />
  return children
}
