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
import { EXAMPLE_PROMPTS } from '../constants'

async function openChat() {
  const app = renderApp('/login')
  await signIn(app.user, 'alice', 'alice-password')
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

  it("explains the daily limit once it's reached, with nothing to retry", async () => {
    const limit = "You've used today's 5 messages."
    server.use(
      http.post(
        '*/agent/v1/chat',
        () =>
          HttpResponse.json(
            { error: { code: 'daily_limit_reached', message: limit } },
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
    await user.click(screen.getByRole('button', { name: EXAMPLE_PROMPTS[0] }))
    expect(input).toHaveValue(EXAMPLE_PROMPTS[0])
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

describe('given sisi, an admin, on the chat page', () => {
  it("lists everyone's transactions with whose they are and subtotals", async () => {
    seedTransaction('alice', 500)
    seedTransaction('sisi', 1200)
    seedTransaction('alice', 3000)
    const app = renderApp('/login')
    await signIn(app.user, 'sisi', 'sisi-password')
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
