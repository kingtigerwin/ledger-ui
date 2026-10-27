import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError, register } from '../api/client'
import {
  AuthCard,
  FormError,
  primaryButtonClass,
  TextField,
} from '../components/AuthCard'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(username.trim(), password)
      setRegistered(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (registered) {
    return (
      <AuthCard title="Account created">
        <p role="status" className="text-center text-slate-600">
          Your account is pending. An admin needs to approve it before you can
          sign in.
        </p>
        <Link
          to="/login"
          className={`${primaryButtonClass} mt-6 block text-center`}
        >
          Back to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Register"
      subtitle="An admin approves new accounts before they can sign in."
    >
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
          autoComplete="new-password"
        />
        <FormError message={error} />
        <button
          type="submit"
          disabled={submitting}
          className={primaryButtonClass}
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-indigo-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
