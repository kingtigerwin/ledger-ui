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
  /** Sent back with an edit, which fails if it has changed. */
  version?: number
  /** Only on an expense recorded from a scanned receipt. */
  receipt?: ReceiptDetails
}

export interface ReceiptLine {
  /** As printed. */
  name: string
  /** In plain words, for searching. */
  product?: string
  /** Negative for a discount. */
  amountCents: number
}

export interface ReceiptPayment {
  label: string
  kind: 'money' | 'points'
  amountCents: number
}

/** What a receipt says beyond the transaction's own fields; only what was printed. */
export interface ReceiptDetails {
  /** The goods' value; the transaction's `amountCents` is the money paid. */
  totalCents: number
  gstCents?: number
  savingsCents?: number
  /** 24-hour HH:MM */
  time?: string
  location?: string
  receiptNumber?: string
  abn?: string
  lines?: ReceiptLine[]
  payments?: ReceiptPayment[]
}

/** The body of `POST /api/v1/transactions`. */
export interface NewTransaction {
  id: string
  date: string
  merchant: string
  category: string
  item: string
  amountCents: number
  currency: string
  note?: string
  receipt?: ReceiptDetails
}

export type ReceiptProblem =
  | 'merchant_unreadable'
  | 'date_unreadable'
  | 'date_in_future'
  | 'date_too_old'
  | 'lines_dont_add_up'
  | 'payments_dont_add_up'
  | 'nothing_paid'

/** `receipt` of `POST /agent/v1/receipts/read`: what was read, with null for what wasn't printed. */
export interface ReadReceipt {
  merchant: string | null
  date: string | null
  category: string
  paidCents: number
  totalCents: number
  gstCents: number | null
  savingsCents: number | null
  time: string | null
  location: string | null
  receiptNumber: string | null
  abn: string | null
  lines: ReceiptLine[]
  payments: ReceiptPayment[]
}

export interface ReadReceiptResponse {
  receipt: ReadReceipt
  /** Why a person should look first; empty when the checks passed. */
  problems: ReceiptProblem[]
  canRecord: boolean
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
