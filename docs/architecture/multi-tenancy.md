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

### Organization lifecycle API

M013 implements `POST /api/v1/organizations` (create), `GET /api/v1/organizations` (list current user's memberships), `GET /api/v1/organizations/{organizationId}`, and `PATCH /api/v1/organizations/{organizationId}`. Creation accepts a name and slug, normalizes the slug with NFKC, lowercase, and hyphen separators, rejects reserved names, and commits the organization, active membership, and OWNER role assignment in one transaction. Registration does not create an organization. A normalized slug collision returns `409 RESOURCE_CONFLICT`.

Detail and update resolve an active membership before checking `organization:read` or `organization:update`; unknown and cross-organization IDs return the same `404 RESOURCE_NOT_FOUND`. Updates are scoped by both organization ID and active state. The list is scoped by the authenticated user and includes each membership's role and status.

`POST /api/v1/organizations/{organizationId}/suspend`, `/archive`, and `/activate` are explicit lifecycle actions. OWNER's `organization:delete` grant authorizes suspension and archival; `organization:update` authorizes reactivation. Organization updates and lifecycle writes lock the organization row, then check the active membership and permission within that transaction. Reactivation also verifies an active OWNER. Membership changes that can affect ownership must call `OrganizationService.lockForMembershipChange` before changing membership/role state and `assertActiveOwnerInvariant` before commit. This common lock order serializes organization mutations with the member operations introduced in M014. Archived organizations are terminal.

## Owner invariant

Each active org always has at least one active OWNER. Prevent removal, demotion, or suspension of the last owner and invalid transfer. Concurrent operations use transaction locks, serializable transactions/retries, or equivalent database-safe protection. An application count check outside transaction is not sufficient.
