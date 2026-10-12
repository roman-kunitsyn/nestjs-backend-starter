# Multi-tenancy

**Source:** Original specification §§5.2, 5.6, and 8.

## Tenant model and isolation boundary

Use a shared PostgreSQL database and schema, with organizations as tenants. A user can belong to multiple organizations and have different permissions in each. Global entities include users, organizations, sessions, and auth tokens; tenant-owned records carry non-null `organization_id`.

Every tenant-scoped read, update, and delete constrains organization ID. Resource UUID alone never proves access. Validate organization consistency for nested writes and cross-tenant foreign keys. Derive context from authenticated identity plus validated membership; never trust client organization IDs without membership/permission checks. Users cannot assign arbitrary roles to themselves. Administrators manage only membership/resources allowed by policy. Cross-organization access is denied even when a UUID exists. Explicitly classify user-owned versus organization-owned data. Test at least two organizations.

Enforce via tenant-scoped repositories, service policies, composite DB constraints, and integration tests. RLS is optional initially; document a safe future design with transaction-scoped identity and pool isolation.

## Organization and membership capabilities

Required capabilities: create/list/view/update organization; list members; invite by email; list/revoke invitations; accept invitation; change member roles; remove members; leave; transfer ownership; suspend/archive only through explicit authorization. See [Database](database.md) for transactional rules and [Authorization](authorization.md) for decisions.

Registration and organization creation are independent. Support register → verify email → create org → OWNER, and invited user register/login → verify invited address → accept invitation. Do not auto-create a personal org unless explicit product configuration enables it. Acceptance must authenticate, prove invited-email ownership, reject expired/revoked/consumed tokens, check inviter authority, and transactionally create or activate membership.

Organization switching is primarily frontend URL context. Since organization IDs appear in tenant URLs, switching does not require a new login. Do not use mutable global active-org state for authorization. A later active-org preference is a user preference only.

## Owner invariant

Each active org always has at least one active OWNER. Prevent removal, demotion, or suspension of the last owner and invalid transfer. Concurrent operations use transaction locks, serializable transactions/retries, or equivalent database-safe protection. An application count check outside transaction is not sufficient.
