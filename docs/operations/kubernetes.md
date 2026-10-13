# Kubernetes and Helm operations

## Chart and prerequisites

The application chart is `helm/nestjs-backend-starter`. It deploys only the stateless API; PostgreSQL is an externally managed service and is never installed by this chart. Run `helm lint helm/nestjs-backend-starter` and render with `helm template <release> helm/nestjs-backend-starter -f <environment-values.yaml>` before a release. Configure a supported ingress controller and network-policy-capable CNI. The secure defaults restrict app ingress to the `ingress-nginx` namespace and database egress to PostgreSQL-labeled pods in the `database` namespace. For managed PostgreSQL, configure `networkPolicy.databaseIpBlocks` with narrow endpoint CIDRs or use an approved egress gateway. DNS egress is restricted to CoreDNS in `kube-system`. SMTP egress is disabled unless `networkPolicy.smtpIpBlocks` contains approved provider or gateway CIDRs. Set the ingress namespace selector, database selectors/CIDRs, and SMTP CIDRs to match the cluster; do not use wildcard selectors.

Create the externally managed Kubernetes Secret named by `secretName` before installing. It must provide `DATABASE_URL`, `RESOURCE_CURSOR_SECRET`, `AUTH_REFRESH_TOKEN_KEY`, `AUTH_JWT_PRIVATE_KEY`, `AUTH_JWT_PUBLIC_KEY`, and authenticated SMTP values (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`); include optional `AUTH_JWT_PUBLIC_KEYS` during key rotation. Do not place secret values in Helm values, ConfigMaps, command-line arguments, or Git. Manage encryption at rest, RBAC, rotation, and external secret synchronization through the cluster's approved secret manager. Ingress TLS references a separately provisioned certificate Secret.

Example production overrides must set immutable `image.digest`, the correct database pool budget, TLS hostname/certificate, trusted proxy CIDRs, restricted CORS origins, and narrow database/SMTP egress CIDRs or approved gateways. The default pool is five connections per pod; at HPA maximum ten replicas this permits up to 50 application connections, plus migration and operational connections. Set the managed database limit and pool maximum together. CPU autoscaling requires metrics-server and memory/CPU sizing must be load tested.

The chart uses two replicas, CPU target 70%, 100m/256Mi requests and 512Mi memory limit, maxSurge 1/maxUnavailable 0, a PDB, non-root UID 1000, dropped capabilities, RuntimeDefault seccomp, read-only root filesystem, no service-account token, and bounded `/tmp`. Startup/readiness/liveness map to `/health/startup`, `/health/ready`, and `/health/live`. Readiness begins failing during graceful shutdown so endpoints drain before process exit. Ingress should expose application routes only; never publish `/health/metrics` or other operational endpoints publicly. Keep `/health/live`, startup, and readiness restricted to the cluster/ingress health-check path.

## Release and migration order

Build and publish the image once; deploy by digest. Review the SQL migration and confirm it follows expand/contract compatibility with both the currently running and new application versions. Back up the database according to its managed-service policy. Create/update the external Secret and environment values, then use `helm upgrade --install <release> helm/nestjs-backend-starter --namespace <namespace> --create-namespace -f <values> --wait --timeout 10m`. The pre-install/pre-upgrade hook runs `node scripts/migrate.mjs` once using a single database connection before the Deployment is upgraded. Application startup never migrates. A failed migration hook stops the rollout; inspect the Job and pod logs (`kubectl logs job/<job>`) and database migration metadata, correct the underlying issue, and rerun deliberately. Do not automatically reverse schema changes when rolling back an application image.

After the upgrade, verify `kubectl rollout status deployment/<release>-nestjs-backend-starter -n <namespace>`, replica readiness, ingress TLS, and authenticated staging smoke checks. Inspect `helm history` and `kubectl describe`/events for rollout diagnosis. Image rollback uses `helm rollback <release> <revision>` only when the old binary remains schema compatible; schema repair or down-migration is a separately reviewed database operation. Retain the exact image digest and chart values with release records. Serialize releases per environment.

## Backup and recovery

Use the managed PostgreSQL provider's encrypted automated backups and point-in-time recovery (PITR), with retention and access controls aligned to the service's data classification. Set an explicit business-approved RPO/RTO per environment; no universal numeric target is claimed by this starter. Before a release, record the recovery point and verify the provider reports backups healthy. A restore rehearsal must restore into an isolated database, validate schema/migration state and application smoke checks, record elapsed recovery time and data-loss window, then securely delete the rehearsal environment. Record date, database version, backup identifier, RPO/RTO observed, and operator in the deployment evidence log before final project acceptance. A backup configuration alone does not count as a restore test.

## M020 template-level verification

Use an ephemeral kind or k3d cluster and a separate disposable PostgreSQL instance containing synthetic data and temporary credentials. Exercise chart installation and upgrade, migration hook ordering and failure diagnosis, readiness/shutdown draining, TLS and external Secret references, NetworkPolicy and pod security controls, application smoke checks, and rollback to a schema-compatible image. Destroy the cluster and database after capturing sanitized command output and results. These checks verify the reusable chart and runbook; they do not verify a production Kubernetes service, production secret manager, managed PostgreSQL backup control plane, or PITR.

For the database runbook check, apply the checked-in migrations to the disposable database, add a synthetic recovery marker, create a custom-format dump, and restore it into a new empty database on the isolated instance. With the PostgreSQL client tools available inside the disposable database pod, the core operations are:

```sh
psql -U app -d app -c "CREATE TABLE m020_recovery_marker (marker text PRIMARY KEY, written_at timestamptz NOT NULL DEFAULT now()); INSERT INTO m020_recovery_marker(marker) VALUES ('synthetic-restore-check');"
pg_dump -Fc --no-owner -U app -d app -f /tmp/backup.dump
createdb -U app app_restored
pg_restore --no-owner -U app -d app_restored /tmp/backup.dump
psql -U app -d app_restored -c 'SELECT marker FROM m020_recovery_marker; SELECT count(*) FROM drizzle.__drizzle_migrations;'
```

Confirm the migration journal and marker, then run the app readiness/smoke check against the restored database. Record dump/recovery timestamps and observed recovery duration/data-loss window. Never use production credentials or data. M022 still requires an actual managed-service backup/PITR restore rehearsal and actual staging evidence.

## Staging evidence status

For each actual staging rollout record cluster/context (without credentials), chart version, image digest, migration Job result, Helm revision, ready replicas, startup/readiness/liveness behavior, TLS and smoke results, shutdown/drain result, rollback result, and any deviations. No actual production-like staging deployment or managed PostgreSQL PITR rehearsal is claimed by M020's local kind/k3d and isolated-database tests. Complete and attach this environment-specific evidence in M022 before project acceptance.

## GitHub Actions release and deployment

The repository provides `.github/workflows/ci.yml`, `release.yml`, and `deploy.yml`. CI runs for pull requests and pushes to `main`; all test and security steps are required job steps, so a failure fails the workflow. Configure `Quality and image gates` as a required pull request status check in branch protection or a repository ruleset. Testcontainers uses the hosted runner's Docker service. A version tag such as `v1.2.3` invokes the reusable CI workflow and publishes the GHCR image under version and commit SHA tags. The release run summary records the source commit and image digest; BuildKit attaches SBOM and provenance metadata, and Trivy scans the pushed digest. Configure repository rules to protect release tags and GHCR tag immutability where available. Consumers must deploy the recorded digest because tags alone are mutable references.

To enable deployment, create GitHub environments named `staging` and `production`. For each environment, configure:

- `KUBECONFIG` secret containing credentials limited to that environment when using the provider-neutral fallback. Prefer a provider OIDC/workload-identity action that exchanges the GitHub Actions identity for short-lived credentials. To use it, replace the generic credential validation/setup with the cloud provider's documented action and have it create the runner's kubeconfig; the deploy job grants only the `id-token: write` permission needed to request that identity. Do not add a long-lived cloud access key.
- `HELM_VALUES_YAML` secret containing non-secret chart configuration and references to an externally managed Kubernetes Secret. Do not include raw database, JWT, SMTP, or other application credentials in this file.
- `SMOKE_URL` variable with a smoke endpoint reachable from the runner and an expected successful HTTP response. Do not expose metrics or operational health routes through public ingress to make this check work; use an approved staging smoke route or runner network path.
- Optional `KUBE_NAMESPACE` and `HELM_RELEASE_NAME` variables. Use separate namespaces and release identities for staging and production.

Set required reviewers and deployment branch restrictions on `production`; GitHub environment protection pauses the deployment job before environment secrets are made available. Keep the staging environment independently scoped, with different cluster credentials, secret references, database, and network. Dispatch `Deploy image` with the release version, full source commit SHA, and exact `sha256:` digest from the publish run. Jobs serialize on `deploy-staging` or `deploy-production`, wait for Helm's migration hook and application rollout, verify the labeled migration Job, then run the smoke URL. Each successful run summary and 90-day artifact records source commit, deployment workflow commit, version, exact image digest, migration Job, Helm revision, ready replica count, and smoke result.

The workflow leaves failed releases available for inspection; it does not use Helm's automatic rollback and never reverses a database migration. To roll back application code, dispatch a previously recorded schema-compatible digest through the same protected environment after reviewing migration compatibility. Diagnose or repair schema changes separately. An actual production-like staging run and managed PostgreSQL restore rehearsal remain M022 acceptance evidence.
