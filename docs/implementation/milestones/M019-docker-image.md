# M019 — Production Docker Image

**Stage:** 09 — Production Deployment
**Status:** pending
**Dependencies:** M018

## Objective

Build a reproducible, minimal, secure production image with correct shutdown and no implicit migration behavior.

## Scope

- Multi-stage dependency/build/runtime image, pinned Node base/digest, OCI metadata, non-root execution, production-only artifacts.
- Read-only filesystem support, signal handling, port, temporary storage, shutdown/pool closure.

## Out of scope

- Helm/Kubernetes resources (M020), database migration at container startup, publishing production image.

## Architecture references

- [Deployment](../../architecture/deployment.md), [security](../../architecture/security.md); source §17.

## Deliverables

- Dockerfile, dockerignore, image build instructions and smoke checks.

## Acceptance criteria

- [ ] Build uses pinned supported Node 24 image/digest and reproducible lockfile.
- [ ] Runtime is non-root, contains only production artifacts, excludes env/secrets/dev tools, and supports read-only root with minimal writable temp.
- [ ] `SIGTERM` drains service, readiness fails, DB pool closes; container does not run migrations.
- [ ] Image starts compiled application and OCI labels identify build.
- [ ] Vulnerability scan has no untriaged critical findings under the approved policy.

## Verification

Build image, inspect user/layers/filesystem, scan image, run read-only smoke and SIGTERM test; record unavailable container engine/scanner.

## Completion checklist

- [ ] Runtime documentation and image evidence complete; staged diff checked.
