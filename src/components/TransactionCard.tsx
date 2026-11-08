import type { Transaction } from '../api/types'
import { formatCents, formatDate } from '../format'
import { useI18n } from '../i18n/useI18n'

interface TransactionCardProps {
  kind: 'recorded' | 'found'
  transactions: Transaction[]
}

/** Totals per owner, in order of first appearance. */
function subtotalsByOwner(
  transactions: Transaction[],
  ownerName: (txn: Transaction) => string,
) {
  const subtotals = new Map<string, { name: string; totalCents: number }>()
  for (const txn of transactions) {
    const key = txn.userId ?? txn.username ?? ''
    const entry = subtotals.get(key) ?? { name: ownerName(txn), totalCents: 0 }
    entry.totalCents += txn.amountCents
    subtotals.set(key, entry)
  }
  return [...subtotals.values()]
}

export function TransactionCard({ kind, transactions }: TransactionCardProps) {
  const { t } = useI18n()
  const ownerName = (txn: Transaction) =>
    txn.username ?? t.transactions.unknownUser
  const currency = transactions[0]?.currency ?? 'AUD'
  const total = transactions.reduce((sum, txn) => sum + txn.amountCents, 0)
  const showOwners = transactions.some((txn) => txn.username)
  const subtotals = showOwners ? subtotalsByOwner(transactions, ownerName) : []
  const headerClass =
    kind === 'recorded'
      ? 'bg-emerald-50 text-emerald-800'
      : 'bg-slate-50 text-slate-700'

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div
        className={`flex items-center gap-2 border-b border-slate-200 px-3 py-2 font-medium ${headerClass}`}
      >
        {kind === 'recorded' && <span aria-hidden="true">✓</span>}
        {t.transactions[kind]}
      </div>
      <ul className="divide-y divide-slate-100">
        {transactions.map((txn) => (
          <li
            key={txn.id}
            className="flex items-start justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{txn.item}</div>
              <div className="text-xs text-slate-500">
                {[
                  showOwners && ownerName(txn),
                  t.categories[txn.category] ?? txn.category,
                  txn.merchant,
                  formatDate(txn.date),
                ]
                  .filter(Boolean)
                  .join(t.common.separator)}
              </div>
            </div>
            <div className="shrink-0 font-medium tabular-nums">
              {formatCents(txn.amountCents, txn.currency)}
            </div>
          </li>
        ))}
      </ul>
      {subtotals.length > 1 && (
        <ul
          aria-label={t.transactions.subtotals}
          className="border-t border-slate-200 bg-slate-50 px-3 py-1"
        >
          {subtotals.map(({ name, totalCents }, i) => (
            <li key={i} className="flex justify-between py-1 text-slate-700">
              <span>{name}</span>
              <span className="tabular-nums">
                {formatCents(totalCents, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {transactions.length > 1 && (
        <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 font-semibold">
          <span>{t.common.total}</span>
          <span className="tabular-nums" data-testid="transaction-total">
            {formatCents(total, currency)}
          </span>
        </div>
      )}
    </div>
  )
}
