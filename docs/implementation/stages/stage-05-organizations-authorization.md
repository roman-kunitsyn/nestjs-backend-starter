# Stage 05 — Organizations and Authorization

**Objective:** Implement permission-based RBAC, ownership policies, organizations, memberships, invitations, and concurrency-safe ownership invariants.

**Prerequisites:** Stage 04. **Milestones:** M012–M014. **Outcome:** Tenant-aware organization management with tested denial paths.

## Exit criteria

- Organization and membership endpoints check active membership, permissions, organization state, and ownership.
- Invitation acceptance and role management validate authority and operate transactionally.
- At least one active owner is preserved under concurrent changes; cross-tenant access is denied.
