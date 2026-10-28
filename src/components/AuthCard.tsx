import { useId, type ReactNode } from 'react'

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
  type?: 'text' | 'password' | 'email'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  autoFocus?: boolean
  /** Shown under the input, which is then marked invalid. */
  error?: string | null
}

// ledger-api's limits: 64 for a username, 1024 for a password, 254 for an email address.
const MAX_LENGTH = { text: 64, password: 1024, email: 254 }

export function TextField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  autoComplete,
  autoFocus,
  error,
}: TextFieldProps) {
  const errorId = useId()
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
        maxLength={MAX_LENGTH[type]}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-red-700">
          {error}
        </span>
      )}
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
