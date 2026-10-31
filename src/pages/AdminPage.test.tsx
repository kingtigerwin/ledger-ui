import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteUserFromAnotherSession, findUser } from '../mocks/handlers'
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
  describe('deleting a user', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('warns that it cannot be undone, then removes them', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { user } = await openUsersAsSisi()
      await user.click(
        await screen.findByRole('button', { name: 'Delete bob' }),
      )
      expect(confirm).toHaveBeenCalledWith(
        expect.stringMatching(/bob.*transactions.*can't be undone/i),
      )
      expect(await screen.findByText(/no pending users/i)).toBeInTheDocument()
      expect(findUser('bob')).toBeUndefined()
    })

    it('keeps them if sisi changes their mind', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const { user } = await openUsersAsSisi()
      await user.click(
        await screen.findByRole('button', { name: 'Delete bob' }),
      )
      expect(findUser('bob')).toBeDefined()
      expect(screen.getByText('bob')).toBeInTheDocument()
    })

    it('offers it on the active and disabled tabs too', async () => {
      const { user } = await openUsersAsSisi()
      await user.click(screen.getByRole('tab', { name: /active/i }))
      expect(
        await screen.findByRole('button', { name: 'Delete alice' }),
      ).toBeInTheDocument()
    })

    it('signs a deleted user out on their next request', async () => {
      const { user } = renderApp('/login')
      await signIn(user, 'alice', 'alice-password')
      await screen.findByLabelText(/describe your spending/i)
      deleteUserFromAnotherSession('alice')

      await user.type(
        screen.getByLabelText(/describe your spending/i),
        'spent $5{Enter}',
      )

      expect(
        await screen.findByRole('heading', { name: /sign in/i }),
      ).toBeInTheDocument()
    })

    it('never offers it for sisi', async () => {
      const { user } = await openUsersAsSisi()
      await user.click(screen.getByRole('tab', { name: /active/i }))
      await screen.findByRole('list', { name: /active users/i })
      expect(screen.queryByRole('button', { name: 'Delete sisi' })).toBeNull()
    })
  })

  it('lists the pending users', async () => {
    await openUsersAsSisi()
    const list = await screen.findByRole('list', { name: /pending users/i })
    expect(within(list).getByText('bob')).toBeInTheDocument()
    expect(within(list).queryByText('alice')).toBeNull()
  })

  it("shows each user's email, and nothing for users without one", async () => {
    const { user } = await openUsersAsSisi()
    const pending = await screen.findByRole('list', { name: /pending users/i })
    expect(within(pending).getByText('bob@example.com')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /active/i }))
    const active = await screen.findByRole('list', { name: /active users/i })
    expect(within(active).getByText('alice@example.com')).toBeInTheDocument()
    expect(within(active).queryByText(/@/)).toHaveTextContent(
      'alice@example.com',
    )
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
