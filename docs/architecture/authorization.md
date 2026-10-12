# Authorization

**Source:** Original specification §7 and role/permission schema in §5.4.

## Permission-based RBAC

Roles are collections of permissions. A request is allowed only when the actor has the required permission in the target organization. Suggested handler metadata includes `@RequirePermissions('members:invite')`, but decorators/guards cannot be the sole enforcement point: application services must independently enforce sensitive policies. Organization role templates are OWNER, ADMIN, MEMBER, VIEWER; they are distinct from platform administration.

The reference seed defines these permission sets:

| Role   | Permissions                                                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OWNER  | All seeded permissions: organization read/update/delete, member read/invite/remove/role update, resource create/read/update/delete, and audit read.       |
| ADMIN  | All OWNER permissions except `organization:delete`.                                                                                                       |
| MEMBER | `resources:create`, `resources:read`, `resources:update`, `resources:delete`. Resource ownership rules are additionally enforced by the resource service. |
| VIEWER | `organization:read`, `members:read`, `resources:read`, `audit:read`.                                                                                      |

The global access-token guard denies routes unless the handler or controller has explicit `@Public()` metadata. `@RequirePermissions()` is evaluated by that guard using `organizationId` or `orgId` from the route parameters. `PermissionService` independently exposes `assertPermission` and `assertAll` for sensitive application services; both resolve active membership, active organization, and role grants from PostgreSQL on each check. An absent grant produces `403`; callers handling tenant-owned resources must first apply tenant-scoped lookup and use `404` when existence must be concealed. Organization roles do not imply platform privileges.

## Ownership policies

Evaluate ownership in addition to RBAC. Central, testable policies consider active membership, organization status, required permission, resource organization, creator/owner, and resource state. Example policy: owners/admins with update permission can update any organization resource; members with that permission can update their own; viewers may read but cannot modify. These are policy examples to implement and test, not an implicit bypass.

## Authentication guard and status semantics

Use a global authentication guard and explicit public-route exemptions. The source lists public health live/ready and register, login, refresh, forgot/reset password, and verify-email routes; health exposure remains limited to the intended infrastructure boundary. Protect diagnostics/admin routes separately.

- `401` for missing or invalid authentication.
- `403` for a disallowed operation when resource visibility is permitted.
- `404` when cross-tenant resource existence must be concealed.

Avoid response-message or timing distinctions that reveal another tenant's resource where practical.

## Platform administration

Do not grant platform staff implicit access to every organization. If a platform administrator role is added later, require distinct checks, explicit tenant selection, access justification where appropriate, and additional audit records. Organization ownership is never a substitute for platform privilege.

## Organization management decisions

Required organization and membership operations are specified in [Multi-tenancy](multi-tenancy.md) and endpoint shapes in [API conventions](api-conventions.md). The original source requires concrete request/response DTOs, permissions, side effects, and status codes to be defined for each operation during implementation.
