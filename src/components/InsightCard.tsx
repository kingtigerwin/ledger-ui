import { useState } from 'react'
import type { Insight, PossibleDuplicate, Transaction } from '../api/types'
import { formatCents, formatDate } from '../format'
import { useDeleteTransaction, useDismissInsight } from '../hooks/useHome'
import { TransactionCard } from './TransactionCard'

const quietButtonClass =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'

const confirmDelete = (t: Transaction) =>
  window.confirm(
    `Delete ${t.item}, ${formatCents(t.amountCents, t.currency)} on ${formatDate(t.date)}? This can't be undone.`,
  )

interface Wording {
  title: string
  body: string
  /** Opens the transactions behind the card. */
  view: string
  dismiss: string
}

/** ledger-api sends facts; the words are written here, so only stored text isn't English. */
function wordingFor(insight: Insight, today: string): Wording {
  switch (insight.type) {
    case 'rego_due': {
      const due = formatDate(insight.estimatedDueDate)
      const [last] = insight.transactions
      return {
        title:
          insight.estimatedDueDate < today
            ? `Car rego was due around ${due}`
            : `Car rego due around ${due}`,
        body: `Estimated from your last payment of ${formatCents(insight.lastPaidCents, insight.currency)} on ${formatDate(last.date)}`,
        view: 'View payment',
        dismiss: 'Dismiss',
      }
    }
    case 'possible_duplicate': {
      const dates = [...new Set(insight.transactions.map((t) => t.date))]
      return {
        title: 'Possibly recorded twice',
        body: `${insight.merchant}, ${formatCents(insight.amountCents, insight.currency)}, recorded ${insight.transactions.length} times on ${dates.map(formatDate).join(' and ')}`,
        view: 'Review',
        dismiss: 'Not a duplicate',
      }
    }
    case 'price_rise':
      return {
        title: `${insight.merchant} went up`,
        body: `${formatCents(insight.previousCents, insight.currency)} → ${formatCents(insight.currentCents, insight.currency)} since ${formatDate(insight.since)}, ${formatCents(insight.extraPerYearCents, insight.currency)} more a year`,
        view: 'View charges',
        dismiss: 'Dismiss',
      }
  }
}

function DuplicateReview({ insight }: { insight: PossibleDuplicate }) {
  const remove = useDeleteTransaction()

  return (
    <>
      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
        {insight.transactions.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{t.item}</div>
              <div className="text-xs text-slate-500">
                {[t.merchant, formatDate(t.date)].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Delete ${t.item} on ${formatDate(t.date)}`}
              disabled={remove.isPending}
              onClick={() => confirmDelete(t) && remove.mutate(t.id)}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {remove.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {remove.error.message}
        </p>
      )}
    </>
  )
}

export function InsightCard({
  insight,
  today,
}: {
  insight: Insight
  today: string
}) {
  const [open, setOpen] = useState(false)
  const dismiss = useDismissInsight()
  const {
    title,
    body,
    view,
    dismiss: dismissLabel,
  } = wordingFor(insight, today)

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-medium text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={quietButtonClass}
        >
          {view}
        </button>
        <button
          type="button"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate(insight.id)}
          className={quietButtonClass}
        >
          {dismissLabel}
        </button>
      </div>
      {dismiss.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {dismiss.error.message}
        </p>
      )}
      {open &&
        (insight.type === 'possible_duplicate' ? (
          <DuplicateReview insight={insight} />
        ) : (
          <TransactionCard title="Found" transactions={insight.transactions} />
        ))}
    </li>
  )
}
