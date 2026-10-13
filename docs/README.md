# Documentation

This directory is the project's persistent technical and implementation record. Follow the authority order in the repository's [AGENTS.md](../AGENTS.md): project instructions and approved decisions take precedence over specifications, plans, progress records, and the human-facing README.

## Documentation map

| Directory or file | Purpose |
| --- | --- |
| [reference/](reference/) | Preserved source specifications and historical references. |
| [architecture/](architecture/overview.md) | Focused technical architecture documents, decomposed during Stage 00. |
| [decisions/](decisions/README.md) | Accepted architecture decision records (ADRs). |
| [implementation/](implementation/README.md) | Roadmap, requirements traceability, milestone contracts, and progress. |
| [operations/](operations/) | Development, testing, migration, deployment, and troubleshooting procedures. |

Account endpoint behavior and current lifecycle limitations are documented in [authentication operations](operations/authentication.md).

The current scaffold setup is in [Local development](operations/local-development.md).

Health probes, metrics, and optional tracing are described in [Observability operations](operations/observability.md).

Helm deployment and cluster operations are in [Kubernetes operations](operations/kubernetes.md). Database restore and migration recovery are in [Database migrations](operations/migrations.md).

GitHub procedures are split into [CI and workflow troubleshooting](operations/github-actions.md), [versioned releases and GHCR verification](operations/releases.md), and [GitHub environments and repository protection](operations/github-governance.md).

Cluster deployment and application rollback commands are in [Kubernetes operations](operations/kubernetes.md#deployment-and-application-rollback-quick-procedure); migration verification and database restore guidance are in [Database migrations](operations/migrations.md#backup-restore-verification-and-troubleshooting).

## Conventions

- Keep source references intact and link to them from derived documents.
- Put each authoritative requirement in its appropriate architecture or implementation document; link to it instead of copying whole sections.
- Use stable milestone IDs (`M000`, `M001`, …) and the status vocabulary defined in `AGENTS.md`.
- Record actual behavior and verification evidence. Distinguish plans from completed work.
- Update navigation when adding an authoritative document.

The original architecture source is [nestjs-backend-starter-architecture-2026.md](reference/nestjs-backend-starter-architecture-2026.md). The architecture documents preserve its substantive requirements and link back to its section structure. The source remains unchanged as a historical record.
