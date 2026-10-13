# Stage 09 — Production Deployment

**Objective:** Package and operate the service using secure Docker, Helm/Kubernetes resources, controlled migrations, and release-safe CI/CD.

**Prerequisites:** Stage 08. **Milestones:** M019–M021. **Outcome:** A production-oriented deployment template with reproducible local Kubernetes/recovery verification and release-safe CI/CD. Actual environment-specific staging and managed recovery evidence is a final acceptance gate in M022.

## Exit criteria

- Image is pinned, minimal, non-root, signal-safe, and migration-free at startup.
- Helm supports required resources, secrets, probes, scaling, network/security controls, and a separate migration Job.
- CI/release/deployment workflows gate changes, publish immutable artifacts, serialize production deployment, and define staging smoke checks.
- kind/k3d verifies chart install, rolling upgrade, migration sequencing, probes/drain, security policies, compatible-image rollback, and isolated PostgreSQL restore.
- Backup and restore expectations remain documented; managed-service PITR and actual staging evidence are required at M022 final acceptance.
