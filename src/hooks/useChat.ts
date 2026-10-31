import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../api/client'
import type { ChatResponse, ChatTurn } from '../api/types'
import { useAuth } from '../auth/useAuth'
import type { ChatMessage } from '../types'

// ledger-agent accepts at most 20 messages per request.
const MAX_HISTORY = 20

function createMessage(
  fields: Omit<ChatMessage, 'id' | 'createdAt'>,
): ChatMessage {
  return { id: crypto.randomUUID(), createdAt: Date.now(), ...fields }
}

/** Retrying can't help until the limit resets, so this failure gets no Retry button. */
const canRetry = (error: Error) =>
  !(error instanceof ApiError && error.code === 'daily_limit_reached')

/** The agent keeps no conversation state, so every turn sends the history (text only, no errors). */
function toHistory(messages: ChatMessage[]): ChatTurn[] {
  const turns = messages
    .filter((m) => !m.isError)
    .map((m) => ({ role: m.role, content: m.text }))
    .slice(-MAX_HISTORY)
  // Claude expects the conversation to open with the user.
  while (turns[0]?.role === 'assistant') turns.shift()
  return turns
}

export function useChat() {
  const { authRequest } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const mutation = useMutation({
    mutationFn: (history: ChatTurn[]) =>
      authRequest<ChatResponse>('/agent/v1/chat', {
        method: 'POST',
        body: {
          messages: history,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }),
  })

  const submit = (history: ChatMessage[], userMessageId: string) => {
    mutation.mutate(toHistory(history), {
      onSuccess: (response) =>
        setMessages((prev) => [
          ...prev,
          createMessage({
            role: 'assistant',
            text: response.reply,
            transactions: response.transactions,
            listed: response.listed,
            summaries: response.summaries,
          }),
        ]),
      onError: (error) =>
        setMessages((prev) => [
          ...prev,
          createMessage({
            role: 'assistant',
            text: error.message,
            isError: true,
            retryOf: canRetry(error) ? userMessageId : undefined,
          }),
        ]),
    })
  }

  // Send is disabled while a turn is in flight: recording isn't idempotent, so a double send
  // could record an expense twice.
  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || mutation.isPending) return
    const userMessage = createMessage({ role: 'user', text: trimmed })
    const next = [...messages, userMessage]
    setMessages(next)
    submit(next, userMessage.id)
  }

  const retry = (errorMessageId: string) => {
    const failed = messages.find((m) => m.id === errorMessageId)
    if (!failed?.retryOf || mutation.isPending) return
    const next = messages.filter((m) => m.id !== errorMessageId)
    setMessages(next)
    submit(next, failed.retryOf)
  }

  const reset = () => {
    mutation.reset()
    setMessages([])
  }

  return { messages, isThinking: mutation.isPending, send, retry, reset }
}
