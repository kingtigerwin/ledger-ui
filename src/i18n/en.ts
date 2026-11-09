import type { ReceiptProblem, UserStatus } from '../api/types'

/**
 * Every word the UI shows, in English. `zh-CN.ts` has the same shape, so TypeScript fails the
 * build if a translation is missing. Amounts and dates arrive already formatted (`format.ts`).
 */
export const en = {
  common: {
    loading: 'Loading…',
    tryAgain: 'Try again',
    somethingWrong: 'Something went wrong. Please try again.',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    dismiss: 'Dismiss',
    total: 'Total',
    backToSignIn: 'Back to sign in',
    /** "Coles · 3 Nov 2026" */
    separator: ' · ',
  },
  language: {
    label: 'Language',
    auto: 'Auto (device language)',
  },
  nav: {
    home: 'Home',
    chat: 'Chat',
    users: 'Users',
    signOut: 'Sign out',
  },
  auth: {
    username: 'Username',
    password: 'Password',
    email: 'Email',
    signInTitle: 'Sign in',
    signInSubtitle: 'Record your spending by chatting.',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    or: 'or',
    noAccount: 'No account yet?',
    register: 'Register',
    continueWithGoogle: 'Continue with Google',
    googleFailed:
      "Google sign-in didn't work. Please try again, or use your username and password.",
    googleUnavailable: "Google sign-in isn't available right now.",
    registerTitle: 'Register',
    registerSubtitle: 'An admin approves new accounts before they can sign in.',
    creatingAccount: 'Creating account…',
    createAccount: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    invalidEmail: 'Enter a valid email address.',
    accountCreated: 'Account created',
    checkEmail: 'Check your email: your account is waiting for approval.',
    pendingTitle: "Thanks, you're nearly in",
    pendingBody:
      "Your account is waiting for approval. We'll email you when it's ready.",
  },
  home: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    /** "Good morning, alice" */
    greetingName: (greeting: string, name: string) => `${greeting}, ${name}`,
    subtitle: 'Your financial inbox',
    thisMonthsSpend: "This month's spend",
    couldntLoadSpend: "Couldn't load your spend.",
    nothingYet: 'Nothing recorded yet this month',
    byCategory: 'by category',
    toReview: 'To review',
    attention: 'Needs your attention',
    checking: 'Checking…',
    couldntCheck: "Couldn't check what needs your attention.",
    nothingNeedsAttention: 'Nothing needs your attention',
    nothingNeedsAttentionBody:
      'The more you record, the more Ledger can spot. You can add past expenses in the chat too, such as “I paid $900 rego last November”.',
  },
  summary: {
    couldntLoad: "Couldn't load these.",
    categoryTransactions: (category: string) => `${category} transactions`,
    items: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
  },
  insights: {
    regoWasDue: (due: string) => `Car rego was due around ${due}`,
    regoDue: (due: string) => `Car rego due around ${due}`,
    regoBody: (amount: string, date: string) =>
      `Estimated from your last payment of ${amount} on ${date}`,
    viewPayment: 'View payment',
    duplicateTitle: 'Possibly recorded twice',
    duplicateBody: (
      merchant: string,
      amount: string,
      times: number,
      dates: string[],
    ) =>
      `${merchant}, ${amount}, recorded ${times} times on ${dates.join(' and ')}`,
    review: 'Review',
    notDuplicate: 'Not a duplicate',
    priceRiseTitle: (merchant: string) => `${merchant} went up`,
    priceRiseBody: (
      from: string,
      to: string,
      since: string,
      extraPerYear: string,
    ) => `${from} → ${to} since ${since}, ${extraPerYear} more a year`,
    viewCharges: 'View charges',
    confirmDelete: (item: string, amount: string, date: string) =>
      `Delete ${item}, ${amount} on ${date}? This can't be undone.`,
    deleteLabel: (item: string, date: string) => `Delete ${item} on ${date}`,
  },
  ask: {
    label: 'Ask Ledger',
    placeholder: 'Ask Ledger anything about your finances…',
    ask: 'Ask',
  },
  chat: {
    newChat: 'New chat',
    emptyTitle: 'What did you spend today?',
    emptyBody:
      'Describe your purchases in your own words, or ask about your spending.',
    tryExample: 'Try an example:',
    examples: [
      'Today I went to Woolworths and spent $30 on cake',
      'Coffee at Starbucks for 5 dollars yesterday',
      'How much have I spent this month?',
      'How much did I spend on bananas?',
    ],
    inputLabel: 'Describe your spending',
    placeholder:
      'e.g. Today I went to Coles and spent $30 on food and $6 on coffee',
    keyHint: 'Enter to send · Shift+Enter for a new line',
    send: 'Send',
    dailyLimit: (limit: number) =>
      `Each person can send ${limit} messages a day. This resets at midnight Sydney time.`,
    retry: 'Retry',
    conversation: 'Conversation',
    thinking: 'Assistant is thinking',
  },
  transactions: {
    recorded: 'Recorded',
    found: 'Found',
    unknownUser: 'Unknown user',
    subtotals: 'Subtotals by person',
    couldntLoadItems: "Couldn't load the items.",
  },
  purchases: {
    range: (from: string, to: string) => `${from} to ${to}`,
    label: 'Purchases found',
    showing: (shown: number, count: number) =>
      `Showing ${shown} of ${count}. The total covers them all.`,
    points: 'These are shelf prices. Some was paid with points.',
  },
  receipts: {
    section: 'Scan a receipt',
    takePhoto: 'Take photo',
    upload: 'Upload photo or PDF',
    ofReceipt: 'of a receipt',
    uploading: 'Your receipt is uploading, please wait…',
    problems: {
      merchant_unreadable: "The merchant couldn't be read.",
      date_unreadable: "The date couldn't be read.",
      date_in_future: 'The date is in the future.',
      date_too_old: 'The date is over a year old.',
      lines_dont_add_up: "The lines don't add up to the total.",
      payments_dont_add_up: "The payments don't add up to the total.",
    } as Partial<Record<ReceiptProblem, string>>,
    alreadyRecorded:
      'This looks already recorded: there is a transaction with the same amount or receipt number that day.',
    merchant: 'Merchant',
    date: 'Date',
    amountPaid: 'Amount paid',
    category: 'Category',
    bill: 'Bill',
    /** "This is a bill from Whitehorse City Council for council rates: $583.00, due 30 Nov 2026." */
    describeBill: (bill: {
      biller?: string
      item?: string
      amount: string
      due?: string
    }) => {
      const amount = `${bill.amount}${bill.due ? `, due ${bill.due}` : ''}`
      const what = [
        bill.biller && `from ${bill.biller}`,
        bill.item && `for ${bill.item}`,
      ]
        .filter(Boolean)
        .join(' ')
      return what
        ? `This is a bill ${what}: ${amount}.`
        : `This is a bill for ${amount}.`
    },
    havePaid: 'Have you paid it?',
    no: 'No',
    yes: 'Yes',
    recordedAmount: (amount: string, merchant?: string) =>
      `Recorded ${amount}${merchant ? ` at ${merchant}` : ''}.`,
    pointsPaid: (label: string, amount: string) => `${label} paid ${amount}.`,
    edit: 'Edit',
    undo: 'Undo',
    pdfTooLarge:
      'That PDF is too large (over 3 MB). Try a smaller one, or a screenshot of the bill or receipt.',
    cantOpen:
      "Ledger couldn't open that photo. Please try a JPEG or PNG image, or a PDF.",
    allPoints:
      'This receipt was paid entirely with points, so there is no money to record.',
    items: 'Receipt items',
    receiptTotal: 'Receipt total',
    gst: 'GST included',
    saved: 'You saved',
    /** Saved with the transaction, so in the language it was recorded in. */
    stored: {
      items: (count: number) => `${count} items`,
      receipt: 'Receipt',
      bill: 'Bill',
      billDue: (date: string) => `Bill due ${date}`,
    },
  },
  admin: {
    title: 'Users',
    tabs: {
      pending: 'Pending',
      active: 'Active',
      disabled: 'Disabled',
    } as Record<UserStatus, string>,
    none: {
      pending: 'No pending users.',
      active: 'No active users.',
      disabled: 'No disabled users.',
    } as Record<UserStatus, string>,
    list: (status: UserStatus) => `${status} users`,
    approve: 'Approve',
    reject: 'Reject',
    disable: 'Disable',
    enable: 'Enable',
    adminBadge: 'admin',
    registered: (date: string) => `Registered ${date}`,
    confirmDelete: (username: string) =>
      `Delete ${username} and all their transactions? This can't be undone.`,
    action: (label: string, username: string) => `${label} ${username}`,
  },
  /** ledger-api's categories; it stores the English names. */
  categories: {
    groceries: 'groceries',
    dining: 'dining',
    transport: 'transport',
    utilities: 'utilities',
    rent: 'rent',
    health: 'health',
    education: 'education',
    shopping: 'shopping',
    entertainment: 'entertainment',
    other: 'other',
  } as Record<string, string>,
  /**
   * Words for ledger-api's and ledger-agent's error codes. Their own messages are English, so
   * English needs none; any code a language leaves out shows the server's message.
   */
  errors: {} as Partial<Record<string, string>>,
}

export type Messages = typeof en
