import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: ChatMessage[]
  isThinking: boolean
  onRetry: (messageId: string) => void
}

export function MessageList({
  messages,
  isThinking,
  onRetry,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isThinking])

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            // Only the latest failure can be retried; later messages would change its history.
            onRetry={index === messages.length - 1 ? onRetry : undefined}
            retryDisabled={isThinking}
          />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
