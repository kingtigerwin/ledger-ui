import type { Transaction } from '../api/types'
import { capitalise, formatCents } from '../format'
import { useI18n } from '../i18n/useI18n'

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

/** What's on the receipt: plain names to read, over names as printed to check against the paper. */
export function ReceiptItems({ transaction }: { transaction: Transaction }) {
  const { currency, receipt } = transaction
  const { t } = useI18n()
  if (!receipt) return null
  const where = [receipt.location, receipt.time]
    .filter(Boolean)
    .join(t.common.separator)

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      {where && (
        <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
          {where}
        </p>
      )}
      <ul aria-label={t.receipts.items} className="divide-y divide-slate-100">
        {receipt.lines?.map((line, i) => (
          <li key={i} className="flex justify-between gap-3 px-3 py-1.5">
            <div className="min-w-0 break-words">
              <div className="text-slate-900">
                {capitalise(line.product ?? line.name)}
              </div>
              {line.product && (
                <div className="text-xs text-slate-500">{line.name}</div>
              )}
            </div>
            <span className="shrink-0 tabular-nums">
              {formatCents(line.amountCents, currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
        <Row
          label={t.receipts.receiptTotal}
          cents={receipt.totalCents}
          currency={currency}
          testId="receipt-total"
        />
        {!!receipt.gstCents && (
          <Row
            label={t.receipts.gst}
            cents={receipt.gstCents}
            currency={currency}
            testId="receipt-gst"
          />
        )}
        {!!receipt.savingsCents && (
          <Row
            label={t.receipts.saved}
            cents={receipt.savingsCents}
            currency={currency}
            testId="receipt-savings"
          />
        )}
      </div>
    </div>
  )
}
