import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useChat } from '../chat/useChat'
import { useI18n } from '../i18n/useI18n'

/** Asks from Home; the answer appears in the chat, where the daily limit is explained. */
export function AskBox() {
  const { send, isThinking } = useChat()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const canSend = text.trim().length > 0 && !isThinking

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    send(text)
    navigate('/chat')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200"
    >
      <label htmlFor="ask-ledger" className="sr-only">
        {t.ask.label}
      </label>
      <input
        id="ask-ledger"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.ask.placeholder}
        className="min-w-0 flex-1 bg-transparent px-2 py-1 text-base outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="rounded-xl bg-indigo-600 px-4 py-1.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {t.ask.ask}
      </button>
    </form>
  )
}
