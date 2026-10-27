import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { resetMockDb } from '../mocks/handlers'
import { server } from '../mocks/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => resetMockDb())
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
