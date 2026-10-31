import { http, HttpResponse } from 'msw'
import type {
  AdminUser,
  ChatRequest,
  ChatResponse,
  Transaction,
  UserStatus,
} from '../api/types'

// An in-memory stand-in for ledger-api and ledger-agent, for tests and `VITE_USE_MOCKS=true`.
// The refresh cookie is modelled as one signed-in session, and access tokens carry a
// generation so tests can expire them.

interface MockUser extends AdminUser {
  password: string
}

type MockTransaction = Transaction & { userId: string }

const db = {
  users: new Map<string, MockUser>(),
  sessionUserId: null as string | null,
  tokenGeneration: 0,
  transactions: [] as MockTransaction[],
}

let nextId = 1

export function seedUser(
  username: string,
  password: string,
  fields: Partial<Pick<AdminUser, 'role' | 'status' | 'email'>> = {},
): MockUser {
  const user: MockUser = {
    id: `user-${nextId++}`,
    username,
    password,
    role: fields.role ?? 'customer',
    status: fields.status ?? 'pending',
    createdAt: '2026-10-27T01:00:00.000Z',
    ...(fields.email && { email: fields.email }),
  }
  db.users.set(user.id, user)
  return user
}

export function resetMockDb() {
  db.users.clear()
  db.sessionUserId = null
  db.tokenGeneration = 0
  db.transactions = []
  seedUser('sisi', 'sisi-password', { role: 'admin', status: 'active' })
  seedUser('alice', 'alice-password', {
    status: 'active',
    email: 'alice@example.com',
  })
  seedUser('bob', 'bob-password', { email: 'bob@example.com' })
}

/** Records an expense for `username`, as if they had told the agent about it. */
export function seedTransaction(username: string, amountCents: number) {
  const user = findUser(username)
  if (!user) throw new Error(`No mock user ${username}`)
  db.transactions.push(newTransaction(user.id, amountCents))
}

const newTransaction = (
  userId: string,
  amountCents: number,
): MockTransaction => ({
  id: `txn-${nextId++}`,
  date: '2026-10-27',
  category: 'other',
  item: 'expense',
  amountCents,
  currency: 'AUD',
  userId,
})

const withoutOwner = ({ userId: _userId, ...t }: MockTransaction) => t

/** Makes every access token issued so far be refused, as if 15 minutes had passed. */
export function expireAccessTokens() {
  db.tokenGeneration++
}

/** Ends the refresh-cookie session, as if it had expired or been revoked. */
export function endSession() {
  db.sessionUserId = null
}

/** As if sisi deleted them elsewhere: their token and refresh cookie stop working. */
export function deleteUserFromAnotherSession(username: string) {
  const user = findUser(username)
  if (user) db.users.delete(user.id)
  db.sessionUserId = null
}

export const findUser = (username: string) =>
  [...db.users.values()].find((u) => u.username === username)

resetMockDb()

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status })

const issueToken = (userId: string) => {
  db.sessionUserId = userId
  return HttpResponse.json({
    accessToken: `token.${userId}.${db.tokenGeneration}`,
    expiresIn: 900,
  })
}

function caller(request: Request): MockUser | undefined {
  const [, userId, generation] =
    request.headers.get('authorization')?.replace('Bearer ', '').split('.') ??
    []
  if (Number(generation) !== db.tokenGeneration) return undefined
  return db.users.get(userId)
}

const publicUser = ({ password: _password, ...user }: MockUser) => user

type Resolver = Parameters<typeof http.get>[1]
type ResolverInfo = Parameters<Resolver>[0]

const withUser =
  (
    handler: (user: MockUser, info: ResolverInfo) => ReturnType<Resolver>,
  ): Resolver =>
  (info) => {
    const user = caller(info.request)
    if (user) return handler(user, info)
    // As API Gateway answers: 401 with no token, and 403 when the authorizer refuses one, which
    // is what an expired token gets. It's API Gateway's own shape, not ledger-api's.
    return info.request.headers.has('authorization')
      ? HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      : HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

const withAdmin = (handler: (info: ResolverInfo) => ReturnType<Resolver>) =>
  withUser((user, info) =>
    user.role === 'admin'
      ? handler(info)
      : apiError(403, 'forbidden', 'Admins only'),
  )

function setStatus(id: string, status: UserStatus) {
  const user = db.users.get(id)
  if (!user) return apiError(404, 'user_not_found', 'No such user')
  if (status === 'disabled' && user.role === 'admin') {
    return apiError(409, 'cannot_disable_admin', "Admins can't be disabled")
  }
  user.status = status
  return HttpResponse.json(publicUser(user))
}

/**
 * A tiny "agent": records "$N" / "N dollars" messages, answers "this month" questions, and
 * lists everyone's transactions for an admin, as list_all_transactions does.
 */
function chat(user: MockUser, { messages }: ChatRequest): ChatResponse {
  const text = messages.at(-1)?.content ?? ''
  const empty = { transactions: [], listed: [], summaries: [] }
  if (user.role === 'admin' && /everyone|all transactions/i.test(text)) {
    return {
      ...empty,
      reply: "Here are everyone's transactions.",
      listed: db.transactions.map((t) => ({
        ...t,
        username: db.users.get(t.userId)?.username ?? null,
      })),
    }
  }
  if (/this month/i.test(text)) {
    const totalCents = db.transactions
      .filter((t) => t.userId === user.id)
      .reduce((s, t) => s + t.amountCents, 0)
    return {
      ...empty,
      reply: 'Here is your spending this month.',
      summaries: [
        {
          month: '2026-10',
          currency: 'AUD',
          totalCents,
          byCategory: totalCents ? [{ category: 'other', totalCents }] : [],
        },
      ],
    }
  }
  const amount = text.match(
    /\$(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?) dollars/i,
  )
  if (!amount) {
    return { ...empty, reply: 'How much did you spend, and on what?' }
  }
  const transaction = newTransaction(
    user.id,
    Math.round(Number(amount[1] ?? amount[2]) * 100),
  )
  db.transactions.push(transaction)
  return {
    ...empty,
    reply: `Recorded $${(transaction.amountCents / 100).toFixed(2)}.`,
    transactions: [withoutOwner(transaction)],
  }
}

export const handlers = [
  http.post('*/api/v1/auth/register', async ({ request }) => {
    const { username, password, email } = (await request.json()) as {
      username: string
      password: string
      email?: string
    }
    // Like ledger-api's zod check: an address with a dotted domain, at most 254 characters.
    if (
      typeof email !== 'string' ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return HttpResponse.json(
        {
          error: {
            code: 'validation_failed',
            message: 'Request body is invalid',
            details: [{ path: ['email'], message: 'Invalid email address' }],
          },
        },
        { status: 400 },
      )
    }
    if (findUser(username.toLowerCase())) {
      return apiError(409, 'username_taken', 'That username is taken')
    }
    const user = seedUser(username.toLowerCase(), password, { email })
    return HttpResponse.json(publicUser(user), { status: 201 })
  }),

  http.post('*/api/v1/auth/login', async ({ request }) => {
    const { username, password } = (await request.json()) as {
      username: string
      password: string
    }
    const user = findUser(username.toLowerCase())
    if (!user || user.password !== password || user.status === 'disabled') {
      return apiError(
        401,
        'invalid_credentials',
        'Invalid username or password',
      )
    }
    if (user.status === 'pending') {
      return apiError(
        403,
        'account_pending',
        'This account is waiting for admin approval',
      )
    }
    return issueToken(user.id)
  }),

  http.post('*/api/v1/auth/refresh', () => {
    const user = db.sessionUserId ? db.users.get(db.sessionUserId) : undefined
    if (user?.status !== 'active') {
      return apiError(401, 'invalid_refresh_token', 'Log in again')
    }
    return issueToken(user.id)
  }),

  http.post('*/api/v1/auth/logout', () => {
    db.sessionUserId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(
    '*/api/v1/auth/me',
    withUser((user) => HttpResponse.json(publicUser(user))),
  ),

  http.get(
    '*/api/v1/admin/users',
    withAdmin(({ request }) => {
      const status = new URL(request.url).searchParams.get('status')
      const items = [...db.users.values()]
        .filter((u) => u.status === status)
        .map(publicUser)
      return HttpResponse.json({ items, nextCursor: null })
    }),
  ),

  http.post(
    '*/api/v1/admin/users/:id/enable',
    withAdmin(({ params }) => setStatus(String(params.id), 'active')),
  ),

  http.post(
    '*/api/v1/admin/users/:id/disable',
    withAdmin(({ params }) => setStatus(String(params.id), 'disabled')),
  ),

  http.delete(
    '*/api/v1/admin/users/:id',
    withAdmin(({ params }) => {
      const user = db.users.get(String(params.id))
      if (!user) return apiError(404, 'user_not_found', 'No such user')
      if (user.role === 'admin') {
        return apiError(409, 'cannot_delete_admin', "Admins can't be deleted")
      }
      db.users.delete(user.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    '*/agent/v1/chat',
    withUser(async (user, { request }) =>
      HttpResponse.json(chat(user, (await request.json()) as ChatRequest)),
    ),
  ),
]
