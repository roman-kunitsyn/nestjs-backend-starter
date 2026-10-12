# Stage 04 — Identity and Sessions

**Objective:** Implement secure user credential flows, JWT validation, opaque refresh rotation, session management, and account recovery.

**Prerequisites:** Stage 03. **Milestones:** M010–M011. **Outcome:** Complete and tested authentication lifecycle.

**Status:** completed

## Exit criteria

- Registration, verification, login, current-user/profile, recovery/reset/change, refresh, logout, session list/revoke, and logout-all work.
- Argon2id and pinned asymmetric JWT validation meet the architecture contract; raw refresh/reset/verification tokens are never stored.
- Replay, expiry, suspended users, enumeration resistance, concurrency, and revocation cases pass.

## Completion record

- Exit criteria passed on 2026-10-13 through M011.
- PostgreSQL and Fastify tests cover account/session lifecycle, concurrent refresh retries, late replay revocation/audit, cookies, and access-token revocation.
