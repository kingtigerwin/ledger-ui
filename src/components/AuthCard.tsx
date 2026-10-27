import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** The centred card the login and register pages share. */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">
            Ledger
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </main>
  )
}

interface TextFieldProps {
  label: string
  name: string
  type?: 'text' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  autoFocus?: boolean
}

export function TextField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  autoComplete,
  autoFocus,
}: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        maxLength={type === 'password' ? 1024 : 64}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {message}
    </p>
  )
}

export const primaryButtonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300'
