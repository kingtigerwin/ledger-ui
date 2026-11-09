import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ChatRequest } from '../api/types'
import {
  endSession,
  expireAccessTokens,
  seedTransaction,
} from '../mocks/handlers'
import { server } from '../mocks/server'
import { renderApp, signIn } from '../test/renderApp'
import { en } from '../i18n/en'

async function openChat() {
  const app = renderApp('/login')
  await signIn(app.user, 'alice', 'alice-password')
  await app.user.click(await screen.findByRole('link', { name: 'Chat' }))
  return {
    ...app,
    input: await screen.findByLabelText(/describe your spending/i),
  }
}

describe('given alice on the chat page', () => {
  it('disables Send when the input is empty', async () => {
    const { user, input } = await openChat()
    const send = screen.getByRole('button', { name: /send/i })
    expect(send).toBeDisabled()
    await user.type(input, '   ')
    expect(send).toBeDisabled()
  })

  it('records an expense and shows it', async () => {
    const { user, input } = await openChat()
    await user.type(input, 'Coffee at Starbucks for $5{Enter}')

    const log = screen.getByRole('log')
    expect(within(log).getByText(/coffee at starbucks/i)).toBeInTheDocument()
    expect(await screen.findByText('Recorded $5.00.')).toBeInTheDocument()
    expect(screen.getByText('Recorded')).toBeInTheDocument()
    expect(screen.getByText('$5.00')).toBeInTheDocument()
  })

  it('shows a monthly summary', async () => {
    const { user, input } = await openChat()
    await user.type(input, 'Cake for 30 dollars{Enter}')
    await screen.findByText('Recorded $30.00.')
    await user.type(
      screen.getByLabelText(/describe your spending/i),
      'How much have I spent this month?{Enter}',
    )
    expect(await screen.findByTestId('summary-total')).toHaveTextContent(
      '$30.00',
    )
  })

  it('sends the conversation so far, with the time zone', async () => {
    const requests: ChatRequest[] = []
    server.events.on('request:start', async ({ request }) => {
      if (request.url.endsWith('/agent/v1/chat')) {
        requests.push((await request.clone().json()) as ChatRequest)
      }
    })
    const { user, input } = await openChat()
    await user.type(input, 'I bought lunch{Enter}')
    await screen.findByText(/how much did you spend/i)
    await user.type(
      screen.getByLabelText(/describe your spending/i),
      '$12{Enter}',
    )
    await screen.findByText('Recorded $12.00.')

    expect(requests.at(-1)?.messages).toEqual([
      { role: 'user', content: 'I bought lunch' },
      { role: 'assistant', content: 'How much did you spend, and on what?' },
      { role: 'user', content: '$12' },
    ])
    expect(requests.at(-1)?.timeZone).toBeTruthy()
    server.events.removeAllListeners()
  })

  it('gets a new access token when the old one has expired', async () => {
    const { user, input } = await openChat()
    expireAccessTokens()
    await user.type(input, 'Spent $6 on coffee{Enter}')
    expect(await screen.findByText('Recorded $6.00.')).toBeInTheDocument()
  })

  it('goes back to the login page when the session has ended', async () => {
    const { user, input } = await openChat()
    expireAccessTokens()
    endSession()
    await user.type(input, 'Spent $6 on coffee{Enter}')
    expect(
      await screen.findByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument()
  })

  it('shows an error and recovers on retry', async () => {
    server.use(
      http.post(
        '*/agent/v1/chat',
        () =>
          HttpResponse.json(
            { error: { code: 'unavailable', message: 'Try again shortly' } },
            { status: 503 },
          ),
        { once: true },
      ),
    )
    const { user, input } = await openChat()
    await user.type(input, 'Spent $6 on coffee{Enter}')

    expect(await screen.findByText('Try again shortly')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Recorded $6.00.')).toBeInTheDocument()
    expect(screen.queryByText('Try again shortly')).toBeNull()
    expect(screen.getAllByText('Spent $6 on coffee')).toHaveLength(1)
  })

  it('tells them about the daily limit, before and during a chat', async () => {
    const { user, input } = await openChat()
    expect(screen.getByText(/5 messages a day/i)).toBeInTheDocument()
    await user.type(input, 'Spent $6 on coffee{Enter}')
    await screen.findByText('Recorded $6.00.')
    expect(screen.getByText(/5 messages a day/i)).toBeInTheDocument()
  })

  it.each([
    ['daily_limit_reached', "You've used today's 5 messages."],
    ['daily_total_reached', 'The chat is very busy today.'],
  ])('explains %s, with nothing to retry', async (code, limit) => {
    server.use(
      http.post(
        '*/agent/v1/chat',
        () =>
          HttpResponse.json(
            { error: { code, message: limit } },
            { status: 429 },
          ),
        { once: true },
      ),
    )
    const { user, input } = await openChat()
    await user.type(input, 'Spent $6 on coffee{Enter}')

    expect(await screen.findByText(limit)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })

  it('fills the input when an example prompt is clicked', async () => {
    const { user, input } = await openChat()
    await user.click(screen.getByRole('button', { name: en.chat.examples[0] }))
    expect(input).toHaveValue(en.chat.examples[0])
  })

  it("doesn't list other people's transactions", async () => {
    seedTransaction('sisi', 1200)
    const { user, input } = await openChat()
    await user.type(input, "Show everyone's transactions{Enter}")
    expect(
      await screen.findByText('How much did you spend, and on what?'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Found')).toBeNull()
  })

  it('clears the conversation with New chat', async () => {
    const { user, input } = await openChat()
    await user.type(input, 'Spent $6 on coffee{Enter}')
    await screen.findByText('Recorded $6.00.')
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    expect(screen.getByText(/what did you spend today/i)).toBeInTheDocument()
  })
})

describe('given a question about something bought', () => {
  const found = (fields: object = {}) => ({
    matches: [
      {
        transactionId: 'a',
        date: '2026-11-01',
        merchant: 'Coles',
        name: 'BANANAS PERKG',
        product: 'bananas',
        amountCents: 284,
      },
      {
        transactionId: 'b',
        date: '2026-10-30',
        merchant: null,
        name: 'bananas',
        product: null,
        amountCents: 392,
      },
    ],
    count: 2,
    totalCents: 676,
    currency: 'AUD',
    includesPoints: false,
    from: '2026-10-01',
    to: '2026-11-01',
    ...fields,
  })

  async function ask(purchases: object[]) {
    server.use(
      http.post('*/agent/v1/chat', () =>
        HttpResponse.json({
          reply: 'You spent $6.76 on bananas.',
          transactions: [],
          listed: [],
          summaries: [],
          purchases,
        }),
      ),
    )
    const { user, input } = await openChat()
    await user.type(input, 'How much on bananas?{Enter}')
    await screen.findByText('You spent $6.76 on bananas.')
  }

  it('lists what matched, newest first, with the total', async () => {
    await ask([found()])

    const rows = screen.getByRole('list', { name: 'Purchases found' })
    expect(
      within(rows)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual([
      'BananasBANANAS PERKG · Coles · 1 Nov 2026$2.84',
      'Bananas30 Oct 2026$3.92',
    ])
    expect(screen.getByTestId('purchases-total')).toHaveTextContent('$6.76')
  })

  it('says what period it covered', async () => {
    await ask([found()])

    expect(screen.getByText('1 Oct 2026 to 1 Nov 2026')).toBeInTheDocument()
  })

  it('says when not every match is shown', async () => {
    await ask([found({ count: 140 })])

    expect(screen.getByText(/showing 2 of 140/i)).toBeInTheDocument()
  })

  it('stays quiet about that when they all are', async () => {
    await ask([found()])

    expect(screen.queryByText(/showing/i)).toBeNull()
  })

  it('says when these are shelf prices', async () => {
    await ask([found({ includesPoints: true })])

    expect(screen.getByText(/shelf prices/i)).toBeInTheDocument()
  })

  it('shows no table when nothing matched', async () => {
    await ask([found({ matches: [], count: 0, totalCents: 0 })])

    expect(screen.queryByRole('list', { name: 'Purchases found' })).toBeNull()
  })

  it('copes with an agent that sends no purchases', async () => {
    const { user, input } = await openChat()
    await user.type(input, 'Spent $6 on coffee{Enter}')

    expect(await screen.findByText('Recorded $6.00.')).toBeInTheDocument()
  })
})

describe('given sisi, an admin, on the chat page', () => {
  it("lists everyone's transactions with whose they are and subtotals", async () => {
    seedTransaction('alice', 500)
    seedTransaction('sisi', 1200)
    seedTransaction('alice', 3000)
    const app = renderApp('/login')
    await signIn(app.user, 'sisi', 'sisi-password')
    await app.user.click(await screen.findByRole('link', { name: 'Chat' }))
    await app.user.type(
      await screen.findByLabelText(/describe your spending/i),
      "Show everyone's transactions{Enter}",
    )

    expect(
      await screen.findByText("Here are everyone's transactions."),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/^alice · /)).toHaveLength(2)
    expect(screen.getAllByText(/^sisi · /)).toHaveLength(1)
    const subtotals = screen.getByRole('list', { name: /by person/i })
    expect(
      within(subtotals)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['alice$35.00', 'sisi$12.00'])
    expect(screen.getByTestId('transaction-total')).toHaveTextContent('$47.00')
  })
})

const scanned = {
  item: '2 items',
  merchant: 'Coles',
  receipt: {
    totalCents: 1200,
    location: 'Box Hill',
    lines: [
      {
        name: 'CLS CHKN DRUMSTICKS',
        product: 'chicken drumsticks',
        amountCents: 899,
      },
      { name: 'BANANAS', amountCents: 301 },
    ],
  },
}

describe('given a found transaction from a scanned receipt', () => {
  async function listOwn(listed: object[]) {
    server.use(
      http.post('*/agent/v1/chat', () =>
        HttpResponse.json({
          reply: 'Here are your transactions.',
          transactions: [],
          listed,
          summaries: [],
        }),
      ),
    )
    const { user, input } = await openChat()
    await user.type(input, 'What did I buy?{Enter}')
    await screen.findByText('Here are your transactions.')
    return user
  }

  it("shows the receipt's items when alice opens it", async () => {
    seedTransaction('alice', 1200, { id: 'txn-scanned', ...scanned })
    // The agent's lists leave the lines out, as ledger-api's MCP tools do.
    const user = await listOwn([
      {
        id: 'txn-scanned',
        date: '2026-10-27',
        category: 'groceries',
        amountCents: 1200,
        currency: 'AUD',
        ...scanned,
        receipt: { totalCents: 1200, location: 'Box Hill' },
      },
    ])

    const row = screen.getByRole('button', { name: /2 items/ })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    await user.click(row)

    const items = await screen.findByRole('list', { name: 'Receipt items' })
    expect(
      within(items)
        .getAllByRole('listitem')
        .map((line) => line.textContent),
    ).toEqual(['Chicken drumsticksCLS CHKN DRUMSTICKS$8.99', 'BANANAS$3.01'])
    expect(row).toHaveAttribute('aria-expanded', 'true')

    await user.click(row)
    expect(screen.queryByRole('list', { name: 'Receipt items' })).toBeNull()
  })

  it('offers to try again when the items fail to load', async () => {
    server.use(
      http.get('*/api/v1/transactions/:id', () =>
        HttpResponse.json(
          { error: { code: 'internal_error', message: 'boom' } },
          { status: 500 },
        ),
      ),
    )
    const user = await listOwn([
      {
        id: 'txn-scanned',
        date: '2026-10-27',
        category: 'groceries',
        amountCents: 1200,
        currency: 'AUD',
        ...scanned,
        receipt: { totalCents: 1200 },
      },
    ])

    await user.click(screen.getByRole('button', { name: /2 items/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/couldn't load the items/i)
    expect(
      within(alert).getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
  })

  it("doesn't offer to open a typed expense, which has no items", async () => {
    await listOwn([
      {
        id: 'txn-typed',
        date: '2026-10-27',
        category: 'dining',
        item: 'coffee',
        amountCents: 500,
        currency: 'AUD',
      },
    ])

    expect(screen.getByText('coffee')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /coffee/ })).toBeNull()
  })
})

describe('given sisi listing a customer receipt', () => {
  it("shows that customer's receipt items when she opens it", async () => {
    seedTransaction('alice', 1200, scanned)
    const app = renderApp('/login')
    await signIn(app.user, 'sisi', 'sisi-password')
    await app.user.click(await screen.findByRole('link', { name: 'Chat' }))
    await app.user.type(
      await screen.findByLabelText(/describe your spending/i),
      "Show everyone's transactions{Enter}",
    )
    await screen.findByText("Here are everyone's transactions.")

    await app.user.click(screen.getByRole('button', { name: /2 items/ }))

    const items = await screen.findByRole('list', { name: 'Receipt items' })
    expect(within(items).getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('given sisi on the chat page', () => {
  it('tells her about her higher daily limit', async () => {
    const app = renderApp('/login')
    await signIn(app.user, 'sisi', 'sisi-password')
    await app.user.click(await screen.findByRole('link', { name: 'Chat' }))

    expect(await screen.findByText(/30 messages a day/i)).toBeInTheDocument()
  })
})
