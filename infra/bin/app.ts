import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { App } from 'aws-cdk-lib'
import { CertificateStack, type CustomDomain } from '../lib/certificate-stack'
import { CiAccessStack } from '../lib/ci-access-stack'
import { UiStack } from '../lib/ui-stack'

const app = new App()
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-southeast-2',
}
const context = (key: string) => {
  const value = app.node.tryGetContext(key)
  if (!value) throw new Error(`Set "${key}" in cdk.json`)
  return value
}

const assetsPath = fileURLToPath(new URL('../../dist', import.meta.url))
if (!existsSync(assetsPath)) {
  throw new Error(
    'No dist folder: run `npm run build` before cdk synth or deploy',
  )
}

// The certificate must come from us-east-1 for CloudFront, hence the second stack and
// cross-region references.
const domain: CustomDomain = context('customDomain')
const { certificate } = new CertificateStack(app, 'LedgerUiCertificate', {
  env: { ...env, region: 'us-east-1' },
  crossRegionReferences: true,
  domain,
})
new UiStack(app, 'LedgerUi', {
  env,
  crossRegionReferences: true,
  domain: { ...domain, certificate },
  apiOrigin: context('apiOrigin'),
  agentOrigin: context('agentOrigin'),
  assetsPath,
})
// Deployed once by hand; see README. The repo uses GitHub's immutable OIDC subject, which
// includes the owner and repo IDs, so the trust still holds if either is renamed.
new CiAccessStack(app, 'LedgerUiCiAccess', {
  env,
  githubSubjectPrefix: context('githubSubjectPrefix'),
})
