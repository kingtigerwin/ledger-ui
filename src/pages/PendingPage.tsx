import { Link, Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import {
  AuthCard,
  GoogleLink,
  primaryButtonClass,
} from '../components/AuthCard'

/**
 * Where a pending user lands. They hold no token, so this page shows nothing of theirs, and
 * only ledger-api decides who's pending: `via` chooses a button, so it's safe for anyone to write.
 */
export function PendingPage() {
  const { state } = useAuth()
  const [searchParams] = useSearchParams()

  if (state.status === 'signedIn') return <Navigate to="/chat" replace />

  return (
    <AuthCard title="Thanks, you're nearly in">
      <p role="status" className="mb-6 text-center text-slate-600">
        Your account is waiting for approval. We'll email you when it's ready.
      </p>
      {searchParams.get('via') === 'google' ? (
        <GoogleLink />
      ) : (
        <Link to="/login" className={`${primaryButtonClass} block text-center`}>
          Back to sign in
        </Link>
      )}
    </AuthCard>
  )
}
