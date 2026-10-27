import { formatTime } from '../format'
import type { ChatMessage } from '../types'
import { SummaryCard } from './SummaryCard'
import { TransactionCard } from './TransactionCard'

interface MessageBubbleProps {
  message: ChatMessage
  /** Absent when this message can't be retried. */
  onRetry?: (messageId: string) => void
  retryDisabled: boolean
}

export function MessageBubble({
  message,
  onRetry,
  retryDisabled,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const bubbleClass = isUser
    ? 'bg-indigo-600 text-white rounded-br-sm'
    : message.isError
      ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex max-w-[85%] flex-col sm:max-w-[70%]">
        <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${bubbleClass}`}>
          <p className="break-words whitespace-pre-wrap">{message.text}</p>
          {message.isError && message.retryOf && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              disabled={retryDisabled}
              className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </div>
        {message.transactions && message.transactions.length > 0 && (
          <TransactionCard
            title="Recorded"
            transactions={message.transactions}
          />
        )}
        {message.listed && message.listed.length > 0 && (
          <TransactionCard title="Found" transactions={message.listed} />
        )}
        {message.summaries?.map((summary) => (
          <SummaryCard key={summary.month} summary={summary} />
        ))}
        <span
          className={`mt-1 text-xs text-slate-400 ${isUser ? 'self-end' : 'self-start'}`}
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}
