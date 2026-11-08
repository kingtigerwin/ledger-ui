import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { AppHeader } from '../components/AppHeader'
import { AskBox } from '../components/AskBox'
import { InsightCard } from '../components/InsightCard'
import { ReceiptScanner } from '../components/ReceiptScanner'
import { SummaryCard } from '../components/SummaryCard'
import {
  formatCents,
  formatMonth,
  localDate,
  localMonth,
  partOfDay,
  previousMonth,
} from '../format'
import { useInsights, useMonthlySummary } from '../hooks/useHome'
import { useI18n } from '../i18n/useI18n'

function Spend({ month }: { month: string }) {
  const summary = useMonthlySummary(month)
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  // Early in a month a bare $0.00 looks broken, so last month's total gives it context. It's only
  // asked for then, so an ordinary load makes no extra request.
  const nothingYet = summary.data?.totalCents === 0
  const lastMonth = useMonthlySummary(previousMonth(month), nothingYet)

  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-500">{t.home.thisMonthsSpend}</p>
      {summary.isPending ? (
        <p className="mt-1 text-3xl font-semibold text-slate-300">…</p>
      ) : summary.isError ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {t.home.couldntLoadSpend}{' '}
          <button
            type="button"
            onClick={() => summary.refetch()}
            className="underline"
          >
            {t.common.tryAgain}
          </button>
        </p>
      ) : nothingYet ? (
        <>
          <p
            data-testid="spend-total"
            className="mt-1 text-3xl font-semibold tabular-nums"
          >
            {formatCents(0, summary.data.currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t.home.nothingYet}
            {!!lastMonth.data?.totalCents && (
              <>
                {t.common.separator}
                {formatMonth(lastMonth.data.month)}:{' '}
                {formatCents(
                  lastMonth.data.totalCents,
                  lastMonth.data.currency,
                )}
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="mt-1 flex items-baseline gap-2 text-left"
          >
            <span className="text-3xl font-semibold tabular-nums">
              {formatCents(summary.data.totalCents, summary.data.currency)}
            </span>
            <span className="text-sm text-indigo-700">{t.home.byCategory}</span>
          </button>
          {open && <SummaryCard summary={summary.data} />}
        </>
      )}
    </div>
  )
}

export function HomePage() {
  // Read once per mount: both are only as fresh as the moment the page opened.
  const [now] = useState(() => new Date())
  const today = localDate(now)
  const insights = useInsights(today)
  const count = insights.data?.length ?? 0
  const { state } = useAuth()
  const { t } = useI18n()
  const greeting = t.home.greeting[partOfDay(now)]

  return (
    <div className="flex h-full flex-col">
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {/* The header leaves the username out on a phone, so this is where it shows there. */}
              {state.status === 'signedIn'
                ? t.home.greetingName(greeting, state.user.username)
                : greeting}
            </h1>
            <p className="text-slate-500">{t.home.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <Spend month={localMonth(now)} />
            {count > 0 && (
              <div>
                <p className="text-sm text-slate-500">{t.home.toReview}</p>
                <p
                  data-testid="to-review"
                  className="mt-1 text-3xl font-semibold tabular-nums"
                >
                  {count}
                </p>
              </div>
            )}
          </div>

          <ReceiptScanner />

          <section className="flex flex-col gap-3">
            <h2 className="font-medium text-slate-800">{t.home.attention}</h2>
            {insights.isPending ? (
              <p className="text-sm text-slate-500">{t.home.checking}</p>
            ) : insights.isError ? (
              <p role="alert" className="text-sm text-red-700">
                {t.home.couldntCheck}{' '}
                <button
                  type="button"
                  onClick={() => insights.refetch()}
                  className="underline"
                >
                  {t.common.tryAgain}
                </button>
              </p>
            ) : count === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <p className="font-medium text-slate-900">
                  {t.home.nothingNeedsAttention}
                </p>
                <p className="mt-1 text-slate-600">
                  {t.home.nothingNeedsAttentionBody}
                </p>
              </div>
            ) : (
              <ul aria-label={t.home.attention} className="flex flex-col gap-3">
                {insights.data.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    today={today}
                  />
                ))}
              </ul>
            )}
          </section>

          <AskBox />
        </div>
      </main>
    </div>
  )
}
