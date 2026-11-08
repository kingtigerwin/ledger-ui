import type {
  NewTransaction,
  ReadBill,
  ReadReceipt,
  ReceiptDetails,
} from '../api/types'
import { formatCents, formatDate } from '../format'
import type { Messages } from '../i18n/en'

/** Words saved with the transaction, so in the language it was recorded in. */
type StoredWords = Messages['receipts']['stored']

/** The fields a customer can correct. */
export interface ReceiptEntry {
  merchant: string
  date: string
  category: string
  amountCents: number
}

function itemOf({ lines }: ReadReceipt, words: StoredWords) {
  if (lines.length === 1) return lines[0].product ?? lines[0].name
  return lines.length > 1 ? words.items(lines.length) : words.receipt
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
  words: StoredWords,
): NewTransaction {
  const currency = 'AUD'
  const note = noteOf({ ...receipt, currency })
  return {
    id,
    ...entry,
    item: itemOf(receipt, words),
    currency,
    receipt: detailsOf(receipt),
    ...(note && { note }),
  }
}

/** A bill the customer says they've paid, dated the day they say so: the bill can't say when it was paid. */
export function billToNewTransaction(
  bill: ReadBill,
  id: string,
  date: string,
  words: StoredWords,
): NewTransaction {
  return {
    id,
    date,
    category: bill.category,
    item: bill.item ?? words.bill,
    amountCents: bill.amountCents,
    currency: 'AUD',
    ...(bill.biller && { merchant: bill.biller }),
    ...(bill.dueDate && { note: words.billDue(formatDate(bill.dueDate)) }),
  }
}
