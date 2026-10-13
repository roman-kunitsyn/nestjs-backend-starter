# Adopting the starter for a new application

Adoption creates a new application with independent Git history and active planning. M000–M022 remain historical evidence about the completed starter, not the new application's progress. Do not begin product implementation until identity, credentials, governance, architecture, requirements, and a complete Stage 00 roadmap are ready.

## Select and verify source

Choose a reviewed starter release or commit and verify its provenance. For a tag, inspect the release workflow and source SHA in [release operations](releases.md); an annotated tag's peeled SHA is the source commit. Example:

```bash
STARTER_URL=https://github.com/roman-kunitsyn/nestjs-backend-starter.git
STARTER_REF=v0.0.1
git ls-remote "$STARTER_URL" "refs/tags/$STARTER_REF" "refs/tags/$STARTER_REF^{}"
```

Do not assume the example version is current or appropriate.

## Export without starter Git history

Run from the parent directory for the new project:

```bash
git clone --no-checkout "$STARTER_URL" /tmp/starter-source
git -C /tmp/starter-source checkout --detach "$STARTER_REF"
SOURCE_COMMIT=$(git -C /tmp/starter-source rev-parse HEAD)
mkdir -p ../acme-api
git -C /tmp/starter-source archive "$SOURCE_COMMIT" | tar -x -C ../acme-api
cd ../acme-api
git init -b main
git add .
git status --short
```

Inspect the export, then create an empty destination GitHub repository and configure its remote:

```bash
git remote add origin git@github.com:NEW_ORG/NEW_REPO.git
git remote -v
```

The archive omits `.git`, so branches, tags, releases, and history are not inherited. Do not copy `.env` files, GitHub secrets, deployment credentials, protected tags, or credentials from external stores. Create local configuration from `.env.example`; replace development-only values.

## Provenance, history, and identity

Create `docs/reference/starter-provenance.md` recording starter URL, full source SHA, release/tag if used, adoption date, and operator. Preserve original M000–M022 contracts, progress, requirements traceability, and acceptance evidence at their current paths: existing links and progress tooling depend on them. The non-destructive [starter-history index](../reference/starter-history/README.md) identifies those paths as historical, not active adopter work. Keep the original architecture source as a historical reference.

Customize active identity in package metadata (`package.json` and lock metadata), `APP_NAME`, JWT issuer/audience, documentation, support/license details, repository URLs and organization names, domains, Docker/OCI image labels, GHCR names, Helm chart identity and selectors, Kubernetes resource names and values, and GitHub Actions references. Review workflows and deployment configuration rather than applying blind global replacements.

Audit hits before and after customization:

```bash
rg -n -i 'nestjs-backend-starter|roman-kunitsyn|example\.com|ghcr\.io|github\.com/.*/nestjs-backend-starter' . --glob '!pnpm-lock.yaml' --glob '!artifacts/openapi.*'
rg -n 'nestjs-backend-starter|roman-kunitsyn|example\.com|ghcr\.io|github\.com/.*/nestjs-backend-starter' pnpm-lock.yaml artifacts/openapi.json artifacts/openapi.yaml
```

Review each hit: preserve explicitly historical provenance/evidence, but ensure active names, links, image references, domains, and workflow assumptions belong to the new project.

## Credentials and repository governance

Create fresh local `.env` from `.env.example`; it is ignored by Git. Generate production credentials in the adopter's secret manager. Configure the new repository with `main` as default and only permanent integration branch, required PR and CI checks, protected release tags, independently scoped staging/production environments, reviewers and deployment-ref restrictions. Set GHCR permissions and deployment secrets only when live deployment is adopted. See [GitHub governance](github-governance.md) for inspection procedures. Never retrieve or print secret values.

## Fresh active planning

Review architecture documents, accepted ADRs, and definition of done. Keep accepted decisions and record deliberate changes through new ADRs. Create distinct active requirements, architecture decisions, roadmap, every milestone contract, progress tracker/dashboard, and definition of done. Until the new project's paths and tooling are deliberately reconciled, place active planning under a distinct location such as `docs/application/implementation/`; keep this starter's `docs/implementation/` and validator inputs intact as history. Update agent instructions and validation tooling to point to the new active path as part of adopter Stage 00. Define an initialization procedure that preserves historical tracker evidence; do not blindly reset or reuse the original progress tracker. Stage 00 must establish the complete roadmap and milestone specifications before product work. Do not invoke product milestone implementation before Stage 00 readiness.

## Baseline verification

With Node 24, pnpm 12.11.2, and Docker available:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm infra:up
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm openapi:generate
pnpm openapi:check
pnpm helm:lint
pnpm progress:validate
pnpm progress:test
pnpm infra:down
```

Testcontainers requires Docker; `infra:down` stops Compose while retaining its volume. After renaming, repeat relevant checks and inspect generated OpenAPI, Docker metadata, Helm output, GHCR naming and workflow references. Validate Actions with `actionlint`; YAML parsing alone does not validate Actions expressions. See [manual verification](manual-verification.md) for expected results and recovery.

**Must customize:** identity, provenance, independent Git history/remote, active planning, credentials, governance, release tags, GHCR, domains/TLS, databases, backup policy, network boundaries, and consumer compatibility commitments.

**Preserve by default:** modular Nest/Fastify structure, Zod boundary validation, PostgreSQL/Drizzle migration discipline, auth/session security, tenant isolation, error and pagination conventions, tests, health/observability, OpenAPI generation, Docker hardening, Helm safeguards, and migration-before-rollout behavior. Reconsider through explicit architecture decisions.

**Optional:** product modules, UI integration, cloud-specific deployment jobs, contract publication, SDK distribution, additional monitoring, and organization compliance controls. These are not already implemented by this starter.
