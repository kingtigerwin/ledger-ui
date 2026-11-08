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
import type { Messages } from '../i18n/en'
import { errorText } from '../i18n/errorText'
import { useI18n } from '../i18n/useI18n'
import {
  AuthCard,
  FormError,
  GoogleLink,
  primaryButtonClass,
  TextField,
} from '../components/AuthCard'

// Google sign-in ends with a redirect back here, so its outcome arrives in the URL. Only these
// codes show anything: the URL is anyone's to write, so its text is never displayed.
const REDIRECT_ERRORS: Record<string, keyof Messages['auth']> = {
  google_failed: 'googleFailed',
  google_unavailable: 'googleUnavailable',
}

/** Kept as what went wrong, not its words, so choosing another language rewords it. */
type Problem = { redirect: keyof Messages['auth'] } | { err: unknown }

export function LoginPage() {
  const { state, login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState<Problem | null>(() => {
    const redirect = REDIRECT_ERRORS[searchParams.get('error') ?? '']
    return redirect ? { redirect } : null
  })
  const error =
    problem &&
    ('redirect' in problem
      ? (t.auth[problem.redirect] as string)
      : errorText(t, problem.err))
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (state.status === 'signedIn') return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setProblem(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'account_pending') {
        navigate('/pending', { replace: true })
        return
      }
      setProblem({ err })
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title={t.auth.signInTitle} subtitle={t.auth.signInSubtitle}>
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
          label={t.auth.password}
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
          {submitting ? t.auth.signingIn : t.auth.signIn}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-sm text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {t.auth.or}
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleLink />
      <p className="mt-6 text-center text-sm text-slate-500">
        {t.auth.noAccount}{' '}
        <Link
          to="/register"
          className="font-medium text-indigo-600 hover:underline"
        >
          {t.auth.register}
        </Link>
      </p>
    </AuthCard>
  )
}
