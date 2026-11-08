import { useI18n } from '../i18n/useI18n'

export function TypingIndicator() {
  const { t } = useI18n()
  return (
    <div
      className="flex justify-start"
      role="status"
      aria-label={t.chat.thinking}
    >
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
