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

/**
 * A plain link, not a form: the browser has to leave for Google, and the CSP's `form-action
 * 'self'` would stop a form following that redirect. The logo is inline since `img-src` is
 * limited to this site.
 */
export function GoogleLink() {
  return (
    <a
      href="/api/v1/auth/google/start"
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      Continue with Google
    </a>
  )
}
