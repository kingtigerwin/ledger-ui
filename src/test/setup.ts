import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { resetMockDb } from '../mocks/handlers'
import { server } from '../mocks/server'

// jsdom has no modal dialogs; what they block is checked in a real browser.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => resetMockDb())
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
