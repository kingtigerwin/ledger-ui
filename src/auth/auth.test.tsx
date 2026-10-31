import { cleanup, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, findUser } from '../mocks/handlers'
import { renderApp, signIn } from '../test/renderApp'

describe('given a visitor who is not signed in', () => {
  it('sends them from the chat page to the login page', async () => {
    renderApp('/chat')
    expect(
      await screen.findByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/describe your spending/i)).toBeNull()
  })

  it('signs an active user in and opens the chat page', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    expect(
      await screen.findByLabelText(/describe your spending/i),
    ).toBeInTheDocument()
  })

  it('returns them to the page they asked for after signing in', async () => {
    const { user } = renderApp('/admin')
    await signIn(user, 'sisi', 'sisi-password')
    expect(
      await screen.findByRole('heading', { name: /users/i }),
    ).toBeInTheDocument()
  })

  it('refuses a wrong password', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid username or password/i,
    )
  })

  it('sends a pending user to the waiting page, with no chat', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'bob', 'bob-password')
    expect(
      await screen.findByRole('heading', { name: /nearly in/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/describe your spending/i)).toBeNull()
  })
})

describe('given the login page', () => {
  it('links to Google sign-in, which the server runs', async () => {
    renderApp('/login')
    expect(
      await screen.findByRole('link', { name: /continue with google/i }),
    ).toHaveAttribute('href', '/api/v1/auth/google/start')
  })

  it.each([
    ['google_failed', /google sign-in didn't work/i],
    ['google_unavailable', /isn't available/i],
  ])('explains the error %s from Google sign-in', async (code, message) => {
    renderApp(`/login?error=${code}`)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('ignores an error it does not know', async () => {
    renderApp('/login?error=<script>')
    await screen.findByRole('heading', { name: /sign in/i })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('given the waiting page', () => {
  it('says the account is waiting and an email will follow', async () => {
    renderApp('/pending')
    expect(await screen.findByRole('status')).toHaveTextContent(
      /waiting for approval.*email you/i,
    )
    expect(screen.queryByLabelText(/describe your spending/i)).toBeNull()
  })

  it('leads a Google user back through Google', async () => {
    renderApp('/pending?via=google')
    expect(
      await screen.findByRole('link', { name: /continue with google/i }),
    ).toHaveAttribute('href', '/api/v1/auth/google/start')
  })

  it("doesn't offer Google to a password user, who'd get a second account", async () => {
    renderApp('/pending')
    expect(
      await screen.findByRole('link', { name: /back to sign in/i }),
    ).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: /google/i })).toBeNull()
  })

  it('sends someone already signed in to the chat', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    await screen.findByLabelText(/describe your spending/i)
    cleanup()
    renderApp('/pending')
    expect(
      await screen.findByLabelText(/describe your spending/i),
    ).toBeInTheDocument()
  })
})

describe('given the register page', () => {
  it('is linked from the login page', async () => {
    const { user } = renderApp('/login')
    await user.click(await screen.findByRole('link', { name: /register/i }))
    expect(
      screen.getByRole('heading', { name: /register/i }),
    ).toBeInTheDocument()
  })

  it('creates a pending account that cannot sign in yet', async () => {
    const { user } = renderApp('/register')
    await user.type(screen.getByLabelText(/username/i), 'carol')
    await user.type(screen.getByLabelText(/email/i), 'carol@example.com')
    await user.type(screen.getByLabelText(/password/i), 'carol-password')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Check your email: your account is waiting for approval.',
    )
    expect(findUser('carol')?.email).toBe('carol@example.com')

    await user.click(screen.getByRole('link', { name: /back to sign in/i }))
    await signIn(user, 'carol', 'carol-password')
    expect(
      await screen.findByRole('heading', { name: /nearly in/i }),
    ).toBeInTheDocument()
  })

  it('reports a taken username', async () => {
    const { user } = renderApp('/register')
    await user.type(screen.getByLabelText(/username/i), 'alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'whatever')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/taken/i)
  })

  it('requires an email of at most 254 characters', () => {
    renderApp('/register')
    const email = screen.getByLabelText(/email/i)
    expect(email).toBeRequired()
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('maxLength', '254')
  })

  it('shows an email the API rejects next to the email field', async () => {
    const { user } = renderApp('/register')
    await user.type(screen.getByLabelText(/username/i), 'carol')
    // The browser accepts this, but the API wants a domain with a dot.
    await user.type(screen.getByLabelText(/email/i), 'carol@example')
    await user.type(screen.getByLabelText(/password/i), 'carol-password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const email = screen.getByLabelText(/email/i)
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(email).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.queryByRole('status')).toBeNull()
    expect(findUser('carol')).toBeUndefined()
  })
})

describe('given a signed-in user', () => {
  it('stays signed in across a reload, using the refresh cookie', async () => {
    const first = renderApp('/login')
    await signIn(first.user, 'alice', 'alice-password')
    await screen.findByLabelText(/describe your spending/i)

    // A reload: a new app with no token in memory.
    document.body.innerHTML = ''
    renderApp('/chat')
    expect(
      await screen.findByLabelText(/describe your spending/i),
    ).toBeInTheDocument()
  })

  it('is signed out by Sign out and can no longer open the chat', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    await user.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(
      await screen.findByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument()

    document.body.innerHTML = ''
    renderApp('/chat')
    expect(
      await screen.findByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument()
  })

  it('does not show the Users page to a customer', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    await screen.findByLabelText(/describe your spending/i)
    expect(screen.queryByRole('link', { name: /users/i })).toBeNull()

    endSession()
    document.body.innerHTML = ''
    renderApp('/admin')
    // With the session gone, /admin goes to login rather than showing anything.
    expect(
      await screen.findByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument()
  })

  it('sends a customer who opens /admin to the chat', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    await screen.findByLabelText(/describe your spending/i)

    document.body.innerHTML = ''
    renderApp('/admin')
    expect(
      await screen.findByLabelText(/describe your spending/i),
    ).toBeInTheDocument()
  })
})
