import { useState } from 'react'
import { EXAMPLE_PROMPTS } from '../constants'
import { AppHeader } from '../components/AppHeader'
import { ChatInput } from '../components/ChatInput'
import { MessageList } from '../components/MessageList'
import { useChat } from '../hooks/useChat'

export function ChatPage() {
  const { messages, isThinking, send, retry, reset } = useChat()
  const [draft, setDraft] = useState('')
  const isEmpty = messages.length === 0 && !isThinking

  const handleSubmit = () => {
    send(draft)
    setDraft('')
  }

  const input = (
    <ChatInput
      value={draft}
      onChange={setDraft}
      onSubmit={handleSubmit}
      disabled={isThinking}
    />
  )

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        actions={
          !isEmpty && (
            <button
              type="button"
              onClick={() => {
                reset()
                setDraft('')
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              New chat
            </button>
          )
        }
      />

      {isEmpty ? (
        // Before the first message, the input sits in the middle of the screen.
        <main className="flex flex-1 overflow-y-auto">
          <div className="m-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800">
                What did you spend today?
              </h2>
              <p className="mt-1 text-slate-500">
                Describe your purchases in your own words, or ask about your
                spending.
              </p>
            </div>
            {input}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-500">
                Try an example:
              </p>
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : (
        <>
          <MessageList
            messages={messages}
            isThinking={isThinking}
            onRetry={retry}
          />
          <footer className="border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-3xl px-4 py-3">{input}</div>
          </footer>
        </>
      )}
    </div>
  )
}
