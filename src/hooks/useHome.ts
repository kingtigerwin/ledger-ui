import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Insight, MonthlySummary } from '../api/types'
import { useAuth } from '../auth/useAuth'

/** Everything Home shows; recording or deleting a transaction refreshes all of it. */
export const HOME_QUERY_KEY = ['home']

// Reads are cheap but not free, and moving between tabs shouldn't repeat them.
const STALE_TIME_MS = 5 * 60 * 1000

export function useMonthlySummary(month: string) {
  const { authRequest } = useAuth()
  return useQuery({
    queryKey: [...HOME_QUERY_KEY, 'summary', month],
    queryFn: () =>
      authRequest<MonthlySummary>(
        `/api/v1/transactions/summary?month=${month}`,
      ),
    staleTime: STALE_TIME_MS,
  })
}

export function useInsights(today: string) {
  const { authRequest } = useAuth()
  return useQuery({
    queryKey: [...HOME_QUERY_KEY, 'insights', today],
    queryFn: () =>
      authRequest<{ items: Insight[] }>(`/api/v1/insights?today=${today}`),
    select: (data) => data.items,
    staleTime: STALE_TIME_MS,
  })
}

export function useDismissInsight() {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      authRequest<void>(`/api/v1/insights/${id}/dismiss`, { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: HOME_QUERY_KEY }),
  })
}

export function useDeleteTransaction() {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      authRequest<void>(`/api/v1/transactions/${id}`, { method: 'DELETE' }),
    // Also on failure: a 404 means it's already gone, and the card should catch up.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: HOME_QUERY_KEY }),
  })
}
