import { capitalise } from '../format'
import type { Messages } from './en'

/** ledger-api stores categories in English; this is the name to show, as a heading would be. */
export const categoryName = (t: Messages, category: string) =>
  capitalise(t.categories[category] ?? category)
