import type {
  PossibleDuplicate,
  PriceRise,
  RegoDue,
  Transaction,
} from '../api/types'

const transaction = (
  id: string,
  date: string,
  amountCents: number,
  fields: Partial<Transaction> = {},
): Transaction => ({
  id,
  date,
  category: 'other',
  item: 'expense',
  amountCents,
  currency: 'AUD',
  ...fields,
})

export const regoDue: RegoDue = {
  id: 'aaaaaaaaaaaaaaa1',
  type: 'rego_due',
  estimatedDueDate: '2026-11-14',
  lastPaidCents: 89000,
  currency: 'AUD',
  transactions: [
    transaction('rego-1', '2025-11-14', 89000, {
      merchant: 'Service NSW',
      category: 'transport',
      item: 'car rego',
    }),
  ],
}

const groceries = { merchant: 'Coles', category: 'groceries', item: '菜' }

export const possibleDuplicate: PossibleDuplicate = {
  id: 'aaaaaaaaaaaaaaa2',
  type: 'possible_duplicate',
  merchant: 'Coles',
  amountCents: 4520,
  currency: 'AUD',
  transactions: [
    transaction('dup-1', '2026-10-30', 4520, groceries),
    transaction('dup-2', '2026-10-31', 4520, groceries),
  ],
}

const netflix = {
  merchant: 'Netflix',
  category: 'entertainment',
  item: 'subscription',
}

export const priceRise: PriceRise = {
  id: 'aaaaaaaaaaaaaaa3',
  type: 'price_rise',
  merchant: 'Netflix',
  previousCents: 1699,
  currentCents: 2099,
  since: '2026-10-03',
  cadence: 'monthly',
  extraPerYearCents: 4800,
  currency: 'AUD',
  transactions: [
    transaction('netflix-3', '2026-10-03', 2099, netflix),
    transaction('netflix-2', '2026-09-03', 1699, netflix),
    transaction('netflix-1', '2026-08-03', 1699, netflix),
  ],
}
