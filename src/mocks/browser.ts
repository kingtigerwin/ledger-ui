import { setupWorker } from 'msw/browser'
import { handlers, seedInsight } from './handlers'
import { possibleDuplicate, priceRise, regoDue } from './insights'

// So alice's Home page shows every kind of card under `VITE_USE_MOCKS=true`.
for (const insight of [regoDue, possibleDuplicate, priceRise]) {
  seedInsight('alice', insight)
}

export const worker = setupWorker(...handlers)
