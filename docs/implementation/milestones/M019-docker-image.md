# M019 — Production Docker Image

**Stage:** 09 — Production Deployment
**Status:** completed
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
- [x] Vulnerability scan has no untriaged critical findings under the approved policy.

## Verification

Build image, inspect user/layers/filesystem, scan image, run read-only smoke and SIGTERM test; record unavailable container engine/scanner.

## Completion checklist

- [x] Runtime documentation and image evidence complete; staged diff checked.

## Execution notes and vulnerability triage

- The image uses official Node `24.21.0-trixie-slim`, pinned to digest `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`, with frozen pnpm installs. The runtime removes npm, Corepack, and Yarn from the upstream image; it contains compiled output, a production-only package manifest, and production dependencies. Final image size is 103,850,232 bytes.
- `pnpm image:scan` passed with no HIGH or CRITICAL findings that have a published fix. The unfiltered Trivy report contained eight HIGH Debian package findings and zero CRITICAL findings. No fixed package versions are published for these advisories, so they remain visible in the unfiltered report and are rechecked when the base digest changes:
  - `CVE-2026-76642`, `CVE-2026-78408`, `CVE-2026-78409`, and `CVE-2026-78410` affect util-linux mount/nsenter behavior. The application runs as UID 1000 and does not invoke these administrative utilities.
  - `CVE-2026-54369` affects ACL library behavior. The application does not use ACL APIs and runs without privilege escalation.
  - `CVE-2026-16742` concerns systemd-homed; that daemon is not present or used in the application container.
  - `CVE-2025-69720` affects ncurses terminal handling; the API is non-interactive and does not process terminal input.
  - `CVE-2026-9538` concerns Perl Archive-Tar parsing; the application does not invoke Perl or process archives through it.
- The Trivy gate uses `--ignore-unfixed --severity HIGH,CRITICAL --exit-code 1`; unfixable findings are separately reviewed rather than treated as resolved. The image has no untriaged CRITICAL findings.
- Read-only image smoke passed against PostgreSQL 18 with a 16 MiB `/tmp` tmpfs. It verified startup/readiness, non-root execution, production-only contents, and clean SIGTERM shutdown. Existing lifecycle tests verify readiness fails during shutdown and the database pool closes.
- Image inspection confirmed OCI title, creation timestamp, Git revision, version, runtime user `node`, and the expected labels. The build script marks a revision `-dirty` when tracked files differ from `HEAD`.
- Verification passed: image build and scan; image smoke; lint; format check; strict typecheck; 38 unit tests; 10 PostgreSQL integration tests; 22 Fastify E2E tests; Nest build; progress validator and regression suite.
