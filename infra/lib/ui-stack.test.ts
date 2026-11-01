// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'
import { CertificateStack, type CustomDomain } from './certificate-stack'
import { UiStack } from './ui-stack'

const domain: CustomDomain = {
  domainName: 'ledger.example.cloud',
  redirectDomains: ['other.example.cloud'],
  zoneName: 'example.cloud',
  hostedZoneId: 'ZEXAMPLE123',
}

const synth = () => {
  const app = new App()
  const env = { account: '111111111111', region: 'ap-southeast-2' }
  const { certificate } = new CertificateStack(app, 'Certificate', {
    env: { ...env, region: 'us-east-1' },
    crossRegionReferences: true,
    domain,
  })
  const ui = new UiStack(app, 'Ui', {
    env,
    crossRegionReferences: true,
    domain: { ...domain, certificate },
    apiOrigin: 'api.example.cloud',
    agentOrigin: 'agent.example.cloud',
    assetsPath: mkdtempSync(join(tmpdir(), 'dist-')),
  })
  return {
    certificate: Template.fromStack(
      app.node.findChild('Certificate') as CertificateStack,
    ),
    ui: Template.fromStack(ui),
  }
}

const { certificate, ui } = synth()

type Request = {
  uri: string
  headers: { host: { value: string } }
  querystring: Record<string, { value: string }>
}
type Viewer = (event: { request: Request }) => Record<string, unknown>

// The function exactly as CloudFront gets it, so this runs what is deployed.
const viewer = (): Viewer => {
  const functions = Object.values(ui.findResources('AWS::CloudFront::Function'))
  const code = functions[0].Properties.FunctionCode as string
  return new Function(`${code}; return handler`)() as Viewer
}

const visit = (
  host: string,
  uri: string,
  querystring: Request['querystring'] = {},
) =>
  viewer()({
    request: { uri, headers: { host: { value: host } }, querystring },
  })

describe('given the UI stack', () => {
  it('covers every name with one certificate, validated in the zone', () => {
    certificate.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'ledger.example.cloud',
      SubjectAlternativeNames: ['other.example.cloud'],
      ValidationMethod: 'DNS',
    })
  })

  it('serves every name from the one distribution', () => {
    ui.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['ledger.example.cloud', 'other.example.cloud'],
      }),
    })
  })

  it.each(['A', 'AAAA'])('points every name at it with %s aliases', (Type) => {
    for (const Name of ['ledger.example.cloud.', 'other.example.cloud.']) {
      ui.hasResourceProperties('AWS::Route53::RecordSet', {
        Name,
        Type,
        HostedZoneId: 'ZEXAMPLE123',
      })
    }
  })
})

describe('given a visit to the main name', () => {
  it('serves the app for its routes', () => {
    expect(visit('ledger.example.cloud', '/chat')).toMatchObject({
      uri: '/index.html',
    })
  })

  it('leaves files alone', () => {
    expect(visit('ledger.example.cloud', '/assets/app.js')).toMatchObject({
      uri: '/assets/app.js',
    })
  })
})

describe('given a visit to the other name', () => {
  it('redirects to the same page on the main name', () => {
    expect(visit('other.example.cloud', '/chat')).toEqual({
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://ledger.example.cloud/chat' } },
    })
  })

  it('keeps the query string', () => {
    const response = visit('other.example.cloud', '/login', {
      a: { value: '1' },
      b: { value: 'x%20y' },
    })

    expect(response.headers).toEqual({
      location: { value: 'https://ledger.example.cloud/login?a=1&b=x%20y' },
    })
  })
})
