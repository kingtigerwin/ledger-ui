import { useEffect, useRef } from 'react'

/**
 * Blocks the whole page while a receipt is read. It's a native modal dialog, so the browser also
 * stops the keyboard reaching anything behind it. There's nothing to cancel: the read is already
 * paid for and may end in a recorded expense, so Escape does nothing.
 */
export function WaitingModal({ message }: { message: string }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-label={message}
      onCancel={(event) => event.preventDefault()}
      // Chrome lets a second Escape through regardless of the handler above.
      onClose={(event) => event.currentTarget.showModal()}
      className="m-auto rounded-2xl bg-white p-6 shadow-lg backdrop:bg-slate-900/50"
    >
      <div className="flex items-center gap-3">
        <span
          data-testid="spinner"
          aria-hidden="true"
          className="size-6 shrink-0 animate-spin rounded-full border-3 border-slate-200 border-t-indigo-600"
        />
        <p className="text-slate-700">{message}</p>
      </div>
    </dialog>
  )
}
