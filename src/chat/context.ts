import { createContext } from 'react'
import type { ChatMessage } from '../types'

export interface ChatContextValue {
  messages: ChatMessage[]
  isThinking: boolean
  send: (text: string) => void
  retry: (errorMessageId: string) => void
  reset: () => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)
