import type { MonthlySummary, Transaction } from './api/types'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  createdAt: number
  /** Set on an assistant message that reports a failed request; it isn't sent back to the agent. */
  isError?: boolean
  /** Set on a failed assistant message: the user message to resend on retry. */
  retryOf?: string
  transactions?: Transaction[]
  listed?: Transaction[]
  summaries?: MonthlySummary[]
}
