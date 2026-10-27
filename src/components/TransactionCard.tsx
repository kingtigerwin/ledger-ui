import type { Transaction } from '../api/types'
import { formatCents, formatDate } from '../format'

interface TransactionCardProps {
  title: 'Recorded' | 'Found'
  transactions: Transaction[]
}

export function TransactionCard({ title, transactions }: TransactionCardProps) {
  const currency = transactions[0]?.currency ?? 'AUD'
  const total = transactions.reduce((sum, t) => sum + t.amountCents, 0)
  const headerClass =
    title === 'Recorded'
      ? 'bg-emerald-50 text-emerald-800'
      : 'bg-slate-50 text-slate-700'

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div
        className={`flex items-center gap-2 border-b border-slate-200 px-3 py-2 font-medium ${headerClass}`}
      >
        {title === 'Recorded' && <span aria-hidden="true">✓</span>}
        {title}
      </div>
      <ul className="divide-y divide-slate-100">
        {transactions.map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{t.item}</div>
              <div className="text-xs text-slate-500">
                {[t.category, t.merchant, formatDate(t.date)]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <div className="shrink-0 font-medium tabular-nums">
              {formatCents(t.amountCents, t.currency)}
            </div>
          </li>
        ))}
      </ul>
      {transactions.length > 1 && (
        <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums" data-testid="transaction-total">
            {formatCents(total, currency)}
          </span>
        </div>
      )}
    </div>
  )
}
