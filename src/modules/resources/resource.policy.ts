import { ForbiddenException } from '@nestjs/common';
import type { OrganizationRole } from '../auth/access-control.js';

export type ResourceAction = 'read' | 'update' | 'delete';

export function assertResourceAccess(
  role: OrganizationRole,
  action: ResourceAction,
  actorMembershipId: string,
  creatorMembershipId: string,
): void {
  if (action === 'read') return;
  if (role === 'VIEWER') throw forbidden();
  if ((role === 'OWNER' || role === 'ADMIN') && actorMembershipId) return;
  if (role === 'MEMBER' && actorMembershipId === creatorMembershipId) return;
  throw forbidden();
}

function forbidden() {
  return new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
  });
}
