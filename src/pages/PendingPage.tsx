import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthCard, primaryButtonClass } from '../components/AuthCard'

/**
 * Where a pending user lands: only password sign-ups wait for approval. They hold no token, so
 * this page shows nothing of theirs, and it offers no Google button, which would give them a
 * second account.
 */
export function PendingPage() {
  const { state } = useAuth()

  if (state.status === 'signedIn') return <Navigate to="/chat" replace />

  return (
    <AuthCard title="Thanks, you're nearly in">
      <p role="status" className="mb-6 text-center text-slate-600">
        Your account is waiting for approval. We'll email you when it's ready.
      </p>
      <Link to="/login" className={`${primaryButtonClass} block text-center`}>
        Back to sign in
      </Link>
    </AuthCard>
  )
}
