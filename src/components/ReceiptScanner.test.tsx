import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findTransactions, seedReceiptReply } from '../mocks/handlers'
import { flybuysReceipt, readReply } from '../mocks/receipts'
import { server } from '../mocks/server'
import { renderApp, signIn } from '../test/renderApp'
import { shrinkImage } from '../receipts/shrinkImage'

vi.mock('../receipts/shrinkImage', async (original) => ({
  ...(await original<typeof import('../receipts/shrinkImage')>()),
  // jsdom has no canvas; it's checked in a real browser.
  shrinkImage: vi.fn(async () => ({
    base64: 'aW1hZ2U=',
    mediaType: 'image/jpeg',
  })),
}))

const photo = new File(['photo'], 'receipt.jpg', { type: 'image/jpeg' })

async function openHome() {
  const app = renderApp('/login')
  await signIn(app.user, 'alice', 'alice-password')
  await screen.findByRole('heading', { name: /^good/i })
  return app
}

async function scan(reply = readReply()) {
  seedReceiptReply(reply)
  const app = await openHome()
  await app.user.upload(screen.getByLabelText('Upload photo'), photo)
  return app
}

const saved = () => findTransactions('alice')

beforeEach(() => {
  vi.mocked(shrinkImage).mockClear()
})

describe('given the buttons on Home', () => {
  it('offers the camera and the photo library', async () => {
    await openHome()

    expect(screen.getByLabelText('Take photo')).toHaveAttribute(
      'capture',
      'environment',
    )
    expect(screen.getByLabelText('Upload photo')).not.toHaveAttribute('capture')
  })

  it('takes images only', async () => {
    await openHome()

    expect(screen.getByLabelText('Upload photo')).toHaveAttribute(
      'accept',
      'image/*',
    )
  })
})

describe('given a receipt that passes its checks', () => {
  it('records it without asking, and says what was recorded', async () => {
    await scan()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Recorded $0.50 at Coles',
    )
    expect(saved()).toHaveLength(1)
    expect(saved()[0].amountCents).toBe(50)
    expect(saved()[0].receipt?.totalCents).toBe(3050)
  })

  it('says what points paid', async () => {
    await scan()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Flybuys value redeemed paid $30.00',
    )
  })

  it('adds it to this month’s spend', async () => {
    await scan()
    await screen.findByRole('status')

    expect(
      await screen.findByRole('button', { name: /\$0\.50/ }),
    ).toBeInTheDocument()
  })

  it('takes it back with Undo', async () => {
    const { user } = await scan()
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(saved()).toHaveLength(0))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('can be corrected with Edit', async () => {
    const { user } = await scan()
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const merchant = screen.getByLabelText('Merchant')
    await user.clear(merchant)
    await user.type(merchant, 'Woolworths')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saved()[0].merchant).toBe('Woolworths'))
    expect(saved()).toHaveLength(1)
    expect(saved()[0].version).toBe(2)
  })
})

describe('given a receipt that fails a check', () => {
  const failing = () =>
    readReply({ problems: ['lines_dont_add_up'], canRecord: false })

  it('records nothing and shows the form with why', async () => {
    await scan(failing())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /lines don't add up/i,
    )
    expect(screen.getByLabelText('Merchant')).toHaveValue('Coles')
    expect(screen.getByLabelText('Amount paid')).toHaveValue('0.50')
    expect(saved()).toHaveLength(0)
  })

  it('records what the customer corrected', async () => {
    const { user } = await scan(failing())
    const amount = await screen.findByLabelText('Amount paid')

    await user.clear(amount)
    await user.type(amount, '12.34')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saved()).toHaveLength(1))
    expect(saved()[0].amountCents).toBe(1234)
  })

  it('records nothing on Cancel', async () => {
    const { user } = await scan(failing())

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Merchant')).toBeNull()
    expect(saved()).toHaveLength(0)
  })

  it('needs a date when none could be read', async () => {
    const { user } = await scan(
      readReply({
        receipt: { ...flybuysReceipt, date: null },
        problems: ['date_unreadable'],
        canRecord: false,
      }),
    )

    const date = await screen.findByLabelText('Date')
    await user.clear(date)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it.each(['0', '-1', 'abc', ''])('refuses an amount of "%s"', async (text) => {
    const { user } = await scan(failing())
    const amount = await screen.findByLabelText('Amount paid')

    await user.clear(amount)
    if (text) await user.type(amount, text)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})

describe('given a receipt paid entirely with points', () => {
  it('says there is nothing to record', async () => {
    await scan(
      readReply({
        receipt: { ...flybuysReceipt, paidCents: 0 },
        problems: ['nothing_paid'],
        canRecord: false,
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/points/i)
    expect(screen.queryByLabelText('Merchant')).toBeNull()
    expect(saved()).toHaveLength(0)
  })
})

describe('given a receipt already in the ledger', () => {
  it('asks first, when the receipt number matches', async () => {
    const { user } = await scan()
    await screen.findByRole('status')
    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already recorded/i,
    )
    expect(saved()).toHaveLength(1)
  })

  it('still lets the customer save it', async () => {
    const { user } = await scan()
    await screen.findByRole('status')
    await user.upload(screen.getByLabelText('Upload photo'), photo)

    await user.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saved()).toHaveLength(2))
  })

  it('asks first, when a chat-recorded expense has the same amount', async () => {
    seedReceiptReply(readReply())
    const { user } = await openHome()
    await user.type(
      screen.getByLabelText(/ask ledger/i),
      'Spent $0.50 at coles{Enter}',
    )
    await screen.findByText('Recorded $0.50.')
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await screen.findByRole('heading', { name: /^good/i })

    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already recorded/i,
    )
  })
})

describe('given the agent refuses', () => {
  it.each([
    ['not_a_receipt', "That doesn't look like a receipt."],
    ['unreadable', "That receipt couldn't be read."],
    ['daily_receipt_limit_reached', "You've scanned today's 10 receipts."],
  ])('shows its message for %s', async (code, message) => {
    server.use(
      http.post('*/agent/v1/receipts/read', () =>
        HttpResponse.json({ error: { code, message } }, { status: 422 }),
      ),
    )
    const { user } = await openHome()

    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(saved()).toHaveLength(0)
  })
})

describe('given a photo the browser cannot open', () => {
  it('asks for another format', async () => {
    vi.mocked(shrinkImage).mockRejectedValueOnce(new Error('no'))
    const { user } = await openHome()

    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(await screen.findByRole('alert')).toHaveTextContent(/jpeg or png/i)
  })
})

describe('given saving fails', () => {
  it('offers another go with the same id, so it cannot record twice', async () => {
    const ids: string[] = []
    let failed = false
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/transactions')) {
        ids.push(((await request.clone().json()) as { id: string }).id)
      }
    })
    server.use(
      http.post('*/api/v1/transactions', () => {
        if (failed) return undefined
        failed = true
        return HttpResponse.json(
          { error: { code: 'x', message: 'Could not save' } },
          { status: 500 },
        )
      }),
    )
    const { user } = await scan()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saved()).toHaveLength(1))
    server.events.removeAllListeners()
    expect(new Set(ids).size).toBe(1)
    expect(ids).toHaveLength(2)
  })
})

describe('given a scan is running', () => {
  function holdTheReply() {
    let finish = () => {}
    server.use(
      http.post('*/agent/v1/receipts/read', async () => {
        await new Promise<void>((resolve) => (finish = resolve))
        return HttpResponse.json(readReply())
      }),
    )
    return () => finish()
  }

  it('shows a modal that says to wait, until it finishes', async () => {
    const finish = holdTheReply()
    const { user } = await openHome()

    await user.upload(screen.getByLabelText('Upload photo'), photo)

    const modal = await screen.findByRole('dialog', { hidden: true })
    expect(modal).toHaveTextContent('Your receipt is uploading, please wait')
    expect(modal).toHaveAttribute('open')
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    await waitFor(() => finish())
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
  })

  it('blocks another scan', async () => {
    const finish = holdTheReply()
    const { user } = await openHome()

    await user.upload(screen.getByLabelText('Upload photo'), photo)

    await screen.findByRole('dialog', { hidden: true })
    expect(screen.getByLabelText('Upload photo')).toBeDisabled()
    expect(screen.getByLabelText('Take photo')).toBeDisabled()
    await waitFor(() => finish())
    await screen.findByRole('status')
  })

  it('cannot be closed with Escape', async () => {
    const finish = holdTheReply()
    const { user } = await openHome()
    await user.upload(screen.getByLabelText('Upload photo'), photo)
    const modal = await screen.findByRole('dialog', { hidden: true })

    const escape = new Event('cancel', { cancelable: true })
    modal.dispatchEvent(escape)

    expect(escape.defaultPrevented).toBe(true)
    await waitFor(() => finish())
    await screen.findByRole('status')
  })

  it('goes away when the read fails', async () => {
    server.use(
      http.post('*/agent/v1/receipts/read', () =>
        HttpResponse.json(
          { error: { code: 'unreadable', message: 'Try a clearer photo' } },
          { status: 422 },
        ),
      ),
    )
    const { user } = await openHome()

    await user.upload(screen.getByLabelText('Upload photo'), photo)

    expect(await screen.findByRole('alert')).toHaveTextContent('clearer photo')
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
  })
})

describe('given a recorded receipt', () => {
  it('lists every item with its price', async () => {
    await scan()
    await screen.findByRole('status')

    const items = screen.getByRole('list', { name: 'Receipt items' })
    expect(
      within(items)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual([
      'Pasta bakePI PERFECT BAKES 450$8.50',
      'Beef minceCOLES BEEF MINCE 4ST$15.50',
      'Chicken minceCLS CHICKEN MINCE$6.50',
    ])
  })

  it('shows only the printed name for a line with no plain name', async () => {
    await scan(
      readReply({
        receipt: {
          ...flybuysReceipt,
          lines: [{ name: 'MISC ITEM', amountCents: 3050 }],
        },
      }),
    )
    await screen.findByRole('status')

    const items = screen.getByRole('list', { name: 'Receipt items' })
    expect(within(items).getByRole('listitem').textContent).toBe(
      'MISC ITEM$30.50',
    )
  })

  it('shows the receipt total, savings and where it was', async () => {
    await scan()
    await screen.findByRole('status')

    expect(screen.getByTestId('receipt-total')).toHaveTextContent('$30.50')
    expect(screen.getByTestId('receipt-savings')).toHaveTextContent('$31.00')
    expect(screen.getByText('The Glen · 15:06')).toBeInTheDocument()
  })

  it('shows GST only when some was charged', async () => {
    await scan()
    await screen.findByRole('status')
    expect(screen.queryByText(/gst/i)).toBeNull()
  })

  it('shows GST when the receipt has it', async () => {
    await scan(readReply({ receipt: { ...flybuysReceipt, gstCents: 355 } }))
    await screen.findByRole('status')

    expect(screen.getByTestId('receipt-gst')).toHaveTextContent('$3.55')
  })

  it('comes back after Cancel on Edit, so Undo is still there', async () => {
    const { user } = await scan()
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(saved()).toHaveLength(1)
  })
})
