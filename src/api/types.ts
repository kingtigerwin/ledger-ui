export type Role = 'admin' | 'customer'
export type UserStatus = 'pending' | 'active' | 'disabled'

/** What `GET /api/v1/auth/me` returns. */
export interface User {
  id: string
  username: string
  role: Role
  status: UserStatus
  /** Users created before emails were collected, such as sisi, have none. */
  email?: string
}

/** A row of `GET /api/v1/admin/users`. */
export interface AdminUser extends User {
  createdAt: string
}

export interface TokenResponse {
  accessToken: string
  expiresIn: number
}

export interface Transaction {
  id: string
  /** ISO date, e.g. 2026-10-27 */
  date: string
  merchant?: string
  category: string
  item: string
  amountCents: number
  currency: string
  note?: string
  /** Whose item this is; set on listed items when an admin lists everyone's transactions. */
  userId?: string
  /** Null when the owner's username couldn't be found. */
  username?: string | null
}

export interface MonthlySummary {
  /** e.g. 2026-10 */
  month: string
  currency: string
  totalCents: number
  byCategory: { category: string; totalCents: number }[]
}

interface InsightBase {
  /** What `POST /api/v1/insights/{id}/dismiss` takes. */
  id: string
  currency: string
  /** The transactions behind it, newest first for a price rise. */
  transactions: Transaction[]
}

export interface PossibleDuplicate extends InsightBase {
  type: 'possible_duplicate'
  merchant: string
  amountCents: number
}

export interface PriceRise extends InsightBase {
  type: 'price_rise'
  merchant: string
  previousCents: number
  currentCents: number
  /** The first charge at the new price. */
  since: string
  cadence: 'monthly' | 'yearly'
  extraPerYearCents: number
}

export interface RegoDue extends InsightBase {
  type: 'rego_due'
  /** ledger-api estimates this from the last payment, so the UI says "around". */
  estimatedDueDate: string
  lastPaidCents: number
}

/** An item of `GET /api/v1/insights`. The UI writes the wording; only stored text isn't English. */
export type Insight = PossibleDuplicate | PriceRise | RegoDue

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatTurn[]
  timeZone: string
}

/** `POST /agent/v1/chat`; see ledger-agent's docs/design.md. */
export interface ChatResponse {
  reply: string
  /** What this turn recorded. */
  transactions: Transaction[]
  /** What this turn looked up. */
  listed: Transaction[]
  summaries: MonthlySummary[]
}
