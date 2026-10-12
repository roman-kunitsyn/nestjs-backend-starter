# Stage 06 — Email and Audit

**Objective:** Complete provider adapters/templates, reliable transactional outbox delivery, and security/admin audit records.

**Prerequisites:** Stage 05. **Milestones:** M015. **Outcome:** Account, invitation, and security mail can be delivered and retried reliably.

## Exit criteria

- Console, SMTP, and in-memory test adapters meet the provider interface and protect token-bearing content.
- Outbox writes are atomic with business state; claims are exclusive, retries bounded, permanent failures visible, and at-least-once semantics tolerated.
- Required sensitive actions produce safe audit events atomically where required.
