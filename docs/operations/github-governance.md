# GitHub environments and repository protection

## Prerequisites

- Repository administrator access to `roman-kunitsyn/nestjs-backend-starter`.
- `gh` authenticated with sufficient read access to inspect rulesets and Actions; repository admin permissions are required to change them.
- A consumer's staging/production clusters, credentials, external Secrets, smoke endpoints, and identity integration are needed only when that consumer enables live deployments; they are not prerequisites for template completion.

Check the current default branch and rulesets:

```bash
gh auth status
gh api repos/roman-kunitsyn/nestjs-backend-starter
gh api repos/roman-kunitsyn/nestjs-backend-starter/rulesets
gh api repos/roman-kunitsyn/nestjs-backend-starter/rulesets/RULESET_ID
```

Expected: the active main branch ruleset targets the default branch and requires the exact `Quality and image gates` status context, pull requests, deletion protection, and non-fast-forward protection. The tag ruleset targets `refs/tags/v*` and prevents updates/deletions. Review ruleset detail, not just its name. If the API returns 403, the account lacks required administration visibility; inspect Settings in the GitHub UI as an administrator.

## Read-only environment policy verification

Run these commands in an operator shell authenticated to GitHub with repository environment/ruleset read access. They issue GET requests and do not reveal secret values. A command run inside a restricted agent sandbox may lack GitHub authorization; that result describes only that execution context and must not be used to infer whether the host machine's `gh` login is valid.

```bash
gh api repos/roman-kunitsyn/nestjs-backend-starter/environments \
  --jq '.environments[] | {name, protection_rules, deployment_branch_policy, can_admins_bypass}'
gh api repos/roman-kunitsyn/nestjs-backend-starter/environments/staging \
  --jq '{name, protection_rules, deployment_branch_policy, can_admins_bypass}'
gh api repos/roman-kunitsyn/nestjs-backend-starter/environments/production \
  --jq '{name, protection_rules, deployment_branch_policy, can_admins_bypass}'
gh api repos/roman-kunitsyn/nestjs-backend-starter/environments/staging/deployment-branch-policies \
  --jq '.branch_policies[]? | {name, type}'
gh api repos/roman-kunitsyn/nestjs-backend-starter/environments/production/deployment-branch-policies \
  --jq '.branch_policies[]? | {name, type}'
gh api repos/roman-kunitsyn/nestjs-backend-starter/rulesets \
  --jq '.[] | {id, name, target, enforcement, source, bypass_actors}'
```

Expected: both environment records exist and show independently reviewed protection configuration with distinct deployment-ref restrictions appropriate to each environment; production lists at least one required reviewer, a policy limited to approved release refs, and administrator bypass disabled where supported. Inspect the named policy details and ruleset `bypass_actors`; names alone do not prove the restrictions match the release workflow. If the environment API does not return a field, or a GET returns 403/404, use **Settings → Environments → staging/production** and **Settings → Rules → Rulesets** as an administrator and record the displayed policy. Do not treat an unavailable field as passing evidence. M021 requires evidence of what GitHub actually enforces, not merely the intended workflow YAML.

## Configure GitHub environments

In **Settings → Environments**, create separate `staging` and `production` environments. M021 verifies environment governance and separation. A consumer enables live deployment by supplying the following exact inputs for each environment to `.github/workflows/deploy.yml`:

| Name                | Type              | Purpose                                                                                                                                                                   |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KUBECONFIG`        | Secret            | Environment-limited cluster credential for the workflow's provider-neutral configuration. For OIDC/workload identity, adapt the credential setup step to the provider's supported action and exchange the GitHub identity for short-lived credentials. |
| `HELM_VALUES_YAML`  | Secret            | Environment-specific Helm values and external Secret reference; never include raw application/database credentials. The values must select the intended namespace and immutable image settings are supplied by the workflow. |
| `SMOKE_URL`         | Variable          | Runner-reachable application smoke endpoint that returns HTTP 2xx. It may use a private network path; public DNS/reachability is not required by template acceptance. |
| `KUBE_NAMESPACE`    | Optional variable | Dedicated namespace; defaults to `staging` or `production`.                                                                                                               |
| `HELM_RELEASE_NAME` | Optional variable | Helm release identity; defaults to `nestjs-backend-starter`.                                                                                                              |

Use unique cluster identities, namespaces, external Secret names, database credentials, and smoke endpoints for staging and production. In the production environment, set required reviewers and restrict allowed deployment branches/tags to the approved release refs. Keep staging independently scoped. Avoid broad environment sharing or credentials at repository scope. These secret and variable values, clusters, DNS, certificates, databases, and network paths are consumer deployment-time inputs. Do not create dummy values or require them for M021/M022.

Expected: the deploy job waits for production approval before receiving environment secrets; a staging dispatch cannot read production credentials. A workflow job declaring `environment: production` does not by itself prove the environment has reviewers, branch restrictions, or configured values. M021 verifies the governance protections and workflow references without requiring these deployment inputs to be populated.

## Consumer deployment setup and verification

These steps apply when an adopting application enables live deployment. They are not prerequisites for M021/M022 completion.

1. Provision separate staging and production Kubernetes environments, namespaces, databases, ingress/TLS, and externally managed application Secrets. Use a private DNS name or approved network route appropriate to the environment; keep metrics and operational health routes private.
2. Configure `KUBECONFIG` as an environment secret containing only that environment's limited deployment identity. Prefer provider-supported GitHub OIDC/workload identity with short-lived credentials. For OIDC, adapt the workflow credential setup to the provider action and verify the resulting identity can only deploy to its intended cluster/namespace. Never store long-lived cloud keys in the workflow or repository.
3. Configure `HELM_VALUES_YAML` as an environment secret containing reviewed chart configuration and a reference to the already-created external Kubernetes Secret. Include environment-specific hostname/TLS Secret reference, trusted proxy and CORS settings, resource/pool budgets, and narrow database/SMTP network policy targets as applicable. Do not put raw database, JWT, SMTP, kubeconfig, or cloud credentials in the YAML.
4. Configure `SMOKE_URL` as an environment variable for an application route that returns HTTP 2xx from the runner network. For a private service, provide an approved runner network path; public reachability is optional. Do not expose operational endpoints to make smoke checks reachable.
5. Optionally set `KUBE_NAMESPACE` and `HELM_RELEASE_NAME`; otherwise the workflow uses its documented defaults. Keep values distinct between staging and production.
6. Inspect the configured secret/variable names without revealing secret values. Confirm the kubeconfig or OIDC identity selects the intended cluster, the Helm values reference the intended namespace and external Secret, and DNS/TLS resolve for that deployment. From the same network path as the workflow, confirm the smoke URL returns 2xx. Then dispatch a reviewed image by version, full source commit SHA, and exact `sha256:` digest, and verify migration Job completion, rollout readiness, image digest, smoke result, and deployment record.

If a consumer does not configure these inputs, the deployment workflow is intentionally not dispatchable for that environment. This does not prevent local Helm acceptance in M022, where temporary synthetic Secrets, local TLS fixtures where needed, and cluster-local or port-forward smoke checks are used.

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

Do not use an actual staging deployment as M021 evidence. M022 verifies integrated behavior in a fresh local cluster and database; live environment-specific deployment and recovery are consumer responsibilities. See [Kubernetes operations](kubernetes.md) and [Database migrations](migrations.md) for exact deployment, rollback, and database recovery procedures.

## Troubleshooting

- Environment missing: create the exact workflow environment name; spelling and case must match.
- Job fails configuration validation: configure `KUBECONFIG`, `HELM_VALUES_YAML`, and `SMOKE_URL` for the selected environment, without printing secret contents.
- Production job waits: an authorized required reviewer must approve it; verify the selected ref satisfies environment deployment restrictions.
- Required status check cannot be selected: run CI on a branch first so GitHub learns the exact `Quality and image gates` context, then update and inspect the ruleset.
- Ruleset API returns 403: request an administrator to verify in Settings; do not infer protection from unavailable data.
- Staging/production isolation unclear: pause dispatches until cluster credentials, namespaces, databases, external Secrets, and smoke URLs have been confirmed separately.

## Manual verification record

Record the date, operator, ruleset names/IDs and active conditions, required check name, production reviewers and deployment ref restrictions. Record the presence of consumer secret/variable names only when a consumer has configured them; their absence does not block template acceptance. If a required governance setting cannot be inspected, document it as unverified and keep M021 blocked.

### Repository ruleset audit on 2026-10-13

Read-only GitHub API inspection found active ruleset `main-branch-protection` (ID `24975194`) targeting the default branch. It requires pull requests, blocks deletion and non-fast-forward updates, and requires `Quality and image gates`. Active ruleset `release-tag-protection` (ID `24975901`) targets `refs/tags/v*` and blocks update/deletion. No bypass actors were configured for either ruleset. The main ruleset has zero required approving reviews; the M021 contract requires the status check and protection rules, not a minimum review count.

The initial environment audit on 2026-10-13 found that `staging` and `production` had no protection rules or deployment branch policy and that GitHub reported `can_admins_bypass: true`. That historical finding failed M021 at the time. A later authenticated GitHub CLI/API audit, reported by the repository operator on 2026-10-13, verified custom deployment branch policies on both environments, each allowing only the protected `main` ref. `can_admins_bypass` is `false` for both. Staging has no required reviewer; production requires reviewer `roman-kunitsyn`, with self-review permitted for the solo-maintainer workflow. This resolves the missing protection, reviewer, and administrator-bypass findings. However, M021 requires production deployment refs limited to approved release refs, and the reported production policy allows `main` only. The manually dispatched workflow accepts a digest, version, and source commit but does not verify those inputs correspond to a protected version-tag release. Keep M021 blocked until this release-ref restriction is met or the approved milestone contract is explicitly amended. The absence of `KUBECONFIG`, `HELM_VALUES_YAML`, and `SMOKE_URL` is not a template acceptance failure because these are consumer deployment-time inputs. Secret values were not retrieved.
