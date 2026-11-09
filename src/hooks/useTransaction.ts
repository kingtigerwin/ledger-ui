import { useQuery } from '@tanstack/react-query'
import type { Transaction } from '../api/types'
import { useAuth } from '../auth/useAuth'

/**
 * One transaction in full, for the receipt lines that the agent's lists leave out. An item with a
 * `userId` came from the admin's list of everyone's, so it's read through the admin route.
 */
export function useTransaction(txn: Transaction) {
  const { authRequest } = useAuth()
  const path = txn.userId
    ? `/api/v1/admin/users/${encodeURIComponent(txn.userId)}/transactions/${encodeURIComponent(txn.id)}`
    : `/api/v1/transactions/${encodeURIComponent(txn.id)}`
  return useQuery({
    queryKey: ['transaction', txn.userId ?? null, txn.id],
    queryFn: () => authRequest<Transaction>(path),
    // A receipt's lines are fixed once it's recorded, so opening it again needn't ask twice.
    staleTime: Infinity,
  })
}
