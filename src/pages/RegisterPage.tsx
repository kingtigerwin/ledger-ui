import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError, register } from '../api/client'
import {
  AuthCard,
  FormError,
  primaryButtonClass,
  TextField,
} from '../components/AuthCard'
import { errorText } from '../i18n/errorText'
import { useI18n } from '../i18n/useI18n'

/** ledger-api rejects a missing, malformed or over-long email with 400 `validation_failed`. */
const isEmailRejected = (err: unknown) =>
  err instanceof ApiError &&
  err.code === 'validation_failed' &&
  !!err.details?.some((issue) => issue.path[0] === 'email')

export function RegisterPage() {
  const { t, locale } = useI18n()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // What went wrong, not its words, so choosing another language rewords it.
  const [failure, setFailure] = useState<unknown>(null)
  const [emailRejected, setEmailRejected] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFailure(null)
    setEmailRejected(false)
    setSubmitting(true)
    try {
      // The language on screen, so the "waiting for approval" email is in it too.
      await register(username.trim(), password, email.trim(), locale)
      setRegistered(true)
    } catch (err) {
      if (isEmailRejected(err)) {
        setEmailRejected(true)
        return
      }
      setFailure(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (registered) {
    return (
      <AuthCard title={t.auth.accountCreated}>
        <p role="status" className="text-center text-slate-600">
          {t.auth.checkEmail}
        </p>
        <Link
          to="/login"
          className={`${primaryButtonClass} mt-6 block text-center`}
        >
          {t.common.backToSignIn}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={t.auth.username}
          name="username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          autoFocus
        />
        <TextField
          label={t.auth.email}
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={emailRejected ? t.auth.invalidEmail : null}
        />
        <TextField
          label={t.auth.password}
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormError message={failure ? errorText(t, failure) : null} />
        <button
          type="submit"
          disabled={submitting}
          className={primaryButtonClass}
        >
          {submitting ? t.auth.creatingAccount : t.auth.createAccount}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t.auth.alreadyHaveAccount}{' '}
        <Link
          to="/login"
          className="font-medium text-indigo-600 hover:underline"
        >
          {t.auth.signIn}
        </Link>
      </p>
    </AuthCard>
  )
}
