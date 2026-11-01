import type { NewTransaction, ReadReceipt, ReceiptDetails } from '../api/types'
import { formatCents } from '../format'

/** The fields a customer can correct. */
export interface ReceiptEntry {
  merchant: string
  date: string
  category: string
  amountCents: number
}

function itemOf({ lines }: ReadReceipt) {
  if (lines.length === 1) return lines[0].product ?? lines[0].name
  return lines.length > 1 ? `${lines.length} items` : 'Receipt'
}

function noteOf({ payments, currency }: ReadReceipt & { currency: string }) {
  return payments
    .filter((p) => p.kind === 'points')
    .map((p) => `${p.label}: ${formatCents(p.amountCents, currency)}`)
    .join('; ')
}

/** What was printed: ledger-api refuses a null, so anything missing stays out. */
function detailsOf(receipt: ReadReceipt): ReceiptDetails {
  const printed = {
    gstCents: receipt.gstCents,
    savingsCents: receipt.savingsCents,
    time: receipt.time,
    location: receipt.location,
    receiptNumber: receipt.receiptNumber,
    abn: receipt.abn,
  }
  return {
    totalCents: receipt.totalCents,
    lines: receipt.lines,
    payments: receipt.payments,
    ...Object.fromEntries(
      Object.entries(printed).filter(([, value]) => value !== null),
    ),
  }
}

export function toNewTransaction(
  receipt: ReadReceipt,
  entry: ReceiptEntry,
  id: string,
): NewTransaction {
  const currency = 'AUD'
  const note = noteOf({ ...receipt, currency })
  return {
    id,
    ...entry,
    item: itemOf(receipt),
    currency,
    receipt: detailsOf(receipt),
    ...(note && { note }),
  }
}
