# Stage 02 — HTTP and API Foundation

**Objective:** Establish validated API boundaries, consistent errors/logging, request correlation, and generated REST/OpenAPI contracts.

**Prerequisites:** Stage 01. **Milestones:** M006–M007. **Outcome:** A verifiable `/api/v1` HTTP contract foundation.

## Exit criteria

- Body, path, and query boundaries use Zod; unknown public write fields are rejected by default.
- Problem Details, safe error mapping, request ID propagation, structured Pino logs, and OpenAPI generation are tested.
- OpenAPI accurately declares its version; pagination, sorting, and idempotency support contracts are reusable and validated.
