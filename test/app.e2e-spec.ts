import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/infrastructure/database/schema/index.js';
import {
  API_BODY_LIMIT_BYTES,
  configureApiRouting,
} from '../src/common/api-routing.js';
import {
  configureAdapterProblemDetails,
  createHttpAdapter,
  configureRequestCorrelation,
} from '../src/common/http/request-id.js';
import { createOpenApiDocument, setupOpenApi } from '../src/common/openapi.js';
import {
  EMAIL_SENDER,
  type EmailSender,
} from '../src/modules/email/email-sender.js';

describe('AppController (Fastify E2E)', () => {
  let app: NestFastifyApplication;
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let databaseClient: ReturnType<typeof postgres>;
  let originalDatabaseUrl: string | undefined;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    container = await new PostgreSqlContainer('postgres:18.6-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();
    databaseClient = postgres(container.getConnectionUri(), {
      max: 2,
      connect_timeout: 10,
      prepare: false,
      onnotice: () => undefined,
    });
    await migrate(drizzle({ client: databaseClient, schema }), {
      migrationsFolder: './drizzle/migrations',
    });
    execFileSync('node', ['scripts/seed.mjs', 'reference'], {
      env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
      stdio: 'pipe',
    });
    const { AppModule } = await import('../src/app.module.js');
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      createHttpAdapter(API_BODY_LIMIT_BYTES),
      { logger: false, abortOnError: false },
    );
    configureApiRouting(app);
    configureRequestCorrelation(app);
    setupOpenApi(app, createOpenApiDocument(app), true);
    await app.init();
    configureAdapterProblemDetails(app);
    await app.getHttpAdapter().getInstance().ready();
  });

  it('serves the starter route through Fastify injection', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Hello World!');
    expect(response.headers['x-request-id']).toMatch(/^req_[0-9a-f-]{36}$/);
  });

  it('serves an accurate OpenAPI 3.1 document for the real prefixed route', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/openapi.json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      jsonSchemaDialect: 'https://spec.openapis.org/oas/3.1/dialect/base',
    });
    expect(response.json().paths['/api/v1']).toBeDefined();
    expect(
      response.json().paths['/api/v1'].get.responses['200'].headers[
        'X-Request-ID'
      ],
    ).toMatchObject({ schema: { type: 'string' } });
    expect(response.json().components.schemas.ProblemDetails).toBeDefined();
  });

  it('serves the interactive OpenAPI UI at /docs when enabled', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/docs',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Swagger UI');
  });

  it('serves the matching OpenAPI YAML document', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/openapi.yaml',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('openapi: 3.1.0');
    expect(response.body).toContain('ProblemDetails:');
  });

  it('publishes validated account endpoints in the OpenAPI contract', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/openapi.json',
    });
    const document = response.json();
    expect(document.paths['/api/v1/auth/register'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/verify-email'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/forgot-password'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/reset-password'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/login'].post).toBeDefined();
    expect(document.paths['/api/v1/auth/refresh'].post).toBeDefined();
    expect(document.paths['/api/v1/users/me'].get).toBeDefined();
  });

  it('rejects malformed registration at the HTTP boundary before persistence', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'short' },
      });
    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
  });

  it('requires authentication on routes without explicit public metadata', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/users/me',
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects an invalid email verification token with the public problem contract', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { token: 'x'.repeat(32) },
      });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'TOKEN_EXPIRED' });
  });

  it('registers accounts, omits credentials, rejects duplicates, and keeps recovery responses uniform', async () => {
    const server = app.getHttpAdapter().getInstance();
    const payload = {
      email: 'Account.User@example.com',
      password: 'correct horse battery staple',
      displayName: 'Account User',
    };
    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      user: {
        email: payload.email,
        displayName: payload.displayName,
      },
      emailVerificationRequired: true,
    });
    expect(created.body).not.toContain('passwordHash');
    expect(created.body).not.toContain(payload.password);

    const duplicate = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });
    expect(duplicate.statusCode).toBe(409);

    const existing = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: payload.email },
    });
    const missing = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'missing@example.com' },
    });
    expect(existing.statusCode).toBe(202);
    expect(missing.statusCode).toBe(202);
    expect(existing.json()).toEqual(missing.json());
  });

  it('logs in, sets an HttpOnly refresh cookie, and protects the current identity route', async () => {
    const server = app.getHttpAdapter().getInstance();
    await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'session.e2e@example.com',
        password: 'correct horse battery staple',
      },
    });
    const login = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'session.e2e@example.com',
        password: 'correct horse battery staple',
      },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 600,
      user: { email: 'session.e2e@example.com' },
    });
    const cookie = login.headers['set-cookie'];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const refreshCookie = String(cookie).split(';')[0];
    const refresh = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: refreshCookie },
    });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json()).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 600,
    });
    expect(refresh.headers['set-cookie']).toContain('HttpOnly');
    const identity = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${refresh.json().accessToken}` },
    });
    expect(identity.statusCode).toBe(200);
    expect(identity.json()).toMatchObject({ email: 'session.e2e@example.com' });
    const loggedOut = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${refresh.json().accessToken}` },
    });
    expect(loggedOut.statusCode).toBe(200);
    const denied = await server.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${refresh.json().accessToken}` },
    });
    expect(denied.statusCode).toBe(401);
  });

  it('creates an organization and owner atomically, normalizes slugs, and scopes organization access', async () => {
    const server = app.getHttpAdapter().getInstance();
    const credentials = async (email: string) => {
      await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'correct horse battery staple' },
      });
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'correct horse battery staple' },
      });
      return `Bearer ${login.json().accessToken as string}`;
    };
    const ownerToken = await credentials('organization.owner@example.test');
    const otherToken = await credentials('organization.other@example.test');
    const beforeCreation = await databaseClient`
      select count(*)::int as count from organization_memberships m
      inner join users u on u.id = m.user_id
      where u.normalized_email = 'organization.owner@example.test'
    `;
    expect(beforeCreation[0]?.count).toBe(0);

    const reservedSlug = await server.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: ownerToken },
      payload: { name: 'Reserved', slug: 'Admin' },
    });
    expect(reservedSlug.statusCode).toBe(400);

    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: ownerToken },
      payload: { name: 'Acme Incorporated', slug: '  Acme Team  ' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: 'Acme Incorporated',
      slug: 'acme-team',
      status: 'active',
      membership: { role: 'OWNER', status: 'active' },
    });
    const organizationId = created.json().id as string;
    const inviteResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/invitations`,
      headers: { authorization: ownerToken },
      payload: { email: 'invited.person@example.test', role: 'VIEWER' },
    });
    expect(inviteResponse.statusCode).toBe(201);
    expect(inviteResponse.json()).toMatchObject({
      email: 'invited.person@example.test',
      role: 'VIEWER',
      status: 'pending',
    });
    expect(inviteResponse.json()).not.toHaveProperty('token');
    const invitations = await server.inject({
      method: 'GET',
      url: `/api/v1/organizations/${organizationId}/invitations`,
      headers: { authorization: ownerToken },
    });
    expect(invitations.statusCode).toBe(200);
    expect(invitations.json()).toHaveLength(1);
    const inviteId = inviteResponse.json().id as string;
    const revoked = await server.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${organizationId}/invitations/${inviteId}`,
      headers: { authorization: ownerToken },
    });
    expect(revoked.statusCode).toBe(204);

    const sentInvitations: Array<{ to: string; text: string }> = [];
    const sender = app.get<EmailSender>(EMAIL_SENDER);
    const originalSend = sender.send.bind(sender);
    sender.send = async (message) => {
      sentInvitations.push(message);
    };
    const existingInviteeToken = await credentials(
      'existing.invitee@example.test',
    );
    const existingInvitee = await databaseClient`
      select id from users where normalized_email = 'existing.invitee@example.test'
    `;
    await databaseClient`
      update users set email_verified_at = now() where id = ${existingInvitee[0]?.id}
    `;
    const existingUserInvite = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/invitations`,
      headers: { authorization: ownerToken },
      payload: { email: 'existing.invitee@example.test', role: 'VIEWER' },
    });
    expect(existingUserInvite.statusCode).toBe(201);
    const existingInviteToken = sentInvitations
      .at(-1)
      ?.text.match(/Invitation token: (\S+)/)?.[1];
    const existingAcceptance = await server.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      headers: { authorization: existingInviteeToken },
      payload: { token: existingInviteToken },
    });
    expect(existingAcceptance.statusCode).toBe(200);

    const newInvite = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/invitations`,
      headers: { authorization: ownerToken },
      payload: { email: 'new.invitee@example.test', role: 'VIEWER' },
    });
    expect(newInvite.statusCode).toBe(201);
    const inviteToken = sentInvitations
      .at(-1)
      ?.text.match(/Invitation token: (\S+)/)?.[1];
    expect(inviteToken).toBeDefined();
    const inviteeToken = await credentials('new.invitee@example.test');
    const invitee = await databaseClient`
      select id from users where normalized_email = 'new.invitee@example.test'
    `;
    await databaseClient`
      update users set email_verified_at = now() where id = ${invitee[0]?.id}
    `;
    const accepted = await server.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      headers: { authorization: inviteeToken },
      payload: { token: inviteToken },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ organizationId, role: 'VIEWER' });
    const invitedMembership = await databaseClient`
      select m.id from organization_memberships m
      inner join users u on u.id = m.user_id
      where m.organization_id = ${organizationId}
        and u.normalized_email = 'new.invitee@example.test'
    `;
    const roleUpdated = await server.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${organizationId}/members/${invitedMembership[0]?.id}`,
      headers: { authorization: ownerToken },
      payload: { role: 'MEMBER' },
    });
    expect(roleUpdated.statusCode).toBe(200);
    expect(roleUpdated.json()).toMatchObject({ role: 'MEMBER' });
    const removedMember = await server.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${organizationId}/members/${invitedMembership[0]?.id}`,
      headers: { authorization: ownerToken },
    });
    expect(removedMember.statusCode).toBe(204);
    const reused = await server.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      headers: { authorization: inviteeToken },
      payload: { token: inviteToken },
    });
    expect(reused.statusCode).toBe(404);
    sender.send = originalSend;

    const ownerRows = await databaseClient`
      select m.id from organization_memberships m
      inner join membership_roles mr on mr.membership_id = m.id
      inner join roles r on r.id = mr.role_id
      where m.organization_id = ${organizationId} and m.status = 'active' and r.key = 'OWNER'
    `;
    expect(ownerRows).toHaveLength(1);

    const ownerLeave = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/leave`,
      headers: { authorization: ownerToken },
    });
    expect(ownerLeave.statusCode).toBe(409);

    const listed = await server.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: ownerToken },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().map((item: { id: string }) => item.id)).toContain(
      organizationId,
    );

    const concealed = await server.inject({
      method: 'GET',
      url: `/api/v1/organizations/${organizationId}`,
      headers: { authorization: otherToken },
    });
    expect(concealed.statusCode).toBe(404);
    const concealedUpdate = await server.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${organizationId}`,
      headers: { authorization: otherToken },
      payload: { name: 'Unauthorized change' },
    });
    expect(concealedUpdate.statusCode).toBe(404);
    const concealedLifecycle = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/suspend`,
      headers: { authorization: otherToken },
    });
    expect(concealedLifecycle.statusCode).toBe(404);

    const otherUser = await databaseClient`
      select id from users where normalized_email = 'organization.other@example.test'
    `;
    const memberRole =
      await databaseClient`select id from roles where key = 'MEMBER'`;
    const member = await databaseClient`
      insert into organization_memberships (organization_id, user_id)
      values (${organizationId}, ${otherUser[0]?.id}) returning id
    `;
    await databaseClient`
      insert into membership_roles (membership_id, role_id)
      values (${member[0]?.id}, ${memberRole[0]?.id})
    `;
    const memberRead = await server.inject({
      method: 'GET',
      url: `/api/v1/organizations/${organizationId}`,
      headers: { authorization: otherToken },
    });
    expect(memberRead.statusCode).toBe(403);
    const memberUpdate = await server.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${organizationId}`,
      headers: { authorization: otherToken },
      payload: { name: 'Unauthorized change' },
    });
    expect(memberUpdate.statusCode).toBe(403);

    const duplicate = await server.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: otherToken },
      payload: { name: 'Another Team', slug: 'ACME TEAM' },
    });
    expect(duplicate.statusCode).toBe(409);

    const renamed = await server.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${organizationId}`,
      headers: { authorization: ownerToken },
      payload: { name: 'Acme Group' },
    });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json()).toMatchObject({
      name: 'Acme Group',
      slug: 'acme-team',
    });

    const eligibleOwner = await databaseClient`
      select m.id from organization_memberships m
      inner join users u on u.id = m.user_id
      where m.organization_id = ${organizationId}
        and u.normalized_email = 'organization.other@example.test'
    `;
    const transferred = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/ownership-transfer`,
      headers: { authorization: ownerToken },
      payload: { membershipId: eligibleOwner[0]?.id },
    });
    expect(transferred.statusCode).toBe(200);

    const suspended = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/suspend`,
      headers: { authorization: otherToken },
    });
    expect(suspended.statusCode).toBe(200);
    expect(suspended.json().status).toBe('suspended');
    const activated = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/activate`,
      headers: { authorization: otherToken },
    });
    expect(activated.statusCode).toBe(200);
    expect(activated.json().status).toBe('active');

    const archived = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/archive`,
      headers: { authorization: otherToken },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json().status).toBe('archived');

    const raceOrganization = await server.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: ownerToken },
      payload: { name: 'Race Safety', slug: 'race-safety' },
    });
    const raceOrgId = raceOrganization.json().id as string;
    const raceMember = await databaseClient`
      insert into organization_memberships (organization_id, user_id)
      values (${raceOrgId}, ${otherUser[0]?.id}) returning id
    `;
    await databaseClient`
      insert into membership_roles (membership_id, role_id)
      values (${raceMember[0]?.id}, ${memberRole[0]?.id})
    `;
    const [removeRace, transferRace] = await Promise.all([
      server.inject({
        method: 'DELETE',
        url: `/api/v1/organizations/${raceOrgId}/members/${raceMember[0]?.id}`,
        headers: { authorization: ownerToken },
      }),
      server.inject({
        method: 'POST',
        url: `/api/v1/organizations/${raceOrgId}/ownership-transfer`,
        headers: { authorization: ownerToken },
        payload: { membershipId: raceMember[0]?.id },
      }),
    ]);
    expect(
      [removeRace.statusCode, transferRace.statusCode].filter(
        (status) => status === 204 || status === 200,
      ),
    ).toHaveLength(1);
    const raceOwners = await databaseClient`
      select count(*)::int as count from organization_memberships m
      inner join membership_roles mr on mr.membership_id = m.id
      inner join roles r on r.id = mr.role_id
      where m.organization_id = ${raceOrgId} and m.status = 'active' and r.key = 'OWNER'
    `;
    expect(raceOwners[0]?.count).toBe(1);
  });

  afterAll(async () => {
    await app.close();
    await databaseClient.end({ timeout: 5 });
    await container.stop();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });
});
