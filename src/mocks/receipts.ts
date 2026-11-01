import type { ReadReceipt, ReadReceiptResponse } from '../api/types'

export const flybuysReceipt: ReadReceipt = {
  merchant: 'Coles',
  date: '2026-10-27',
  category: 'groceries',
  paidCents: 50,
  totalCents: 3050,
  gstCents: 0,
  savingsCents: 3100,
  time: '15:06',
  location: 'The Glen',
  receiptNumber: '6547',
  abn: '45004189708',
  lines: [
    { name: 'PI PERFECT BAKES 450', product: 'pasta bake', amountCents: 850 },
    { name: 'COLES BEEF MINCE 4ST', product: 'beef mince', amountCents: 1550 },
    { name: 'CLS CHICKEN MINCE', product: 'chicken mince', amountCents: 650 },
  ],
  payments: [
    { label: 'Flybuys value redeemed', kind: 'points', amountCents: 3000 },
    { label: 'EFT', kind: 'money', amountCents: 50 },
  ],
}

export const oneLineReceipt: ReadReceipt = {
  merchant: 'Fish Pier',
  date: '2026-10-27',
  category: 'groceries',
  paidCents: 1774,
  totalCents: 1774,
  gstCents: 0,
  savingsCents: null,
  time: '14:19',
  location: 'The Glen',
  receiptNumber: null,
  abn: '13666733553',
  lines: [{ name: 'B.BARRAMUNDI', product: 'barramundi', amountCents: 1774 }],
  payments: [{ label: 'EFTPOS', kind: 'money', amountCents: 1774 }],
}

export const readReply = (
  fields: Partial<ReadReceiptResponse> = {},
): ReadReceiptResponse => ({
  receipt: flybuysReceipt,
  problems: [],
  canRecord: true,
  ...fields,
})
