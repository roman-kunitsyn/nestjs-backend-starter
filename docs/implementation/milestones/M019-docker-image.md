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

- [x] Build uses pinned supported Node 24 image/digest and reproducible lockfile.
- [x] Runtime is non-root, contains only production artifacts, excludes env/secrets/dev tools, and supports read-only root with minimal writable temp.
- [x] `SIGTERM` drains service, readiness fails, DB pool closes; container does not run migrations.
- [x] Image starts compiled application and OCI labels identify build.
- [ ] Vulnerability scan has no untriaged critical findings under the approved policy.

## Verification

Build image, inspect user/layers/filesystem, scan image, run read-only smoke and SIGTERM test; record unavailable container engine/scanner.

## Completion checklist

- [ ] Runtime documentation and image evidence complete; staged diff checked.

## Execution notes and blocker

- Built `nestjs-backend-starter:local` from Node `24.21.0-bookworm-slim` pinned to digest `sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20` with frozen pnpm installs. Runtime image is about 102 MB, runs as `node`, and contains only compiled output, a production-only package manifest, and production dependencies.
- `pnpm image:smoke` passed with a live PostgreSQL 18 service, a read-only root filesystem and a 16 MiB `/tmp` tmpfs. It verified startup/readiness, absence of source/test/build tools and lock metadata, non-root UID, and a clean SIGTERM exit. Existing health lifecycle unit coverage verifies readiness is false once shutdown starts; database lifecycle coverage verifies pool closure.
- Image inspection confirmed OCI title, created timestamp, Git revision, version, and runtime user. The build script marks a revision `-dirty` if tracked files differ from `HEAD`.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` (38), `pnpm test:integration` (10), `pnpm test:e2e` (22), and the Docker image build passed. The image smoke found and led to correction of a production bootstrap issue: Nest's scoped `PinoLogger` had been passed to `useLogger`; the Nest-compatible `Logger` adapter is now used.
- **Blocked:** `pnpm image:scan` could not run because Trivy is not installed. Docker Scout is installed, but `docker scout cves --only-severity critical,high --exit-code nestjs-backend-starter:local` requires Docker account authentication, which is not configured. Install/use an approved unauthenticated scanner or configure Docker Scout access, run the HIGH/CRITICAL scan, triage findings, and then finish this milestone.
