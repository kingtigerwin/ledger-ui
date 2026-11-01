import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { ReceiptProblem, Transaction } from '../api/types'
import { CATEGORIES } from '../constants'
import { formatCents } from '../format'
import { useReceipts } from '../hooks/useReceipts'
import type { ReceiptEntry } from '../receipts/toTransaction'
import { ReceiptItems } from './ReceiptItems'
import { TransactionCard } from './TransactionCard'
import { WaitingModal } from './WaitingModal'

const PROBLEMS: Partial<Record<ReceiptProblem, string>> = {
  merchant_unreadable: "The merchant couldn't be read.",
  date_unreadable: "The date couldn't be read.",
  date_in_future: 'The date is in the future.',
  date_too_old: 'The date is over a year old.',
  lines_dont_add_up: "The lines don't add up to the total.",
  payments_dont_add_up: "The payments don't add up to the total.",
}

const ALREADY_RECORDED =
  'This looks already recorded: there is a transaction with the same amount or receipt number that day.'

const quietButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50'
const fieldClass =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

/** "12.34" → 1234; null unless it's an amount above zero with at most two decimals. */
function parseCents(text: string): number | null {
  const match = text.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return cents > 0 ? cents : null
}

interface ReceiptFormProps {
  initial: ReceiptEntry
  warnings: string[]
  onSave: (entry: ReceiptEntry) => void
  onCancel: () => void
}

function ReceiptForm({
  initial,
  warnings,
  onSave,
  onCancel,
}: ReceiptFormProps) {
  const [merchant, setMerchant] = useState(initial.merchant)
  const [date, setDate] = useState(initial.date)
  const [category, setCategory] = useState(initial.category)
  const [amount, setAmount] = useState(
    initial.amountCents ? (initial.amountCents / 100).toFixed(2) : '',
  )
  const amountCents = parseCents(amount)
  const canSave = merchant.trim() !== '' && date !== '' && amountCents !== null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (canSave) {
      onSave({ merchant: merchant.trim(), date, category, amountCents })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {warnings.length > 0 && (
        <div role="alert" className="mb-3 text-sm text-red-700">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          Merchant
          <input
            value={merchant}
            maxLength={100}
            onChange={(e) => setMerchant(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-slate-600">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-slate-600">
          Amount paid
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-slate-600">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${fieldClass} capitalize`}
          >
            {CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={quietButtonClass}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Save
        </button>
      </div>
    </form>
  )
}

function Recorded({
  transaction,
  onUndo,
  onEdit,
}: {
  transaction: Transaction
  onUndo: () => void
  onEdit: () => void
}) {
  const { amountCents, currency, merchant, receipt } = transaction
  const points = receipt?.payments?.filter((p) => p.kind === 'points') ?? []

  return (
    <div>
      <div role="status" className="text-sm text-slate-700">
        <p>
          Recorded {formatCents(amountCents, currency)}
          {merchant && ` at ${merchant}`}.
        </p>
        {points.map((p) => (
          <p key={p.label} className="text-slate-500">
            {p.label} paid {formatCents(p.amountCents, currency)}.
          </p>
        ))}
      </div>
      <TransactionCard title="Recorded" transactions={[transaction]} />
      <ReceiptItems transaction={transaction} />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onEdit} className={quietButtonClass}>
          Edit
        </button>
        <button type="button" onClick={onUndo} className={quietButtonClass}>
          Undo
        </button>
      </div>
    </div>
  )
}

export function ReceiptScanner() {
  const { stage, scan, saveReview, saveEdit, undo, edit, cancelEdit, close } =
    useReceipts()
  const busy = stage.name === 'reading'

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Cleared so choosing the same photo again still fires a change.
    event.target.value = ''
    if (file) scan(file)
  }

  const photoButtonClass = `${quietButtonClass} ${busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} focus-within:ring-2 focus-within:ring-indigo-200`

  return (
    <section className="flex flex-col gap-3" aria-label="Scan a receipt">
      <div className="flex flex-wrap items-center gap-2">
        <label className={photoButtonClass}>
          Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={handleFile}
            className="sr-only"
          />
        </label>
        <label className={photoButtonClass}>
          Upload photo
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={handleFile}
            className="sr-only"
          />
        </label>
        <span className="text-sm text-slate-500">of a receipt</span>
      </div>

      {stage.name === 'reading' && (
        <WaitingModal message="Your receipt is uploading, please wait…" />
      )}
      {stage.name === 'failed' && (
        <p role="alert" className="text-sm text-red-700">
          {stage.message}
        </p>
      )}
      {stage.name === 'recorded' && (
        <Recorded transaction={stage.transaction} onUndo={undo} onEdit={edit} />
      )}
      {stage.name === 'review' && (
        <ReceiptForm
          key={stage.id}
          initial={stage.entry}
          warnings={[
            ...(stage.alreadyRecorded ? [ALREADY_RECORDED] : []),
            ...stage.problems.flatMap((p) => PROBLEMS[p] ?? []),
            ...(stage.saveError ? [stage.saveError] : []),
          ]}
          onSave={saveReview}
          onCancel={close}
        />
      )}
      {stage.name === 'editing' && (
        <ReceiptForm
          key={stage.transaction.id}
          initial={{
            merchant: stage.transaction.merchant ?? '',
            date: stage.transaction.date,
            category: stage.transaction.category,
            amountCents: stage.transaction.amountCents,
          }}
          warnings={stage.saveError ? [stage.saveError] : []}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      )}
    </section>
  )
}
