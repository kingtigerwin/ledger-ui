import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { AuthProvider } from '../auth/AuthProvider'
import { I18nProvider } from '../i18n/I18nProvider'

/** Renders the whole app at `path`, as a fresh page load would. */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <I18nProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { user }
}

export async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  username: string,
  password: string,
) {
  await user.type(await screen.findByLabelText(/username/i), username)
  await user.type(screen.getByLabelText(/password/i), password)
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}
