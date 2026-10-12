import {
  ORGANIZATION_ROLE_PERMISSIONS,
  ORGANIZATION_ROLES,
} from './access-control.js';

describe('organization role permissions', () => {
  it('defines least-privilege roles without any platform-wide role', () => {
    expect(ORGANIZATION_ROLES).toEqual(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
    expect(ORGANIZATION_ROLE_PERMISSIONS.OWNER).toContain(
      'organization:delete',
    );
    expect(ORGANIZATION_ROLE_PERMISSIONS.ADMIN).not.toContain(
      'organization:delete',
    );
    expect(ORGANIZATION_ROLE_PERMISSIONS.MEMBER).not.toContain(
      'members:invite',
    );
    expect(ORGANIZATION_ROLE_PERMISSIONS.VIEWER).toEqual(
      expect.arrayContaining([
        'organization:read',
        'members:read',
        'resources:read',
        'audit:read',
      ]),
    );
    expect(Object.keys(ORGANIZATION_ROLE_PERMISSIONS)).not.toContain(
      'PLATFORM_ADMIN',
    );
  });
});
