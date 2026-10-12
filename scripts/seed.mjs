import postgres from 'postgres';

const mode = process.argv[2];
if (!['reference', 'dev'].includes(mode)) {
  console.error('Usage: node scripts/seed.mjs <reference|dev>');
  process.exitCode = 2;
} else if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL must be set to seed the database');
  process.exitCode = 2;
} else if (mode === 'dev' && process.env.NODE_ENV === 'production') {
  console.error('Development fixtures are disabled when NODE_ENV=production');
  process.exitCode = 1;
} else {
  const client = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10, prepare: false });
  try {
    await client.begin(async (transaction) => {
      const roleRows = await transaction`
        insert into roles (key, name, description, is_system)
        values ('OWNER','Owner','Full organization control',true), ('ADMIN','Administrator','Organization administration',true),
          ('MEMBER','Member','Standard organization access',true), ('VIEWER','Viewer','Read-only organization access',true)
        on conflict (key) do update set name = excluded.name, description = excluded.description
        returning id, key`;
      const permissionRows = await transaction`
        insert into permissions (key) values
          ('organization:read'),('organization:update'),('organization:delete'),
          ('members:read'),('members:invite'),('members:remove'),('members:roles:update'),
          ('resources:create'),('resources:read'),('resources:update'),('resources:delete'),('audit:read')
        on conflict (key) do update set key = excluded.key returning id, key`;
      const rolePermissions = {
        OWNER: permissionRows.map((item) => item.id),
        ADMIN: permissionRows.filter((item) => item.key !== 'organization:delete').map((item) => item.id),
        MEMBER: permissionRows.filter((item) => item.key.startsWith('resources:')).map((item) => item.id),
        VIEWER: permissionRows.filter((item) => item.key.endsWith(':read')).map((item) => item.id),
      };
      for (const role of roleRows) {
        for (const permissionId of rolePermissions[role.key]) {
          await transaction`insert into role_permissions (role_id, permission_id) values (${role.id}, ${permissionId}) on conflict do nothing`;
        }
      }
      if (mode === 'dev') {
        const email = 'developer@example.test';
        const userRows = await transaction`
          insert into users (email, normalized_email, display_name, email_verified_at)
          values (${email}, ${email}, 'Local Developer', now())
          on conflict (normalized_email) do update set display_name = excluded.display_name
          returning id`;
        const orgRows = await transaction`
          insert into organizations (name, slug, normalized_slug, created_by_user_id)
          values ('Local Development','local-development','local-development',${userRows[0].id})
          on conflict (normalized_slug) do update set name = excluded.name
          returning id`;
        const memberships = await transaction`
          insert into organization_memberships (organization_id, user_id)
          values (${orgRows[0].id}, ${userRows[0].id})
          on conflict (organization_id, user_id) do update set status = 'active'
          returning id`;
        const owner = roleRows.find((role) => role.key === 'OWNER');
        await transaction`insert into membership_roles (membership_id, role_id) values (${memberships[0].id}, ${owner.id}) on conflict (membership_id) do update set role_id = excluded.role_id`;
      }
    });
    console.log(`${mode === 'reference' ? 'Reference data' : 'Development fixtures'} seeded.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}
