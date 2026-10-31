import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { AdminUser, UserStatus } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AppHeader } from '../components/AppHeader'
import { formatDate } from '../format'

const TABS: { status: UserStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'active', label: 'Active' },
  { status: 'disabled', label: 'Disabled' },
]

type Action = 'enable' | 'disable' | 'delete'

interface ActionButton {
  action: Action
  label: string
  style: 'primary' | 'secondary' | 'danger'
}

const DELETE_BUTTON: ActionButton = {
  action: 'delete',
  label: 'Delete',
  style: 'danger',
}

// Rejecting a pending user disables them, so they can't sign in; an admin can still enable them later.
const ACTIONS: Record<UserStatus, ActionButton[]> = {
  pending: [
    { action: 'enable', label: 'Approve', style: 'primary' },
    { action: 'disable', label: 'Reject', style: 'secondary' },
    DELETE_BUTTON,
  ],
  active: [
    { action: 'disable', label: 'Disable', style: 'secondary' },
    DELETE_BUTTON,
  ],
  disabled: [
    { action: 'enable', label: 'Enable', style: 'primary' },
    DELETE_BUTTON,
  ],
}

const BUTTON_STYLES: Record<ActionButton['style'], string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50',
}

const confirmDelete = (user: AdminUser) =>
  window.confirm(
    `Delete ${user.username} and all their transactions? This can't be undone.`,
  )

export function AdminPage() {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<UserStatus>('pending')

  const users = useQuery({
    queryKey: ['users', status],
    queryFn: () =>
      authRequest<{ items: AdminUser[] }>(
        `/api/v1/admin/users?status=${status}`,
      ).then((page) => page.items),
  })

  const mutation = useMutation({
    mutationFn: ({ user, action }: { user: AdminUser; action: Action }) =>
      action === 'delete'
        ? authRequest<void>(`/api/v1/admin/users/${user.id}`, {
            method: 'DELETE',
          })
        : authRequest<void>(`/api/v1/admin/users/${user.id}/${action}`, {
            method: 'POST',
          }),
    // A user moves between tabs, so every list may have changed.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="flex h-full flex-col">
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="text-xl font-semibold">Users</h1>
          <div
            role="tablist"
            className="mt-4 flex gap-1 border-b border-slate-200"
          >
            {TABS.map((tab) => (
              <button
                key={tab.status}
                role="tab"
                type="button"
                aria-selected={tab.status === status}
                onClick={() => setStatus(tab.status)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab.status === status ? 'border-indigo-600 font-medium text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mutation.error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {mutation.error.message}
            </p>
          )}

          {users.isPending ? (
            <p className="mt-6 text-slate-500">Loading…</p>
          ) : users.isError ? (
            <p role="alert" className="mt-6 text-red-700">
              {users.error.message}
            </p>
          ) : users.data.length === 0 ? (
            <p className="mt-6 text-slate-500">No {status} users.</p>
          ) : (
            <ul
              aria-label={`${status} users`}
              className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white"
            >
              {users.data.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {user.username}
                      {user.role === 'admin' && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          admin
                        </span>
                      )}
                    </div>
                    {user.email && (
                      <div className="truncate text-sm text-slate-600">
                        {user.email}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      Registered {formatDate(user.createdAt.slice(0, 10))}
                    </div>
                  </div>
                  {/* ledger-api refuses to disable or delete admins, so they get no buttons. */}
                  {user.role !== 'admin' && (
                    <div className="flex gap-2">
                      {ACTIONS[status].map(({ action, label, style }) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => {
                            if (action === 'delete' && !confirmDelete(user)) {
                              return
                            }
                            mutation.mutate({ user, action })
                          }}
                          disabled={mutation.isPending}
                          aria-label={`${label} ${user.username}`}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${BUTTON_STYLES[style]}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
