# Stage 09 — Production Deployment

**Objective:** Package and operate the service using secure Docker, Helm/Kubernetes resources, controlled migrations, and release-safe CI/CD.

**Prerequisites:** Stage 08. **Milestones:** M019–M021. **Outcome:** Evidence-backed staging deployment and rollback procedures.

## Exit criteria

- Image is pinned, minimal, non-root, signal-safe, and migration-free at startup.
- Helm supports required resources, secrets, probes, scaling, network/security controls, and a separate migration Job.
- CI/release/deployment workflows gate changes, publish immutable artifacts, serialize production deployment, and smoke-test staging.
- Backup and restore expectations and operational procedures are documented; actual restore evidence is required at final acceptance.
