import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib'
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager'
import {
  AllowedMethods,
  type BehaviorOptions,
  CachePolicy,
  Distribution,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import {
  AaaaRecord,
  ARecord,
  HostedZone,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53'
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets'
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import {
  BucketDeployment,
  CacheControl,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment'
import type { Construct } from 'constructs'
import type { CustomDomain } from './certificate-stack'

export interface UiStackProps extends StackProps {
  domain: CustomDomain & { certificate: ICertificate }
  /** ledger-api's host, e.g. api.haoran.cloud; CloudFront forwards /api/* to it. */
  apiOrigin: string
  /** ledger-agent's host, e.g. agent.haoran.cloud; CloudFront forwards /agent/* to it. */
  agentOrigin: string
  /** The built UI (Vite's dist folder). */
  assetsPath: string
}

/**
 * The UI: a private S3 bucket behind CloudFront, which also forwards /api/* to ledger-api and
 * /agent/* to ledger-agent. One origin for the browser means no CORS, and ledger-api's
 * HttpOnly refresh cookie (Path=/api/v1/auth) is first-party to ledger.haoran.cloud.
 */
export class UiStack extends Stack {
  constructor(scope: Construct, id: string, props: UiStackProps) {
    super(scope, id, props)

    // Holds only the build output, which CI can always redeploy, so it goes with the stack.
    const bucket = new Bucket(this, 'Site', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // App routes (/login, /chat, /admin) have no file in the bucket; serve the app for them.
    // This runs only on the bucket's behaviour: an error page rule would also rewrite the
    // API's own 403s and 404s (such as account_pending) into index.html.
    const spaRewrite = new CloudFrontFunction(this, 'SpaRewrite', {
      runtime: FunctionRuntime.JS_2_0,
      code: FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('.') === -1) request.uri = '/index.html';
  return request;
}`),
    })

    const securityHeaders = new ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: false,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
    })

    // Passed through untouched: nothing cached, and Authorization, cookies and query strings
    // reach the backend. The Host header is left out so each backend sees its own name.
    const proxyTo = (origin: HttpOrigin): BehaviorOptions => ({
      origin,
      viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    })

    const distribution = new Distribution(this, 'Cdn', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        functionAssociations: [
          { function: spaRewrite, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        '/api/*': proxyTo(new HttpOrigin(props.apiOrigin)),
        // The agent's HTTP API times out at 30 seconds; give it a little longer than that.
        '/agent/*': proxyTo(
          new HttpOrigin(props.agentOrigin, {
            readTimeout: Duration.seconds(35),
          }),
        ),
      },
      defaultRootObject: 'index.html',
      domainNames: [props.domain.domainName],
      certificate: props.domain.certificate,
      priceClass: PriceClass.PRICE_CLASS_100,
    })

    // Hashed files never change, so browsers may keep them; index.html is checked every time,
    // so a deploy shows up on the next load. The assets go first so index.html never names a
    // file that isn't there yet. Neither prunes, so a page loaded before a deploy keeps working.
    const assets = new BucketDeployment(this, 'DeployAssets', {
      sources: [Source.asset(props.assetsPath)],
      destinationBucket: bucket,
      exclude: ['*'],
      include: ['assets/*'],
      cacheControl: [
        CacheControl.fromString('public, max-age=31536000, immutable'),
      ],
      prune: false,
    })
    const pages = new BucketDeployment(this, 'DeployPages', {
      sources: [Source.asset(props.assetsPath)],
      destinationBucket: bucket,
      exclude: ['assets/*'],
      cacheControl: [CacheControl.noCache()],
      prune: false,
      distribution,
      distributionPaths: ['/*'],
    })
    pages.node.addDependency(assets)

    // Only adds the UI's own records; the zone and its other records belong to whoever manages the domain.
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      zoneName: props.domain.zoneName,
      hostedZoneId: props.domain.hostedZoneId,
    })
    const target = RecordTarget.fromAlias(new CloudFrontTarget(distribution))
    const recordName = props.domain.domainName
    new ARecord(this, 'UiAliasIpv4', { zone, recordName, target })
    new AaaaRecord(this, 'UiAliasIpv6', { zone, recordName, target })

    new CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
    })
    new CfnOutput(this, 'UiUrl', { value: `https://${recordName}` })
  }
}
