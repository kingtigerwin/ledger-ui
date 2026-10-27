import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../mocks/handlers'
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

  it('tells a pending user they are waiting for approval', async () => {
    const { user } = renderApp('/login')
    await signIn(user, 'bob', 'bob-password')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /waiting for admin approval/i,
    )
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
    await user.type(screen.getByLabelText(/password/i), 'carol-password')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/pending/i)

    await user.click(screen.getByRole('link', { name: /back to sign in/i }))
    await signIn(user, 'carol', 'carol-password')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /waiting for admin approval/i,
    )
  })

  it('reports a taken username', async () => {
    const { user } = renderApp('/register')
    await user.type(screen.getByLabelText(/username/i), 'alice')
    await user.type(screen.getByLabelText(/password/i), 'whatever')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/taken/i)
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
