import { useState } from 'react'
import type { MonthlySummary } from '../api/types'
import { capitalise, formatCents, formatDate, formatMonth } from '../format'
import { useCategoryTransactions } from '../hooks/useHome'

/** "58%", or "<1%" for a sliver, so a category with spending never reads as 0%. */
function share(cents: number, totalCents: number) {
  const percent = totalCents > 0 ? (cents / totalCents) * 100 : 0
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`
}

function CategoryTransactions({
  month,
  category,
}: {
  month: string
  category: string
}) {
  const transactions = useCategoryTransactions(month, category)

  if (transactions.isPending) {
    return <p className="px-3 pb-2 text-slate-400">Loading…</p>
  }
  if (transactions.isError) {
    return (
      <p role="alert" className="px-3 pb-2 text-red-700">
        Couldn't load these.{' '}
        <button
          type="button"
          onClick={() => transactions.refetch()}
          className="underline"
        >
          Try again
        </button>
      </p>
    )
  }
  return (
    <ul
      aria-label={`${capitalise(category)} transactions`}
      className="mx-3 mb-2 divide-y divide-slate-100 rounded-lg bg-slate-50"
    >
      {transactions.data.map((t) => (
        <li
          key={t.id}
          className="flex items-start justify-between gap-3 px-3 py-2"
        >
          <div className="min-w-0">
            <div className="text-slate-900">{t.item}</div>
            <div className="text-xs text-slate-500">
              {[t.merchant, formatDate(t.date)].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="shrink-0 tabular-nums">
            {formatCents(t.amountCents, t.currency)}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function SummaryCard({ summary }: { summary: MonthlySummary }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700">
        <span>{formatMonth(summary.month)}</span>
        <span className="tabular-nums" data-testid="summary-total">
          {formatCents(summary.totalCents, summary.currency)}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {summary.byCategory.map(({ category, totalCents, count }) => {
          const open = openCategory === category
          const percent = share(totalCents, summary.totalCents)
          return (
            <li key={category}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenCategory(open ? null : category)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                <span className="flex justify-between">
                  <span>
                    <span aria-hidden="true" className="mr-1 text-slate-400">
                      {open ? '▾' : '▸'}
                    </span>
                    {capitalise(category)}
                  </span>
                  <span className="tabular-nums">
                    {formatCents(totalCents, summary.currency)}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="shrink-0">
                    {count !== undefined &&
                      `${count} ${count === 1 ? 'item' : 'items'} · `}
                    {percent}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-slate-100"
                  >
                    <span
                      className="block h-full rounded-full bg-indigo-400"
                      style={{
                        width: `${summary.totalCents > 0 ? (totalCents / summary.totalCents) * 100 : 0}%`,
                      }}
                    />
                  </span>
                </span>
              </button>
              {open && (
                <CategoryTransactions
                  month={summary.month}
                  category={category}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
