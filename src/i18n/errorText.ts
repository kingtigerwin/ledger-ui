import { ApiError } from '../api/client'
import type { Messages } from './en'

/** What to show for a failed call: the code's words in this language, else the server's message. */
export function errorText(t: Messages, err: unknown): string {
  if (err instanceof ApiError) return t.errors[err.code] ?? err.message
  return err instanceof Error ? err.message : t.common.somethingWrong
}
