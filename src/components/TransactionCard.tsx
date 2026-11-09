import { useState } from 'react'
import type { Transaction } from '../api/types'
import { formatCents, formatDate } from '../format'
import { useTransaction } from '../hooks/useTransaction'
import { useI18n } from '../i18n/useI18n'
import { ReceiptItems } from './ReceiptItems'

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

/** A receipt's lines, loaded when its row is opened: the agent's lists leave them out. */
function TransactionDetails({ transaction }: { transaction: Transaction }) {
  const full = useTransaction(transaction)
  const { t } = useI18n()

  if (full.isPending) {
    return <p className="px-3 pb-2 text-slate-400">{t.common.loading}</p>
  }
  if (full.isError) {
    return (
      <p role="alert" className="px-3 pb-2 text-red-700">
        {t.transactions.couldntLoadItems}{' '}
        <button
          type="button"
          onClick={() => full.refetch()}
          className="underline"
        >
          {t.common.tryAgain}
        </button>
      </p>
    )
  }
  return (
    <div className="px-3 pb-2">
      <ReceiptItems transaction={full.data} />
    </div>
  )
}

export function TransactionCard({ kind, transactions }: TransactionCardProps) {
  const [openId, setOpenId] = useState<string | null>(null)
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
        {transactions.map((txn) => {
          // Where a receipt was just recorded, its lines are already shown under the card.
          const opens = kind === 'found' && !!txn.receipt
          const open = openId === txn.id
          const row = (
            <>
              <span className="min-w-0">
                <span className="block font-medium text-slate-900">
                  {opens && (
                    <span aria-hidden="true" className="mr-1 text-slate-400">
                      {open ? '▾' : '▸'}
                    </span>
                  )}
                  {txn.item}
                </span>
                <span className="block text-xs text-slate-500">
                  {[
                    showOwners && ownerName(txn),
                    t.categories[txn.category] ?? txn.category,
                    txn.merchant,
                    formatDate(txn.date),
                  ]
                    .filter(Boolean)
                    .join(t.common.separator)}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCents(txn.amountCents, txn.currency)}
              </span>
            </>
          )
          const rowClass = 'flex items-start justify-between gap-3 px-3 py-2'
          return (
            <li key={txn.id}>
              {opens ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : txn.id)}
                  className={`${rowClass} w-full text-left hover:bg-slate-50`}
                >
                  {row}
                </button>
              ) : (
                <div className={rowClass}>{row}</div>
              )}
              {open && <TransactionDetails transaction={txn} />}
            </li>
          )
        })}
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
