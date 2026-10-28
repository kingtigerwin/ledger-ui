import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError, register } from '../api/client'
import {
  AuthCard,
  FormError,
  primaryButtonClass,
  TextField,
} from '../components/AuthCard'

/** ledger-api rejects a missing, malformed or over-long email with 400 `validation_failed`. */
const isEmailRejected = (err: unknown) =>
  err instanceof ApiError &&
  err.code === 'validation_failed' &&
  !!err.details?.some((issue) => issue.path[0] === 'email')

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setEmailError(null)
    setSubmitting(true)
    try {
      await register(username.trim(), password, email.trim())
      setRegistered(true)
    } catch (err) {
      if (isEmailRejected(err)) {
        setEmailError('Enter a valid email address.')
        return
      }
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
          Check your email: your account is waiting for approval.
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
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={emailError}
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
