# ADR-002 — Separate template verification from consumer deployment evidence

**Status:** Accepted
**Date:** 2026-10-13
**Amended:** 2026-10-13

## Context

This repository is a reusable, cloud-provider-neutral application starter. Its purpose is to provide production-oriented application, container, Helm, Kubernetes security, CI/CD, and operations artifacts. Requiring a named cloud provider, purchased managed services, real credentials, or a live production-like cluster to complete the template would make completion depend on each adopter's infrastructure. Conversely, local tests must not be described as evidence that a provider's production controls work.

The earlier ADR-002 wording assigned actual staging deployment and managed PostgreSQL PITR to M022. That boundary is superseded by this amendment. Production safeguards and consumer deployment responsibilities remain required when an adopter deploys the template.

## Decision

1. **M020 — reusable deployment capability:** verify the Helm chart and recovery procedure with kind or k3d and an isolated disposable PostgreSQL instance. Use synthetic data and temporary credentials. Verify install/upgrade, migration ordering and failure diagnosis, probes and shutdown drain, TLS and external Secret references, Kubernetes security controls, smoke behavior, compatible-image rollback, and database backup/restore. Label results template-level; do not claim provider or production evidence.
2. **M021 — CI/CD and repository governance:** verify GitHub CI, versioned GHCR publishing, immutable image identity and integrity, SBOM, provenance, dependency/image security checks, active GitHub repository rulesets, staging/production environment governance, and deployment workflow safety. Verify protection policy configuration, not that real clusters, credentials, kubeconfigs, external Helm values, DNS, or public smoke endpoints have been provisioned. Actual environment inputs are consumer deployment-time responsibilities.
3. **M022 — final integrated template acceptance:** use a fresh disposable local kind or k3d cluster and a fresh disposable PostgreSQL instance populated only with synthetic data. Verify Helm install and upgrade, migrations, startup/readiness/liveness probes, local smoke checks, application rollback to a compatible image, database backup and restore, Kubernetes security controls, and documentation consistency. Run the applicable complete code quality, security, and progress checks. Record commands and outcomes as local template verification.
4. **Consumer deployment responsibilities:** the adopting application supplies provider-specific infrastructure, real environment credentials and kubeconfig or workload identity, external Helm values and Secret references, DNS, publicly reachable or runner-reachable smoke endpoints, production TLS/DNS, managed PostgreSQL PITR, provider-specific hardening, live cloud deployments, and production disaster recovery. Exact input contracts and procedures belong in operations documentation. These are not template completion criteria.
5. **Production safety remains part of the template:** preserve production-oriented Helm defaults, least-privilege Kubernetes controls, externalized secrets, protected GitHub environments, immutable digest deployment, migration ordering, rollout and smoke gates, application recovery, backup/PITR guidance, and operational runbooks. Do not weaken these controls to accommodate local verification.

## M021/M022 acceptance boundary

M021's acceptance is about GitHub-side controls and artifacts. Repository rulesets must protect the default branch and version tags. Staging and production environments must have distinct governance, including production approval and deployment-ref restrictions consistent with the deployment workflow. M021 does not require environment secret values or a successful deployment dispatch. A finding that a required governance rule is absent remains an M021 blocker.

The deployment workflow's expected consumer configuration remains documented: `KUBECONFIG` (or provider-specific short-lived OIDC/workload identity setup), `HELM_VALUES_YAML`, and `SMOKE_URL`, with optional `KUBE_NAMESPACE` and `HELM_RELEASE_NAME`. Their values must be supplied separately for each adopting environment and must not be fabricated for template verification. DNS, TLS certificates, external application Secrets, database access, and runner network reachability are likewise deployment prerequisites.

M022 runs the integrated chart and recovery checks against newly created local resources. It validates TLS and Secret wiring with synthetic local fixtures where needed, and uses a local port-forward or cluster-local path for smoke requests. It does not require DNS or public ingress reachability. Managed PostgreSQL PITR and production disaster recovery are documented consumer requirements; local dump/restore verifies the reusable runbook only.

## Consequences

- M021 and M022 can complete without choosing a cloud provider or provisioning paid or live cloud infrastructure.
- GitHub governance and workflow safeguards remain verifiable acceptance requirements; environment credentials and endpoint availability do not.
- M022 provides integrated evidence for the reusable template in reproducible disposable local infrastructure.
- Adopters still need provider-specific security, TLS/DNS, database recovery, and deployment verification before production use.
- Earlier ADR-002 addendum statements requiring M022 actual staging or managed PITR evidence are superseded by this decision.

## Affected documents

- `docs/architecture/deployment.md` and `docs/architecture/database.md`
- `docs/implementation/definition-of-done.md`, `roadmap.md`, and `requirements-matrix.md`
- `docs/implementation/stages/stage-09-production-deployment.md` and `stage-10-final-verification.md`
- `docs/implementation/milestones/M020-kubernetes-deployment.md`, `M021-cicd.md`, and `M022-final-acceptance.md`
- `docs/operations/github-actions.md`, `github-governance.md`, `kubernetes.md`, `migrations.md`, and `releases.md`

## Approval

The project owner approved this amendment on 2026-10-13. It governs the M021/M022 infrastructure acceptance boundary and supersedes conflicting prior M021/M022 wording in this ADR.
