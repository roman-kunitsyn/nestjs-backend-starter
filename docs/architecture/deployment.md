# Deployment and operations architecture

**Source:** Original specification §§16–19 and operational requirements in §§11–14.

## Local development and scripts

Use Docker Compose for PostgreSQL and optionally a local email capture service such as Mailpit; the Nest app may run on host for fast reload. Document Node/pnpm install, env copy, database startup, development keys, migrations, reference seeds, app startup, API docs, and tests. Keep reference seeds idempotent/safe for controlled production use; development sample data never runs in production. Never create default production admin credentials. If platform admin exists, bootstrap securely and auditably.

Implement functional package scripts for dev/build/prod; lint/fix/format/format-check/typecheck; unit/watch/coverage/integration/E2E; DB generate/migrate/check/studio/seed; OpenAPI generate/check; infra up/down; Helm lint. No placeholders. Detailed verification architecture is in [Testing](testing.md).

## Docker

Use a multi-stage dependency/build/runtime image, pinned supported Node image or digest, non-root runtime, production artifacts only, small image, no env files/dev credentials, correct signal handling, exposed port, read-only-root support, minimal writable temp, predictable workdir, OCI labels. Start compiled app, do not migrate on startup, stop cleanly on SIGTERM, close pools, fail readiness during shutdown, require no shared local state. Migrations run as separate deployment job.

## Kubernetes and Helm

Verify the reusable chart in an ephemeral kind or k3d cluster before handoff: install and upgrade it, exercise the migration Job and failure path, confirm healthy rollout and probe/shutdown drain behavior, validate TLS and external Secret references, check applicable security policies, smoke-test the app, and roll back to a schema-compatible image. M022 repeats integrated verification using a fresh disposable cluster and PostgreSQL instance with synthetic data. This is template-level evidence only; it does not establish behavior in a production Kubernetes service, production ingress, or production secret manager. Actual cloud deployment and provider-specific controls are adopter responsibilities.

Deploy stateless replicas; use managed PostgreSQL where possible. Chart supports Deployment, Service, Ingress, ConfigMap, external Secret references, ServiceAccount, HPA, PDB, NetworkPolicy, migration Job, optional outbox CronJob. Never bundle in-cluster production PostgreSQL in app chart.

Initial production values are two replicas; requests 100m CPU/256Mi memory and 512Mi memory limit; calibrate by profiling/load testing, evaluate CPU limits. Probes: startup `/health/startup` (5s period/24 failures example), readiness `/health/ready` (5s/2s timeout), liveness `/health/live` (10s/2s). The chart sets rolling updates to maxSurge 1/maxUnavailable 0 and uses an adequate termination grace period. Readiness fails before exit.

HPA initial range 2–10 and target 70% CPU only with metrics. Budget DB connections across maximum replicas (10 pods × pool 10 = up to 100, excluding migration/ops clients); size pool accordingly.

Require non-root, dropped capabilities, no privilege escalation, default seccomp, read-only root where possible, restricted service account, no automatic token mount unless needed, network policy, approved secrets, resources, image scan. NetworkPolicy enforcement depends on a policy-capable CNI; verify allow/deny behavior in the target environment. Production ingress uses TLS, configurable host/class/TLS reference, request size/timeouts, trusted proxy, CORS, edge throttling. Do not expose operational endpoints unrestricted.

The chart's network policy defaults application ingress to the `ingress-nginx` namespace, PostgreSQL egress to pods labeled `app.kubernetes.io/name=postgresql` in the `database` namespace, and DNS to CoreDNS pods in `kube-system`. Configure selectors for the cluster's actual labels. For an external managed database, set `networkPolicy.databaseIpBlocks` to narrow stable CIDRs or use an approved egress gateway. SMTP egress is denied unless `networkPolicy.smtpIpBlocks` allow approved provider/gateway CIDRs. Do not use wildcard selectors or unrestricted SMTP egress in production values.

## Migrations, backup, and recovery

Release sequence: build/publish immutable image; run compatible migrations once via separate Job/release step; verify; roll out app; smoke test. Never have every pod migrate concurrently. Use expand/contract migrations for rolling deploys; app rollback does not automatically reverse schema. Define backup/PITR, retention, encryption/access, restoration, migration recovery, RPO/RTO, and perform/document restore tests.

## CI/CD

PR workflow: checkout/frozen pnpm install, lint/format/typecheck, unit, PostgreSQL integration/E2E, migration/OpenAPI checks, production build/Helm lint, image build/vulnerability scan; any gate failure fails pipeline. The release workflow repeats these gates for a `vMAJOR.MINOR.PATCH` tag matching `package.json`, publishes version and commit SHA tags to GHCR, attaches BuildKit SBOM/provenance metadata, scans the published digest, and records the immutable commit/digest identity. Deployments are manually dispatched by digest, protected by separate GitHub staging/production environments, serialized per environment, and record migration completion, rollout, smoke result and deployed identity. Configure production approval reviewers in the GitHub environment. Use provider OIDC/workload identity for short-lived cloud credentials when available; the generic Kubernetes workflow supports a protected kubeconfig secret as a provider-neutral fallback. Keep staging and production cluster identities, namespaces, secrets, and databases separate. The workflow does not automatically roll back application or schema; recover by deploying a known compatible image digest after diagnosis. Real credentials, kubeconfig/workload identity setup, external Helm values, DNS/TLS, and runner-reachable smoke endpoints are supplied by each adopter at deployment time, not required for template completion.

Deployment workflow selects digest, validates chart, obtains concurrency control, runs/verifies migration job, deploys Helm, waits for healthy rollout, runs smoke tests, and records version. Avoid concurrent production deployment; require protected-environment approval. Environments: local/test/staging/production with separate keys, credentials, DBs, and secrets; staging should approximate production networking, Kubernetes, and DB version when an adopter configures it. Support specific-version releases, rollout inspection, image rollback, migration diagnosis, health recovery, and exact running digest. Do not auto-rollback schema. M022 verifies the workflow and chart in local disposable infrastructure; it does not claim cloud deployment evidence.

## Operational secrets and network

Externalize production secrets and support rotation. Trust forwarded headers only from known ingress. Use TLS, explicit CORS and rate limits. Keep the app stateless and multi-replica safe. See [Security](security.md) and [Observability](observability.md).
