import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, primaryButtonClass } from '../components/AuthCard'
import { useI18n } from '../i18n/useI18n'

/**
 * Where a pending user lands: only password sign-ups wait for approval. They hold no token, so
 * this page shows nothing of theirs, and it offers no Google button, which would give them a
 * second account.
 */
export function PendingPage() {
  const { state } = useAuth()
  const { t } = useI18n()

  if (state.status === 'signedIn') return <Navigate to="/" replace />

  return (
    <AuthCard title={t.auth.pendingTitle}>
      <p role="status" className="mb-6 text-center text-slate-600">
        {t.auth.pendingBody}
      </p>
      <Link to="/login" className={`${primaryButtonClass} block text-center`}>
        {t.common.backToSignIn}
      </Link>
    </AuthCard>
  )
}
