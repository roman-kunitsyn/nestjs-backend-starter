# OpenAPI contract artifacts

OpenAPI 3.1 is the language-independent public API contract. Backend Zod schemas, DTO classes, domain types, and Drizzle schema types are implementation details; client projects must not import them.

## Existing generator and artifact locations

```bash
pnpm openapi:generate
pnpm openapi:check
```

`pnpm openapi:generate` runs the build and `scripts/openapi.mjs generate`, writing `artifacts/openapi.json` and `artifacts/openapi.yaml`. `pnpm openapi:check` verifies freshness and OpenAPI 3.1 route/operation requirements; CI runs it. Do not hand-edit generated artifacts. Runtime JSON and YAML are served at `/openapi.json` and `/openapi.yaml`; `/docs` provides Swagger UI when enabled.

For an intentional contract change, regenerate both files and inspect the diff:

```bash
pnpm openapi:generate
git diff -- artifacts/openapi.json artifacts/openapi.yaml
pnpm openapi:check
```

Review operations, parameters, request/response schemas, authentication, Problem Details, status codes, pagination/filter/sort, and operation IDs. Treat removals/renames, tighter input, changed response meaning, auth requirements, error shape, or pagination semantics as potentially breaking. Plan deprecation/versioning and coordinate consumers before accepting a breaking change. Associate each contract artifact with backend release version and full source commit SHA. This repository commits artifacts but does not publish a separately versioned SDK or automate contract publication. Consumer generation is documented in [frontend integration](frontend-integration.md).
