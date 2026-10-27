import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0 && !disabled

  // Grow the textarea with its content, up to the max-height set in CSS.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  // Return focus to the input after a reply arrives.
  useEffect(() => {
    if (!disabled) textareaRef.current?.focus()
  }, [disabled])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (canSend) onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <label htmlFor="chat-input" className="sr-only">
          Describe your spending
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Today I went to Coles and spent $30 on food and $6 on coffee"
          className="block max-h-72 min-h-28 w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3 text-base leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3">
          <span className="hidden text-xs text-slate-400 sm:inline">
            Enter to send · Shift+Enter for a new line
          </span>
          <button
            type="submit"
            disabled={!canSend}
            className="ml-auto rounded-xl bg-indigo-600 px-5 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  )
}
