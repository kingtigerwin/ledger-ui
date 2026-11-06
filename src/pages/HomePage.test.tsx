import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDate, localMonth } from '../format'
import { seedInsight, seedTransaction } from '../mocks/handlers'
import { possibleDuplicate, priceRise, regoDue } from '../mocks/insights'
import { server } from '../mocks/server'
import { renderApp, signIn } from '../test/renderApp'

async function openHome(username = 'alice') {
  const app = renderApp('/login')
  await signIn(app.user, username, `${username}-password`)
  await screen.findByRole('heading', { name: /^good/i })
  return app
}

const card = (title: RegExp) => {
  const heading = screen.getByRole('heading', { name: title })
  return within(heading.closest('li') as HTMLElement)
}

describe('given alice on the Home page', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is where signing in lands, and every tab is reachable', async () => {
    await openHome()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Chat' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
  })

  it('greets her by name', async () => {
    await openHome()
    expect(
      screen.getByRole('heading', {
        name: /^good (morning|afternoon|evening), alice$/i,
      }),
    ).toBeInTheDocument()
  })

  describe('this month’s spend', () => {
    it('shows the total, and the categories when opened', async () => {
      seedTransaction('alice', 12345)
      const { user } = await openHome()

      const total = await screen.findByRole('button', { name: /\$123\.45/ })
      expect(screen.queryByTestId('summary-total')).toBeNull()
      await user.click(total)

      expect(screen.getByTestId('summary-total')).toHaveTextContent('$123.45')
    })

    describe('given spending in several categories', () => {
      const month = localMonth(new Date())
      const lastDay = new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)),
        0,
      ).getDate()

      function seedMonth() {
        seedTransaction('alice', 58300, {
          date: `${month}-01`,
          category: 'utilities',
          item: 'council rates',
          merchant: 'Whitehorse City Council',
        })
        seedTransaction('alice', 1, {
          date: `${month}-02`,
          category: 'utilities',
          item: 'test',
        })
        seedTransaction('alice', 41699, {
          date: `${month}-03`,
          category: 'dining',
          item: 'dinner',
          merchant: 'Nando’s',
        })
      }

      async function openCategories() {
        seedMonth()
        const app = await openHome()
        await app.user.click(
          await screen.findByRole('button', { name: /\$1,000\.00/ }),
        )
        return app
      }

      it('says how many items make up each one, and its share of the month', async () => {
        await openCategories()

        expect(
          screen.getByRole('button', { name: /utilities/i }),
        ).toHaveTextContent('Utilities$583.012 items · 58%')
        expect(
          screen.getByRole('button', { name: /dining/i }),
        ).toHaveTextContent('Dining$416.991 item · 42%')
      })

      it('lists what is in a category when it is opened', async () => {
        const { user } = await openCategories()

        await user.click(screen.getByRole('button', { name: /utilities/i }))

        const list = await screen.findByRole('list', {
          name: 'Utilities transactions',
        })
        expect(
          within(list)
            .getAllByRole('listitem')
            .map((row) => row.textContent),
        ).toEqual([
          `test${formatDate(`${month}-02`)}$0.01`,
          `council ratesWhitehorse City Council · ${formatDate(`${month}-01`)}$583.00`,
        ])
      })

      it('shows one category at a time, and closes it on a second tap', async () => {
        const { user } = await openCategories()
        const utilities = screen.getByRole('button', { name: /utilities/i })

        await user.click(utilities)
        await screen.findByRole('list', { name: 'Utilities transactions' })
        await user.click(screen.getByRole('button', { name: /dining/i }))

        expect(
          await screen.findByRole('list', { name: 'Dining transactions' }),
        ).toHaveTextContent('dinner')
        expect(
          screen.queryByRole('list', { name: 'Utilities transactions' }),
        ).toBeNull()
        expect(utilities).toHaveAttribute('aria-expanded', 'false')

        await user.click(screen.getByRole('button', { name: /dining/i }))
        expect(
          screen.queryByRole('list', { name: 'Dining transactions' }),
        ).toBeNull()
      })

      it('asks for only that category, over the whole month', async () => {
        const urls: string[] = []
        server.events.on('request:start', ({ request }) => {
          urls.push(request.url)
        })
        const { user } = await openCategories()

        await user.click(screen.getByRole('button', { name: /utilities/i }))
        await screen.findByRole('list', { name: 'Utilities transactions' })
        server.events.removeAllListeners()

        const list = urls
          .map((url) => new URL(url))
          .find((url) => url.pathname === '/api/v1/transactions')
        expect(Object.fromEntries(list?.searchParams ?? [])).toMatchObject({
          category: 'utilities',
          from: `${month}-01`,
          to: `${month}-${lastDay}`,
        })
      })

      it('leaves out the count when ledger-api does not send one', async () => {
        server.use(
          http.get('*/api/v1/transactions/summary', () =>
            HttpResponse.json({
              month,
              currency: 'AUD',
              totalCents: 1000,
              byCategory: [{ category: 'dining', totalCents: 1000 }],
            }),
          ),
        )
        const { user } = await openHome()

        await user.click(
          await screen.findByRole('button', { name: /\$10\.00/ }),
        )

        expect(
          screen.getByRole('button', { name: /dining/i }),
        ).toHaveTextContent('Dining$10.00100%')
      })
    })

    it("doesn't count anyone else's spending", async () => {
      seedTransaction('sisi', 500)
      await openHome()
      expect(await screen.findByTestId('spend-total')).toBeInTheDocument()
    })

    it('asks for the month and day where the customer is', async () => {
      const urls: string[] = []
      server.events.on('request:start', ({ request }) => {
        urls.push(request.url)
      })
      await openHome()
      await screen.findByTestId('spend-total')
      server.events.removeAllListeners()

      expect(urls.join()).toMatch(/summary\?month=\d{4}-\d{2}(,|$)/)
      expect(urls.join()).toMatch(/insights\?today=\d{4}-\d{2}-\d{2}(,|$)/)
    })

    describe('with nothing recorded yet this month', () => {
      const summaryOf = (lastMonthCents: number) =>
        http.get('*/api/v1/transactions/summary', ({ request }) => {
          const month = new URL(request.url).searchParams.get('month') ?? ''
          const thisMonth = month === localMonth(new Date())
          const totalCents = thisMonth ? 0 : lastMonthCents
          return HttpResponse.json({
            month,
            currency: 'AUD',
            totalCents,
            byCategory: [],
          })
        })

      it('says so and shows last month, with nothing to open', async () => {
        server.use(summaryOf(68600))
        await openHome()

        expect(
          await screen.findByText(/nothing recorded yet this month/i),
        ).toBeInTheDocument()
        expect(await screen.findByText(/: \$686\.00/)).toBeInTheDocument()
        expect(screen.queryByText('by category')).toBeNull()
      })

      it('leaves last month out when that was empty too', async () => {
        server.use(summaryOf(0))
        await openHome()

        expect(
          await screen.findByText(/^nothing recorded yet this month$/i),
        ).toBeInTheDocument()
      })
    })

    it('asks for last month only when this month is empty', async () => {
      seedTransaction('alice', 500)
      const urls: string[] = []
      server.events.on('request:start', ({ request }) => {
        if (request.url.includes('/summary')) urls.push(request.url)
      })
      await openHome()
      await screen.findByRole('button', { name: /\$5\.00/ })
      server.events.removeAllListeners()

      expect(new Set(urls).size).toBe(1)
    })

    it('still shows the cards when the total fails', async () => {
      seedInsight('alice', regoDue)
      server.use(
        http.get('*/api/v1/transactions/summary', () =>
          HttpResponse.json({}, { status: 500 }),
        ),
      )
      await openHome()

      expect(
        await screen.findByRole('heading', { name: /car rego/i }),
      ).toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent(/spend/i)
    })
  })

  describe('with nothing needing attention', () => {
    it('says so, hides the count and suggests adding past expenses', async () => {
      await openHome()

      expect(
        await screen.findByText(/nothing needs your attention/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/last november/i)).toBeInTheDocument()
      expect(screen.queryByText('To review')).toBeNull()
    })
  })

  describe('with cards', () => {
    it('counts however many there are, in the order they came', async () => {
      seedInsight('alice', regoDue)
      seedInsight('alice', possibleDuplicate)
      seedInsight('alice', priceRise)
      await openHome()

      const list = await screen.findByRole('list', {
        name: /needs your attention/i,
      })
      expect(
        within(list)
          .getAllByRole('heading')
          .map((h) => h.textContent),
      ).toEqual([
        'Car rego due around 14 Nov 2026',
        'Possibly recorded twice',
        'Netflix went up',
      ])
      expect(screen.getByTestId('to-review')).toHaveTextContent('3')
    })

    it('still shows the total when the cards fail', async () => {
      seedTransaction('alice', 500)
      server.use(
        http.get('*/api/v1/insights', () =>
          HttpResponse.json({}, { status: 500 }),
        ),
      )
      await openHome()

      expect(
        await screen.findByRole('button', { name: /\$5\.00/ }),
      ).toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent(/attention/i)
    })

    it('says a rego estimated in the past may be overdue', async () => {
      seedInsight('alice', { ...regoDue, estimatedDueDate: '2000-01-01' })
      await openHome()

      expect(
        await screen.findByRole('heading', { name: /was due around/i }),
      ).toBeInTheDocument()
    })

    it('explains a price rise and shows its charges in place', async () => {
      seedInsight('alice', priceRise)
      const { user } = await openHome()
      await screen.findByRole('heading', { name: 'Netflix went up' })
      const netflix = card(/netflix/i)

      expect(
        netflix.getByText(
          '$16.99 → $20.99 since 3 Oct 2026, $48.00 more a year',
        ),
      ).toBeInTheDocument()
      await user.click(netflix.getByRole('button', { name: 'View charges' }))

      expect(netflix.getAllByText('subscription')).toHaveLength(3)
    })

    it('keeps stored Chinese as it is', async () => {
      seedInsight('alice', possibleDuplicate)
      const { user } = await openHome()
      await screen.findByRole('heading', { name: /recorded twice/i })

      await user.click(screen.getByRole('button', { name: 'Review' }))

      expect(screen.getAllByText('菜')).toHaveLength(2)
    })

    it('hides a dismissed card, and it stays hidden', async () => {
      seedInsight('alice', regoDue)
      const { user } = await openHome()
      await screen.findByRole('heading', { name: /car rego/i })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))

      expect(
        await screen.findByText(/nothing needs your attention/i),
      ).toBeInTheDocument()
    })

    it('calls dismissing a possible duplicate what it means', async () => {
      seedInsight('alice', possibleDuplicate)
      const { user } = await openHome()
      await screen.findByRole('heading', { name: /recorded twice/i })

      await user.click(screen.getByRole('button', { name: 'Not a duplicate' }))

      expect(
        await screen.findByText(/nothing needs your attention/i),
      ).toBeInTheDocument()
    })

    it('deletes one of a pair once confirmed, which clears the card', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      seedInsight('alice', possibleDuplicate)
      const { user } = await openHome()
      await screen.findByRole('heading', { name: /recorded twice/i })

      await user.click(screen.getByRole('button', { name: 'Review' }))
      await user.click(
        screen.getByRole('button', { name: /delete .* 30 oct 2026/i }),
      )

      expect(confirm).toHaveBeenCalledWith(
        expect.stringMatching(/can't be undone/i),
      )
      expect(
        await screen.findByText(/nothing needs your attention/i),
      ).toBeInTheDocument()
    })

    it('keeps both if they change their mind', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      seedInsight('alice', possibleDuplicate)
      const { user } = await openHome()
      await screen.findByRole('heading', { name: /recorded twice/i })

      await user.click(screen.getByRole('button', { name: 'Review' }))
      await user.click(
        screen.getByRole('button', { name: /delete .* 30 oct 2026/i }),
      )

      expect(
        screen.getByRole('heading', { name: /recorded twice/i }),
      ).toBeInTheDocument()
      expect(screen.getAllByText('菜')).toHaveLength(2)
    })

    it('says so when a delete fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      seedInsight('alice', possibleDuplicate)
      server.use(
        http.delete('*/api/v1/transactions/:id', () =>
          HttpResponse.json(
            { error: { code: 'nope', message: 'Could not delete that' } },
            { status: 500 },
          ),
        ),
      )
      const { user } = await openHome()
      await screen.findByRole('heading', { name: /recorded twice/i })

      await user.click(screen.getByRole('button', { name: 'Review' }))
      await user.click(
        screen.getByRole('button', { name: /delete .* 30 oct 2026/i }),
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not delete that',
      )
    })
  })

  describe('asking from Home', () => {
    it('sends the question to the chat and shows the answer there', async () => {
      const { user } = await openHome()

      await user.type(
        screen.getByLabelText(/ask ledger/i),
        'Coffee for $5{Enter}',
      )

      expect(await screen.findByText('Recorded $5.00.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Chat' })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })

    it('sends nothing for an empty box', async () => {
      const { user } = await openHome()
      await user.type(screen.getByLabelText(/ask ledger/i), '   {Enter}')
      expect(screen.getByRole('heading', { name: /^good/i })).toBeVisible()
    })
  })

  describe('after recording in the chat', () => {
    it('shows the new total back on Home', async () => {
      const { user } = await openHome()
      await screen.findByTestId('spend-total')

      await user.type(
        screen.getByLabelText(/ask ledger/i),
        'Coffee for $5{Enter}',
      )
      await screen.findByText('Recorded $5.00.')
      await user.click(screen.getByRole('link', { name: 'Home' }))

      expect(
        await screen.findByRole('button', { name: /\$5\.00/ }),
      ).toBeInTheDocument()
    })
  })
})

describe('given a conversation in the chat', () => {
  it('survives moving to another tab and back', async () => {
    const { user } = await openHome()
    await user.click(screen.getByRole('link', { name: 'Chat' }))
    await user.type(
      await screen.findByLabelText(/describe your spending/i),
      'Spent $6 on coffee{Enter}',
    )
    await screen.findByText('Recorded $6.00.')

    await user.click(screen.getByRole('link', { name: 'Home' }))
    await screen.findByRole('heading', { name: /^good/i })
    await user.click(screen.getByRole('link', { name: 'Chat' }))

    expect(screen.getByText('Recorded $6.00.')).toBeInTheDocument()
  })

  it('is gone for the next person after signing out', async () => {
    const { user } = await openHome()
    await user.click(screen.getByRole('link', { name: 'Chat' }))
    await user.type(
      await screen.findByLabelText(/describe your spending/i),
      'Spent $6 on coffee{Enter}',
    )
    await screen.findByText('Recorded $6.00.')

    await user.click(screen.getByRole('button', { name: /sign out/i }))
    await signIn(user, 'sisi', 'sisi-password')
    await user.click(await screen.findByRole('link', { name: 'Chat' }))

    await waitFor(() =>
      expect(screen.getByText(/what did you spend today/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText('Recorded $6.00.')).toBeNull()
  })
})

describe('given sisi, an admin', () => {
  it('has all three tabs and lands on Home', async () => {
    await openHome('sisi')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chat' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
  })
})
