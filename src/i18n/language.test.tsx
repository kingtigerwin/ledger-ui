import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findUser, setUserLocale } from '../mocks/handlers'
import { renderApp, signIn } from '../test/renderApp'

const browserAsksFor = (...languages: string[]) =>
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)

const languageMenu = () => screen.findByRole('combobox', { name: /language/i })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('given a visitor who has never chosen a language', () => {
  it('shows Chinese when their browser asks for it', async () => {
    browserAsksFor('zh-CN', 'en')
    renderApp('/login')

    expect(
      await screen.findByRole('heading', { name: '登录' }),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('shows English when their browser asks only for languages Ledger lacks', async () => {
    browserAsksFor('fr-FR', 'de')
    renderApp('/login')

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('given a visitor who chooses a language on the login page', () => {
  it('switches at once and keeps it after a reload', async () => {
    browserAsksFor('en-AU')
    const { user } = renderApp('/login')

    await user.selectOptions(await languageMenu(), 'zh-CN')
    expect(
      await screen.findByRole('heading', { name: '登录' }),
    ).toBeInTheDocument()

    cleanup()
    renderApp('/login')
    expect(
      await screen.findByRole('heading', { name: '登录' }),
    ).toBeInTheDocument()
  })

  it('registers them with that language, for their emails', async () => {
    browserAsksFor('en-AU')
    const { user } = renderApp('/register')
    await user.selectOptions(await languageMenu(), 'zh-CN')

    await user.type(screen.getByLabelText('用户名'), 'mei')
    await user.type(screen.getByLabelText('电子邮箱'), 'mei@example.com')
    await user.type(screen.getByLabelText('密码'), 'pw')
    await user.click(screen.getByRole('button', { name: '创建账户' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(findUser('mei')?.locale).toBe('zh-CN')
  })
})

describe('given a signed-in customer', () => {
  it('saves the language they choose to their profile', async () => {
    browserAsksFor('en-AU')
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    await screen.findByLabelText(/ask ledger/i)

    await user.selectOptions(await languageMenu(), 'zh-CN')

    const nav = await screen.findByRole('navigation')
    expect(within(nav).getByRole('link', { name: '首页' })).toBeInTheDocument()
    await waitFor(() => expect(findUser('alice')?.locale).toBe('zh-CN'))
  })

  it('goes back to their browser language when they choose Auto', async () => {
    browserAsksFor('en-AU')
    setUserLocale('alice', 'zh-CN')
    const { user } = renderApp('/login')
    await signIn(user, 'alice', 'alice-password')
    await screen.findByRole('link', { name: '首页' })

    await user.selectOptions(await languageMenu(), 'auto')

    expect(
      await screen.findByRole('link', { name: 'Home' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(findUser('alice')?.locale).toBeUndefined())
  })
})

describe('given a customer who chose Chinese on another device', () => {
  it('shows Chinese once they sign in, even on an English browser', async () => {
    browserAsksFor('en-AU')
    setUserLocale('alice', 'zh-CN')
    const { user } = renderApp('/login')

    await signIn(user, 'alice', 'alice-password')

    expect(
      await screen.findByRole('link', { name: '首页' }),
    ).toBeInTheDocument()
    expect(await languageMenu()).toHaveValue('zh-CN')
  })
})
