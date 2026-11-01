import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { AskBox } from '../components/AskBox'
import { InsightCard } from '../components/InsightCard'
import { SummaryCard } from '../components/SummaryCard'
import {
  formatCents,
  formatMonth,
  greeting,
  localDate,
  localMonth,
  previousMonth,
} from '../format'
import { useInsights, useMonthlySummary } from '../hooks/useHome'

const ATTENTION_HEADING = 'Needs your attention'

function Spend({ month }: { month: string }) {
  const summary = useMonthlySummary(month)
  const [open, setOpen] = useState(false)
  // Early in a month a bare $0.00 looks broken, so last month's total gives it context. It's only
  // asked for then, so an ordinary load makes no extra request.
  const nothingYet = summary.data?.totalCents === 0
  const lastMonth = useMonthlySummary(previousMonth(month), nothingYet)

  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-500">This month's spend</p>
      {summary.isPending ? (
        <p className="mt-1 text-3xl font-semibold text-slate-300">…</p>
      ) : summary.isError ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          Couldn't load your spend.{' '}
          <button
            type="button"
            onClick={() => summary.refetch()}
            className="underline"
          >
            Try again
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
            Nothing recorded yet this month
            {!!lastMonth.data?.totalCents && (
              <>
                {' · '}
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
            <span className="text-sm text-indigo-700">by category</span>
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

  return (
    <div className="flex h-full flex-col">
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {greeting(now)}
            </h1>
            <p className="text-slate-500">Your financial inbox</p>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <Spend month={localMonth(now)} />
            {count > 0 && (
              <div>
                <p className="text-sm text-slate-500">To review</p>
                <p
                  data-testid="to-review"
                  className="mt-1 text-3xl font-semibold tabular-nums"
                >
                  {count}
                </p>
              </div>
            )}
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="font-medium text-slate-800">{ATTENTION_HEADING}</h2>
            {insights.isPending ? (
              <p className="text-sm text-slate-500">Checking…</p>
            ) : insights.isError ? (
              <p role="alert" className="text-sm text-red-700">
                Couldn't check what needs your attention.{' '}
                <button
                  type="button"
                  onClick={() => insights.refetch()}
                  className="underline"
                >
                  Try again
                </button>
              </p>
            ) : count === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <p className="font-medium text-slate-900">
                  Nothing needs your attention
                </p>
                <p className="mt-1 text-slate-600">
                  The more you record, the more Ledger can spot. You can add
                  past expenses in the chat too, such as “I paid $900 rego last
                  November”.
                </p>
              </div>
            ) : (
              <ul
                aria-label={ATTENTION_HEADING}
                className="flex flex-col gap-3"
              >
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
