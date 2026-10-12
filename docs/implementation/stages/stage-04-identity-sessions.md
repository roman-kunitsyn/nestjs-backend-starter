# Stage 04 — Identity and Sessions

**Objective:** Implement secure user credential flows, JWT validation, opaque refresh rotation, session management, and account recovery.

**Prerequisites:** Stage 03. **Milestones:** M010–M011. **Outcome:** Complete and tested authentication lifecycle.

## Exit criteria

- Registration, verification, login, current-user/profile, recovery/reset/change, refresh, logout, session list/revoke, and logout-all work.
- Argon2id and pinned asymmetric JWT validation meet the architecture contract; raw refresh/reset/verification tokens are never stored.
- Replay, expiry, suspended users, enumeration resistance, concurrency, and revocation cases pass.
