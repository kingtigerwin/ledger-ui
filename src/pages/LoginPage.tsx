import { useState, type FormEvent } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import {
  AuthCard,
  FormError,
  GoogleLink,
  primaryButtonClass,
  TextField,
} from '../components/AuthCard'

// Google sign-in ends with a redirect back here, so its outcome arrives in the URL. Only these
// codes show anything: the URL is anyone's to write, so its text is never displayed.
const REDIRECT_ERRORS: Record<string, string> = {
  google_failed:
    "Google sign-in didn't work. Please try again, or use your username and password.",
  google_unavailable: "Google sign-in isn't available right now.",
}

function loginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError))
    return 'Something went wrong. Please try again.'
  return err.message
}

export function LoginPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    () => REDIRECT_ERRORS[searchParams.get('error') ?? ''] ?? null,
  )
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/chat'
  if (state.status === 'signedIn') return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'account_pending') {
        navigate('/pending', { replace: true })
        return
      }
      setError(loginErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Record your spending by chatting.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Username"
          name="username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          autoFocus
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <FormError message={error} />
        <button
          type="submit"
          disabled={submitting || state.status === 'loading'}
          className={primaryButtonClass}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-sm text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleLink />
      <p className="mt-6 text-center text-sm text-slate-500">
        No account yet?{' '}
        <Link
          to="/register"
          className="font-medium text-indigo-600 hover:underline"
        >
          Register
        </Link>
      </p>
    </AuthCard>
  )
}
