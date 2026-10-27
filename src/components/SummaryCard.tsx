import type { MonthlySummary } from '../api/types'
import { formatCents, formatMonth } from '../format'

export function SummaryCard({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700">
        <span>{formatMonth(summary.month)}</span>
        <span className="tabular-nums" data-testid="summary-total">
          {formatCents(summary.totalCents, summary.currency)}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {summary.byCategory.map(({ category, totalCents }) => (
          <li key={category} className="flex justify-between px-3 py-2">
            <span className="capitalize">{category}</span>
            <span className="tabular-nums">
              {formatCents(totalCents, summary.currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
