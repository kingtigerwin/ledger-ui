# ledger-ui

The web UI for [ledger-api](https://github.com/kingtigerwin/ledger-api) and [ledger-agent](https://github.com/kingtigerwin/ledger-agent): React 19, React Router, React Context for auth, TanStack Query, Tailwind. Served at `https://ledger.haoran.cloud` from S3 behind CloudFront, deployed by GitHub Actions with AWS CDK.

- **Sign in** (`/login`): username and password. Active users go to Home; pending users go to the waiting page.
- **Register** (`/register`, linked from sign in): creates a `pending` account.
- **Waiting** (`/pending`): where pending users land. Only password sign-ups wait for approval; Google users go straight to Home. It has no chat, and they hold no token.
- **Home** (`/`, signed-in only): this month's spend, with a breakdown by category, and the cards ledger-api found that need attention: car rego coming due, an expense possibly recorded twice, a price rise. The rules are in ledger-api, the wording is here. Each card can be dismissed, and a possible duplicate can be deleted. The box at the bottom sends its question to the chat.
  - **Receipts:** Take photo opens the phone's camera, needing no permission, and Upload photo or PDF opens the library or files. The browser shrinks a photo, which also drops its location data, and sends a PDF as it is (up to 3 MB; ledger-agent takes up to 5 pages); ledger-agent reads either. If the sums and date check out and it isn't already in the ledger, it's recorded straight away, with Undo and Edit. Otherwise the customer checks a form first. What's saved is the money paid, so a shop paid mostly with Flybuys records what actually left the bank. Photos and PDFs aren't stored.
- **Chat** (`/chat`, signed-in only): describe spending in plain words; ledger-agent records it or answers questions about it, including what was bought ("how much did I spend on bananas?"), which it shows as a table of matching receipt lines and typed expenses. Each person gets 5 messages a day and everyone together 300, which ledger-agent enforces.
- **Users** (`/admin`, admins such as `sisi` only): pending, active and disabled users. Approve enables a user (they can then sign in); Reject disables them (they can't).
- **Language**: English or Simplified Chinese, from the menu on the sign-in card and in the header. Until someone chooses, the app follows the first of the browser's languages (which start from the system's) that it has, else English; "Auto" goes back to that. A choice is remembered in the browser and, once signed in, saved to the profile (`PATCH /api/v1/auth/me`), which wins on any device and sets the language of the account emails. Every word is in `src/i18n/en.ts`, and `zh-CN.ts` must have the same keys or the build fails. ledger-api sends codes, not sentences, for errors, categories and Home cards; the Chinese words for them are here, and a code without them shows the server's English message.

## How it fits together

```
browser ── https://ledger.haoran.cloud (CloudFront)
             ├─ /api/*    → api.haoran.cloud    (ledger-api)
             ├─ /agent/*  → agent.haoran.cloud  (ledger-agent)
             └─ /*        → S3 bucket (the app; routes without a file extension get index.html)
```

One origin for everything, so there's no CORS and ledger-api's `HttpOnly` refresh cookie (`Path=/api/v1/auth`) is first-party. The access token (15 minutes) lives only in memory; on load, and whenever a call gets a 401, the app trades the cookie for a new one (`src/api/client.ts`, `src/auth/AuthProvider.tsx`). ledger-api rotates refresh tokens and revokes all of a user's tokens if an old one is replayed, so concurrent refreshes share one request.

## Develop

```sh
npm ci
npm run dev        # http://localhost:5173, proxying /api and /agent to the deployed backends
npm test           # Vitest + Testing Library, backends mocked with MSW
npm run typecheck && npm run lint
```

To run without the real backends, copy `.env.example` to `.env.local` and set `VITE_USE_MOCKS=true`: an in-memory mock (`src/mocks/handlers.ts`) answers instead, with users `sisi` / `sisi-password` (admin), `alice` / `alice-password` (active, with one of each Home card) and `bob` / `bob-password` (pending). `API_ORIGIN` and `AGENT_ORIGIN` point the dev proxy elsewhere, e.g. `API_ORIGIN=http://localhost:3000 npm run dev`.

## Infrastructure

`infra/` is a CDK app (TypeScript) with three stacks, configured in `cdk.json`:

| Stack | Region | What |
|---|---|---|
| `LedgerUiCertificate` | us-east-1 | ACM certificate for `ledger.haoran.cloud` (CloudFront only takes certificates from there), DNS-validated in the existing `haoran.cloud` zone. |
| `LedgerUi` | ap-southeast-2 | Private S3 bucket (Origin Access Control), CloudFront with the routes above, security headers, the build uploaded with `BucketDeployment` (hashed assets cached for a year, `index.html` revalidated every load), and `A`/`AAAA` alias records for `ledger.haoran.cloud`. |
| `LedgerUiCiAccess` | ap-southeast-2 | The IAM role GitHub Actions deploys with (OIDC, `main` only; it can only assume CDK's bootstrap roles). Reuses the account's GitHub OIDC provider, which ledger-api's `LedgerApiCiAccess` owns. |

The zone is imported by ID and never changed apart from this UI's records and ACM's validation record.

## First deploy (once, from your machine)

1. With AWS credentials for the account in your shell (both regions are already CDK-bootstrapped by ledger-api):

   ```sh
   npm ci && npm run build
   npx cdk deploy LedgerUiCiAccess
   ```

   Note the `DeployRoleArn` output.

2. In the GitHub repo's **Settings → Secrets and variables → Actions**, add:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `AWS_DEPLOY_ROLE_ARN` | the `DeployRoleArn` output (a secret, so the account ID in it stays out of the public logs) |
   | Variable | `DEPLOY_ENABLED` | `true` (turns the deploy job on) |

3. Push to `main` (or run the CI workflow from the Actions tab). The `test` job runs typecheck, lint, format check, tests, build and `cdk synth`; the `deploy` job then runs `cdk deploy LedgerUi` (which deploys `LedgerUiCertificate` first) and `scripts/smoke.sh` against `https://ledger.haoran.cloud`. The first deploy takes a while: CloudFront distributions are slow to create.

Run the smoke test yourself with `UI_URL=https://ledger.haoran.cloud npm run smoke`.

## Cost

Within the AWS free tier at household traffic: S3 holds well under 1 MB, CloudFront's free tier covers 1 TB and 10 million requests a month, the CloudFront Function and the deploy Lambda are free at this volume, the certificate is free, and Route 53 doesn't charge for alias queries to CloudFront. The `haoran.cloud` zone already existed.
