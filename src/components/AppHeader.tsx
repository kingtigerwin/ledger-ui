import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/useAuth'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`

/** The bar above the signed-in pages: navigation, who's signed in, and sign out. */
export function AppHeader({ actions }: { actions?: ReactNode }) {
  const { state, logout } = useAuth()
  const user = state.status === 'signedIn' ? state.user : null

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
        <span className="mr-2 text-lg font-semibold">Ledger</span>
        <nav className="flex gap-1">
          <NavLink to="/chat" className={navClass}>
            Chat
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass}>
              Users
            </NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <span className="hidden text-sm text-slate-500 sm:inline">
            {user?.username}
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
