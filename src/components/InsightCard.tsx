import { useState } from 'react'
import type { Insight, PossibleDuplicate, Transaction } from '../api/types'
import { formatCents, formatDate } from '../format'
import { useDeleteTransaction, useDismissInsight } from '../hooks/useHome'
import type { Messages } from '../i18n/en'
import { errorText } from '../i18n/errorText'
import { useI18n } from '../i18n/useI18n'
import { TransactionCard } from './TransactionCard'

const quietButtonClass =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'

const confirmDelete = (t: Messages, txn: Transaction) =>
  window.confirm(
    t.insights.confirmDelete(
      txn.item,
      formatCents(txn.amountCents, txn.currency),
      formatDate(txn.date),
    ),
  )

interface Wording {
  title: string
  body: string
  /** Opens the transactions behind the card. */
  view: string
  dismiss: string
}

/** ledger-api sends facts; the words are written here, so only stored text keeps its language. */
function wordingFor(t: Messages, insight: Insight, today: string): Wording {
  switch (insight.type) {
    case 'rego_due': {
      const due = formatDate(insight.estimatedDueDate)
      const [last] = insight.transactions
      return {
        title:
          insight.estimatedDueDate < today
            ? t.insights.regoWasDue(due)
            : t.insights.regoDue(due),
        body: t.insights.regoBody(
          formatCents(insight.lastPaidCents, insight.currency),
          formatDate(last.date),
        ),
        view: t.insights.viewPayment,
        dismiss: t.common.dismiss,
      }
    }
    case 'possible_duplicate': {
      const dates = [...new Set(insight.transactions.map((txn) => txn.date))]
      return {
        title: t.insights.duplicateTitle,
        body: t.insights.duplicateBody(
          insight.merchant,
          formatCents(insight.amountCents, insight.currency),
          insight.transactions.length,
          dates.map(formatDate),
        ),
        view: t.insights.review,
        dismiss: t.insights.notDuplicate,
      }
    }
    case 'price_rise':
      return {
        title: t.insights.priceRiseTitle(insight.merchant),
        body: t.insights.priceRiseBody(
          formatCents(insight.previousCents, insight.currency),
          formatCents(insight.currentCents, insight.currency),
          formatDate(insight.since),
          formatCents(insight.extraPerYearCents, insight.currency),
        ),
        view: t.insights.viewCharges,
        dismiss: t.common.dismiss,
      }
  }
}

function DuplicateReview({ insight }: { insight: PossibleDuplicate }) {
  const remove = useDeleteTransaction()
  const { t } = useI18n()

  return (
    <>
      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
        {insight.transactions.map((txn) => (
          <li
            key={txn.id}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{txn.item}</div>
              <div className="text-xs text-slate-500">
                {[txn.merchant, formatDate(txn.date)]
                  .filter(Boolean)
                  .join(t.common.separator)}
              </div>
            </div>
            <button
              type="button"
              aria-label={t.insights.deleteLabel(
                txn.item,
                formatDate(txn.date),
              )}
              disabled={remove.isPending}
              onClick={() => confirmDelete(t, txn) && remove.mutate(txn.id)}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {t.common.delete}
            </button>
          </li>
        ))}
      </ul>
      {remove.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errorText(t, remove.error)}
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
  const { t } = useI18n()
  const {
    title,
    body,
    view,
    dismiss: dismissLabel,
  } = wordingFor(t, insight, today)

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
          {errorText(t, dismiss.error)}
        </p>
      )}
      {open &&
        (insight.type === 'possible_duplicate' ? (
          <DuplicateReview insight={insight} />
        ) : (
          <TransactionCard kind="found" transactions={insight.transactions} />
        ))}
    </li>
  )
}
