import type { PurchaseSearch } from '../api/types'
import { capitalise, formatCents, formatDate } from '../format'

/** The lines ledger-api matched for "how much did I spend on bananas?". */
export function PurchaseCard({ search }: { search: PurchaseSearch }) {
  const { matches, count, totalCents, currency, includesPoints, from, to } =
    search
  if (matches.length === 0) return null

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700">
        {formatDate(from)} to {formatDate(to)}
      </div>
      <ul aria-label="Purchases found" className="divide-y divide-slate-100">
        {matches.map((match, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-medium break-words text-slate-900">
                {capitalise(match.product ?? match.name)}
              </div>
              <div className="text-xs text-slate-500">
                {[
                  match.product && match.name,
                  match.merchant,
                  formatDate(match.date),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <div className="shrink-0 font-medium tabular-nums">
              {formatCents(match.amountCents, currency)}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 font-semibold">
        <span>Total</span>
        <span className="tabular-nums" data-testid="purchases-total">
          {formatCents(totalCents, currency)}
        </span>
      </div>
      {count > matches.length && (
        <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
          Showing {matches.length} of {count}. The total covers them all.
        </p>
      )}
      {includesPoints && (
        <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
          These are shelf prices. Some was paid with points.
        </p>
      )}
    </div>
  )
}
