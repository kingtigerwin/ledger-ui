import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findUser } from '../mocks/handlers'
import { renderApp, signIn } from '../test/renderApp'

async function openUsersAsSisi() {
  const app = renderApp('/login')
  await signIn(app.user, 'sisi', 'sisi-password')
  await app.user.click(await screen.findByRole('link', { name: /users/i }))
  return app
}

async function signOutAndSignInAs(
  user: Awaited<ReturnType<typeof openUsersAsSisi>>['user'],
  username: string,
  password: string,
) {
  await user.click(screen.getByRole('button', { name: /sign out/i }))
  await signIn(user, username, password)
}

describe('given sisi on the Users page', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lists the pending users', async () => {
    await openUsersAsSisi()
    const list = await screen.findByRole('list', { name: /pending users/i })
    expect(within(list).getByText('bob')).toBeInTheDocument()
    expect(within(list).queryByText('alice')).toBeNull()
  })

  it('approves a pending user, who can then sign in to the chat', async () => {
    const { user } = await openUsersAsSisi()
    await user.click(await screen.findByRole('button', { name: 'Approve bob' }))
    expect(await screen.findByText(/no pending users/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /active/i }))
    expect(await screen.findByText('bob')).toBeInTheDocument()

    await signOutAndSignInAs(user, 'bob', 'bob-password')
    expect(
      await screen.findByLabelText(/describe your spending/i),
    ).toBeInTheDocument()
  })

  it('rejects a pending user, who then cannot sign in', async () => {
    const { user } = await openUsersAsSisi()
    await user.click(await screen.findByRole('button', { name: 'Reject bob' }))
    expect(await screen.findByText(/no pending users/i)).toBeInTheDocument()
    expect(findUser('bob')?.status).toBe('disabled')

    await signOutAndSignInAs(user, 'bob', 'bob-password')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid username or password/i,
    )
  })

  it('deletes a user after confirming', async () => {
    const { user } = await openUsersAsSisi()
    await user.click(await screen.findByRole('button', { name: 'Delete bob' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(await screen.findByText(/no pending users/i)).toBeInTheDocument()
    expect(findUser('bob')).toBeUndefined()
  })

  it('keeps a user when the delete is not confirmed', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const { user } = await openUsersAsSisi()
    await user.click(await screen.findByRole('button', { name: 'Delete bob' }))
    expect(findUser('bob')).toBeDefined()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('offers no actions on admins', async () => {
    const { user } = await openUsersAsSisi()
    await user.click(await screen.findByRole('tab', { name: /active/i }))
    const list = await screen.findByRole('list', { name: /active users/i })
    expect(within(list).getByText('sisi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sisi/ })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Disable alice' }),
    ).toBeInTheDocument()
  })
})
