# GitHub environments and repository protection

## Prerequisites

- Repository administrator access to `roman-kunitsyn/nestjs-backend-starter`.
- `gh` authenticated with sufficient read access to inspect rulesets and Actions; repository admin permissions are required to change them.
- Environment-specific Kubernetes clusters, namespaces, external Secrets, smoke endpoints, and identity integration prepared before enabling deployments.

Check the current default branch and rulesets:

```bash
gh auth status
gh api repos/roman-kunitsyn/nestjs-backend-starter
gh api repos/roman-kunitsyn/nestjs-backend-starter/rulesets
gh api repos/roman-kunitsyn/nestjs-backend-starter/rulesets/RULESET_ID
```

Expected: the active main branch ruleset targets the default branch and requires the exact `Quality and image gates` status context, pull requests, deletion protection, and non-fast-forward protection. The tag ruleset targets `refs/tags/v*` and prevents updates/deletions. Review ruleset detail, not just its name. If the API returns 403, the account lacks required administration visibility; inspect Settings in the GitHub UI as an administrator.

## Configure GitHub environments

In **Settings → Environments**, create separate `staging` and `production` environments. The workflow `.github/workflows/deploy.yml` references those exact environment names and reads:

| Name                | Type              | Purpose                                                                                                                                                                   |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KUBECONFIG`        | Secret            | Environment-limited cluster credential for the workflow's provider-neutral configuration. Prefer cloud OIDC/workload identity and short-lived credentials when supported. |
| `HELM_VALUES_YAML`  | Secret            | Environment-specific Helm values and external Secret reference; never include raw application/database credentials.                                                       |
| `SMOKE_URL`         | Variable          | Runner-reachable smoke endpoint that returns HTTP 2xx.                                                                                                                    |
| `KUBE_NAMESPACE`    | Optional variable | Dedicated namespace; defaults to `staging` or `production`.                                                                                                               |
| `HELM_RELEASE_NAME` | Optional variable | Helm release identity; defaults to `nestjs-backend-starter`.                                                                                                              |

Use unique cluster identities, namespaces, external Secret names, database credentials, and smoke endpoints for staging and production. In the production environment, set required reviewers and restrict allowed deployment branches/tags to the approved release refs. Keep staging independently scoped. Avoid broad environment sharing or credentials at repository scope.

Expected: the deploy job waits for production approval before receiving environment secrets; a staging dispatch cannot read production credentials. A workflow job declaring `environment: production` does not by itself prove the environment has reviewers, branch restrictions, or configured values.

## Inspect settings

With administrator access, inspect each environment in **Settings → Environments** and confirm its name, protection rules, deployment ref restrictions, secret/variable names, and last deployment. Do not display secret values. CLI/API listing may be unavailable depending on token permissions; use the UI as the authoritative manual check.

For branch and tag rulesets, use the commands above or **Settings → Rules → Rulesets**. Confirm the rules are active and no bypass actors defeat enforcement. For `main`, verify the exact required check name appears after a successful run. For `v*` tags, verify update and deletion are blocked. If classic branch protection is used instead, inspect **Settings → Branches** and confirm equivalent rules.

## Deployment workflow safety check

Before allowing a production dispatch, inspect `.github/workflows/deploy.yml` and verify it:

1. Accepts only `staging` or `production` and validates the version, full commit SHA, and `sha256:` digest formats.
2. Declares the selected GitHub environment and a non-cancelling concurrency lock per environment.
3. Requires environment values and credentials only within that environment.
4. Uses the immutable GHCR digest in Helm values, waits for the migration hook and rollout, checks the migration Job, and runs a 2xx smoke check.
5. Records source and workflow commits, version, digest, migration Job, Helm revision, readiness, and smoke result.

Do not use an actual staging deployment as M021 evidence; M022 owns environment-specific deployment and recovery verification. See [Kubernetes operations](kubernetes.md) and [Database migrations](migrations.md) for deployment, rollback, and database recovery procedures.

## Troubleshooting

- Environment missing: create the exact workflow environment name; spelling and case must match.
- Job fails configuration validation: configure `KUBECONFIG`, `HELM_VALUES_YAML`, and `SMOKE_URL` for the selected environment, without printing secret contents.
- Production job waits: an authorized required reviewer must approve it; verify the selected ref satisfies environment deployment restrictions.
- Required status check cannot be selected: run CI on a branch first so GitHub learns the exact `Quality and image gates` context, then update and inspect the ruleset.
- Ruleset API returns 403: request an administrator to verify in Settings; do not infer protection from unavailable data.
- Staging/production isolation unclear: pause dispatches until cluster credentials, namespaces, databases, external Secrets, and smoke URLs have been confirmed separately.

## Manual verification record

Record the date, operator, ruleset names/IDs and active conditions, required check name, production reviewers and deployment ref restrictions, and confirmation that expected secret/variable names exist without recording values. If any setting cannot be inspected, document it as unverified and keep M021 blocked.

### Repository audit on 2026-10-13

Read-only GitHub API inspection found active ruleset `main-branch-protection` (ID `24975194`) targeting the default branch. It requires pull requests, blocks deletion and non-fast-forward updates, and requires `Quality and image gates`. Active ruleset `release-tag-protection` (ID `24975901`) targets `refs/tags/v*` and blocks update/deletion. No bypass actors were configured for either ruleset. The main ruleset has zero required approving reviews; the M021 contract requires the status check and protection rules, not a minimum review count.

The `staging` and `production` environments exist, but both currently report empty `protection_rules`, a null deployment branch policy, and no environment variables or secret names. GitHub reports `can_admins_bypass: true`. Therefore production reviewers/ref restrictions, `KUBECONFIG`, `HELM_VALUES_YAML`, `SMOKE_URL`, and environment separation are not configured or verified. This is a failed M021 acceptance criterion; configure and reinspect these settings before changing M021 to completed. Secret values were not retrieved.
