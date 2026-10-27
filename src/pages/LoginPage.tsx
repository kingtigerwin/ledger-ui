import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import {
  AuthCard,
  FormError,
  primaryButtonClass,
  TextField,
} from '../components/AuthCard'

function loginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError))
    return 'Something went wrong. Please try again.'
  if (err.code === 'account_pending') {
    return 'Your account is waiting for admin approval. Try again once it has been approved.'
  }
  return err.message
}

export function LoginPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
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
