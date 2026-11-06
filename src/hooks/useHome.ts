import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Insight, MonthlySummary, Transaction } from '../api/types'
import { useAuth } from '../auth/useAuth'

/** Everything Home shows; recording or deleting a transaction refreshes all of it. */
export const HOME_QUERY_KEY = ['home']

// Reads are cheap but not free, and moving between tabs shouldn't repeat them.
const STALE_TIME_MS = 5 * 60 * 1000

export function useMonthlySummary(month: string, enabled = true) {
  const { authRequest } = useAuth()
  return useQuery({
    queryKey: [...HOME_QUERY_KEY, 'summary', month],
    queryFn: () =>
      authRequest<MonthlySummary>(
        `/api/v1/transactions/summary?month=${month}`,
      ),
    enabled,
    staleTime: STALE_TIME_MS,
  })
}

/** One category's transactions in a month, newest first: every page, since a month's are few. */
export function useCategoryTransactions(month: string, category: string) {
  const { authRequest } = useAuth()
  return useQuery({
    queryKey: [...HOME_QUERY_KEY, 'category', month, category],
    queryFn: async () => {
      const [year, monthNumber] = month.split('-').map(Number)
      const lastDay = new Date(year, monthNumber, 0).getDate()
      const items: Transaction[] = []
      let cursor: string | null = null
      do {
        const query = new URLSearchParams({
          category,
          from: `${month}-01`,
          to: `${month}-${lastDay}`,
          limit: '100',
          ...(cursor && { cursor }),
        })
        const page: { items: Transaction[]; nextCursor: string | null } =
          await authRequest(`/api/v1/transactions?${query}`)
        items.push(...page.items)
        cursor = page.nextCursor
      } while (cursor)
      return items
    },
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
