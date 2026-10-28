import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Transaction } from '../api/types'
import { TransactionCard } from './TransactionCard'

const txn = (fields: Partial<Transaction> & Pick<Transaction, 'id'>) => ({
  date: '2026-10-27',
  category: 'food',
  item: 'coffee',
  amountCents: 500,
  currency: 'AUD',
  ...fields,
})

describe('TransactionCard', () => {
  it('shows no owners or subtotals when no item has a username', () => {
    render(
      <TransactionCard
        title="Found"
        transactions={[
          txn({ id: 't1', merchant: 'Starbucks' }),
          txn({ id: 't2', item: 'cake', amountCents: 3000 }),
        ]}
      />,
    )
    expect(
      screen.getByText('food · Starbucks · 27 Oct 2026'),
    ).toBeInTheDocument()
    expect(screen.getByText('food · 27 Oct 2026')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /by person/i })).toBeNull()
    expect(screen.getByTestId('transaction-total')).toHaveTextContent('$35.00')
  })

  it('shows whose each item is, without subtotals, for one person', () => {
    render(
      <TransactionCard
        title="Found"
        transactions={[
          txn({ id: 't1', userId: 'u1', username: 'alice' }),
          txn({ id: 't2', userId: 'u1', username: 'alice', item: 'cake' }),
        ]}
      />,
    )
    expect(screen.getAllByText('alice · food · 27 Oct 2026')).toHaveLength(2)
    expect(screen.queryByRole('list', { name: /by person/i })).toBeNull()
  })

  it('adds a subtotal per person when more than one person appears', () => {
    render(
      <TransactionCard
        title="Found"
        transactions={[
          txn({ id: 't1', userId: 'u1', username: 'alice', amountCents: 500 }),
          txn({ id: 't2', userId: 'u2', username: 'sisi', amountCents: 1200 }),
          txn({ id: 't3', userId: 'u1', username: 'alice', amountCents: 3000 }),
        ]}
      />,
    )
    const subtotals = screen.getByRole('list', { name: /by person/i })
    const rows = within(subtotals).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      'alice$35.00',
      'sisi$12.00',
    ])
    expect(screen.getByTestId('transaction-total')).toHaveTextContent('$47.00')
  })

  it('labels items whose username is missing as an unknown user', () => {
    render(
      <TransactionCard
        title="Found"
        transactions={[
          txn({ id: 't1', userId: 'u1', username: 'alice' }),
          txn({ id: 't2', userId: 'u9', username: null }),
        ]}
      />,
    )
    expect(
      screen.getByText('Unknown user · food · 27 Oct 2026'),
    ).toBeInTheDocument()
    const subtotals = screen.getByRole('list', { name: /by person/i })
    expect(within(subtotals).getByText('Unknown user')).toBeInTheDocument()
  })
})
