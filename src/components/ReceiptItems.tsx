import type { Transaction } from '../api/types'
import { formatCents } from '../format'

const Row = ({
  label,
  cents,
  currency,
  testId,
}: {
  label: string
  cents: number
  currency: string
  testId: string
}) => (
  <div className="flex justify-between py-0.5" data-testid={testId}>
    <span>{label}</span>
    <span className="tabular-nums">{formatCents(cents, currency)}</span>
  </div>
)

/** What's on the receipt: names as printed, so they can be checked against the paper. */
export function ReceiptItems({ transaction }: { transaction: Transaction }) {
  const { currency, receipt } = transaction
  if (!receipt) return null
  const where = [receipt.location, receipt.time].filter(Boolean).join(' · ')

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      {where && (
        <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
          {where}
        </p>
      )}
      <ul aria-label="Receipt items" className="divide-y divide-slate-100">
        {receipt.lines?.map((line, i) => (
          <li key={i} className="flex justify-between gap-3 px-3 py-1.5">
            <span className="min-w-0 break-words text-slate-900">
              {line.name}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatCents(line.amountCents, currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
        <Row
          label="Receipt total"
          cents={receipt.totalCents}
          currency={currency}
          testId="receipt-total"
        />
        {!!receipt.gstCents && (
          <Row
            label="GST included"
            cents={receipt.gstCents}
            currency={currency}
            testId="receipt-gst"
          />
        )}
        {!!receipt.savingsCents && (
          <Row
            label="You saved"
            cents={receipt.savingsCents}
            currency={currency}
            testId="receipt-savings"
          />
        )}
      </div>
    </div>
  )
}
