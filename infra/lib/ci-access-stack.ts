import { Arn, CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib'
import {
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

const GITHUB_OIDC = 'token.actions.githubusercontent.com'

export interface CiAccessStackProps extends StackProps {
  /**
   * The start of the `sub` claim in the repo's GitHub OIDC tokens. Repos using GitHub's immutable
   * subject format send `repo:<owner>@<ownerId>/<repo>@<repoId>`; look it up with
   * `gh api repos/<owner>/<repo>/actions/oidc/customization/sub` (`sub_claim_prefix`).
   */
  githubSubjectPrefix: string
}

/**
 * Deployed once from a laptop: lets GitHub Actions on the repo's main branch deploy, with no
 * stored AWS keys. CI can't create the role it signs in with, which is why this is separate.
 */
export class CiAccessStack extends Stack {
  constructor(scope: Construct, id: string, props: CiAccessStackProps) {
    super(scope, id, props)

    // The account's GitHub provider already exists (ledger-api's LedgerApiCiAccess stack owns it);
    // an account can have only one per URL, so this stack refers to it rather than creating one.
    const providerArn = Arn.format(
      {
        service: 'iam',
        region: '',
        resource: 'oidc-provider',
        resourceName: GITHUB_OIDC,
      },
      this,
    )

    const role = new Role(this, 'DeployRole', {
      roleName: 'ledger-ui-github-deploy',
      maxSessionDuration: Duration.hours(1),
      assumedBy: new WebIdentityPrincipal(providerArn, {
        StringEquals: {
          [`${GITHUB_OIDC}:aud`]: 'sts.amazonaws.com',
          [`${GITHUB_OIDC}:sub`]: `${props.githubSubjectPrefix}:ref:refs/heads/main`,
        },
      }),
    })
    // Least privilege: `cdk deploy` works by assuming the roles `cdk bootstrap` created,
    // so this role needs nothing else to deploy.
    role.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [
          Arn.format(
            {
              service: 'iam',
              region: '',
              resource: 'role',
              resourceName: 'cdk-hnb659fds-*',
            },
            this,
          ),
        ],
      }),
    )

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn })
  }
}
