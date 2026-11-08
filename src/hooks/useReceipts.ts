import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type {
  NewTransaction,
  ReadBill,
  ReadReceipt,
  ReadReply,
  ReceiptProblem,
  Transaction,
} from '../api/types'
import { useAuth } from '../auth/useAuth'
import { localDate } from '../format'
import { errorText } from '../i18n/errorText'
import { useI18n } from '../i18n/useI18n'
import {
  billToNewTransaction,
  toNewTransaction,
  type ReceiptEntry,
} from '../receipts/toTransaction'
import { PdfTooLargeError, toUpload } from '../receipts/toUpload'
import { newUlid } from '../ulid'
import { HOME_QUERY_KEY } from './useHome'

export type Stage =
  | { name: 'idle' }
  | { name: 'reading' }
  | { name: 'failed'; message: string }
  /** Nothing is saved yet. `id` stays the same across attempts, so a retry can't record twice. */
  | {
      name: 'review'
      receipt: ReadReceipt
      entry: ReceiptEntry
      id: string
      problems: ReceiptProblem[]
      alreadyRecorded: boolean
      saveError?: string
    }
  /** Nothing is saved unless the customer says they've paid it; `id` works as it does for a review. */
  | { name: 'bill'; bill: ReadBill; id: string; saveError?: string }
  | { name: 'recorded'; transaction: Transaction }
  | { name: 'editing'; transaction: Transaction; saveError?: string }

const entryFrom = (receipt: ReadReceipt, date: string): ReceiptEntry => ({
  merchant: receipt.merchant ?? '',
  date,
  category: receipt.category,
  amountCents: receipt.paidCents,
})

export function useReceipts() {
  const { authRequest } = useAuth()
  const { t } = useI18n()
  const errorMessage = (err: unknown) => errorText(t, err)
  const stored = t.receipts.stored
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<Stage>({ name: 'idle' })

  const refreshHome = useCallback(
    () => queryClient.invalidateQueries({ queryKey: HOME_QUERY_KEY }),
    [queryClient],
  )

  /** Same receipt number, or the same amount that day, which also catches one typed into the chat. */
  const isAlreadyRecorded = async (receipt: ReadReceipt, date: string) => {
    const { items } = await authRequest<{ items: Transaction[] }>(
      `/api/v1/transactions?from=${date}&to=${date}&limit=100`,
    )
    return items.some(
      (t) =>
        t.amountCents === receipt.paidCents ||
        (receipt.receiptNumber !== null &&
          t.receipt?.receiptNumber === receipt.receiptNumber),
    )
  }

  const post = async (body: NewTransaction) => {
    const transaction = await authRequest<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body,
    })
    setStage({ name: 'recorded', transaction })
    refreshHome()
  }

  const scan = async (file: File) => {
    setStage({ name: 'reading' })
    let image
    try {
      image = await toUpload(file)
    } catch (err) {
      setStage({
        name: 'failed',
        message:
          err instanceof PdfTooLargeError
            ? t.receipts.pdfTooLarge
            : t.receipts.cantOpen,
      })
      return
    }
    const id = newUlid()
    let reply: ReadReply
    let alreadyRecorded = false
    try {
      reply = await authRequest<ReadReply>('/agent/v1/receipts/read', {
        method: 'POST',
        body: {
          image: image.base64,
          mediaType: image.mediaType,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      if (reply.kind === 'bill') {
        setStage({ name: 'bill', bill: reply.bill, id })
        return
      }
      if (reply.problems.includes('nothing_paid')) {
        setStage({
          name: 'failed',
          message: t.receipts.allPoints,
        })
        return
      }
      const { receipt, canRecord } = reply
      alreadyRecorded =
        canRecord && (await isAlreadyRecorded(receipt, receipt.date ?? ''))
    } catch (err) {
      setStage({ name: 'failed', message: errorMessage(err) })
      return
    }

    const { receipt, problems, canRecord } = reply
    const entry = entryFrom(receipt, receipt.date ?? localDate(new Date()))
    const review = {
      name: 'review' as const,
      receipt,
      entry,
      id,
      problems,
      alreadyRecorded,
    }
    if (!canRecord || alreadyRecorded) {
      setStage(review)
      return
    }
    try {
      await post(toNewTransaction(receipt, entry, id, stored))
    } catch (err) {
      setStage({ ...review, saveError: errorMessage(err) })
    }
  }

  const saveReview = async (entry: ReceiptEntry) => {
    if (stage.name !== 'review') return
    try {
      await post(toNewTransaction(stage.receipt, entry, stage.id, stored))
    } catch (err) {
      setStage({ ...stage, saveError: errorMessage(err) })
    }
  }

  const payBill = async () => {
    if (stage.name !== 'bill') return
    try {
      await post(
        billToNewTransaction(
          stage.bill,
          stage.id,
          localDate(new Date()),
          stored,
        ),
      )
    } catch (err) {
      setStage({ ...stage, saveError: errorMessage(err) })
    }
  }

  const saveEdit = async (entry: ReceiptEntry) => {
    if (stage.name !== 'editing') return
    const { transaction } = stage
    try {
      const updated = await authRequest<Transaction>(
        `/api/v1/transactions/${transaction.id}`,
        {
          method: 'PATCH',
          body: { version: transaction.version, ...entry },
        },
      )
      setStage({ name: 'recorded', transaction: updated })
      refreshHome()
    } catch (err) {
      setStage({ ...stage, saveError: errorMessage(err) })
    }
  }

  const undo = async () => {
    if (stage.name !== 'recorded') return
    try {
      await authRequest<void>(`/api/v1/transactions/${stage.transaction.id}`, {
        method: 'DELETE',
      })
      setStage({ name: 'idle' })
      refreshHome()
    } catch (err) {
      setStage({ name: 'failed', message: errorMessage(err) })
    }
  }

  const edit = () => {
    if (stage.name === 'recorded') {
      setStage({ name: 'editing', transaction: stage.transaction })
    }
  }

  const cancelEdit = () => {
    if (stage.name === 'editing') {
      setStage({ name: 'recorded', transaction: stage.transaction })
    }
  }

  const close = () => setStage({ name: 'idle' })

  return {
    stage,
    scan,
    saveReview,
    payBill,
    saveEdit,
    undo,
    edit,
    cancelEdit,
    close,
  }
}
