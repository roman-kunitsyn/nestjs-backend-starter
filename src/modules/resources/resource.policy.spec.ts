import { ForbiddenException } from '@nestjs/common';
import { assertResourceAccess } from './resource.policy.js';

describe('resource ownership policy', () => {
  it('allows owners and administrators to change any tenant resource', () => {
    expect(() =>
      assertResourceAccess('OWNER', 'update', 'actor', 'creator'),
    ).not.toThrow();
    expect(() =>
      assertResourceAccess('ADMIN', 'delete', 'actor', 'creator'),
    ).not.toThrow();
  });

  it('limits members to resources they created and makes viewers read only', () => {
    expect(() =>
      assertResourceAccess('MEMBER', 'update', 'member-a', 'member-a'),
    ).not.toThrow();
    expect(() =>
      assertResourceAccess('MEMBER', 'delete', 'member-a', 'member-b'),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertResourceAccess('VIEWER', 'update', 'viewer', 'viewer'),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertResourceAccess('VIEWER', 'read', 'viewer', 'creator'),
    ).not.toThrow();
  });
});
