import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { I18nProvider } from './i18n/I18nProvider.tsx'
import './index.css'

const queryClient = new QueryClient({
  // Chat turns record expenses, so a failed one is never retried behind the user's back.
  defaultOptions: { mutations: { retry: false } },
})

async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <I18nProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </I18nProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
})
