import { describe, expect, it } from 'vitest'
import { flybuysReceipt, oneLineReceipt } from '../mocks/receipts'
import { fitWithin } from './shrinkImage'
import { en } from '../i18n/en'
import { toNewTransaction } from './toTransaction'

const STORED = en.receipts.stored

const entry = {
  merchant: 'Coles',
  date: '2026-11-01',
  category: 'groceries',
  amountCents: 50,
}

describe('given a read receipt', () => {
  it('records the money paid, with the goods value kept on the receipt', () => {
    const t = toNewTransaction(flybuysReceipt, entry, 'id-1', STORED)

    expect(t.id).toBe('id-1')
    expect(t.amountCents).toBe(50)
    expect(t.currency).toBe('AUD')
    expect(t.receipt?.totalCents).toBe(3050)
  })

  it('counts the lines as the item', () => {
    expect(toNewTransaction(flybuysReceipt, entry, 'x', STORED).item).toBe(
      '3 items',
    )
  })

  it('names a single line as the item, in plain words', () => {
    expect(toNewTransaction(oneLineReceipt, entry, 'x', STORED).item).toBe(
      'barramundi',
    )
  })

  it('notes what points paid', () => {
    expect(toNewTransaction(flybuysReceipt, entry, 'x', STORED).note).toBe(
      'Flybuys value redeemed: $30.00',
    )
  })

  it('has no note when only money was paid', () => {
    expect(
      toNewTransaction(oneLineReceipt, entry, 'x', STORED),
    ).not.toHaveProperty('note')
  })

  it('leaves out what was not printed, which the API would refuse', () => {
    const { receipt } = toNewTransaction(oneLineReceipt, entry, 'x', STORED)

    expect(receipt).not.toHaveProperty('savingsCents')
    expect(receipt).not.toHaveProperty('receiptNumber')
    expect(receipt?.gstCents).toBe(0)
  })

  it('never carries the fields that belong to the transaction', () => {
    const { receipt } = toNewTransaction(flybuysReceipt, entry, 'x', STORED)

    expect(receipt).not.toHaveProperty('merchant')
    expect(receipt).not.toHaveProperty('paidCents')
  })

  it('takes what the customer corrected', () => {
    const t = toNewTransaction(
      flybuysReceipt,
      { ...entry, merchant: 'Woolworths', amountCents: 75 },
      'x',
      STORED,
    )

    expect(t.merchant).toBe('Woolworths')
    expect(t.amountCents).toBe(75)
  })
})

describe('given a photo to shrink', () => {
  it.each([
    [3000, 4000, 1568, 1176, 1568],
    [4000, 3000, 1568, 1568, 1176],
    [500, 700, 1568, 500, 700],
  ])('fits %ix%i within %i', (w, h, max, width, height) => {
    expect(fitWithin(w, h, max)).toEqual({ width, height })
  })
})
