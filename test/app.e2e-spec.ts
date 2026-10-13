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
import { configureHttpSecurity } from '../src/common/http/security.js';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from '../src/config/environment.js';
import { createOpenApiDocument, setupOpenApi } from '../src/common/openapi.js';
import {
  EMAIL_SENDER,
  type EmailSender,
} from '../src/modules/email/email-sender.js';
import { EmailOutboxService } from '../src/modules/email/email-outbox.service.js';

describe('AppController (Fastify E2E)', () => {
  let app: NestFastifyApplication;
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let databaseClient: ReturnType<typeof postgres>;
  let originalDatabaseUrl: string | undefined;
  let originalSecurityEnvironment: Map<string, string | undefined>;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    const securityEnvironment = [
      'HTTP_CORS_ORIGINS',
      'HTTP_RATE_LIMIT_MAX',
      'AUTH_LOGIN_RATE_LIMIT_MAX',
      'AUTH_REGISTER_RATE_LIMIT_MAX',
      'AUTH_RECOVERY_RATE_LIMIT_MAX',
      'AUTH_REFRESH_RATE_LIMIT_MAX',
    ];
    originalSecurityEnvironment = new Map(
      securityEnvironment.map((key) => [key, process.env[key]]),
    );
    process.env.HTTP_CORS_ORIGINS = 'http://localhost';
    process.env.HTTP_RATE_LIMIT_MAX = '10000';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '2';
    process.env.AUTH_REGISTER_RATE_LIMIT_MAX = '10000';
    process.env.AUTH_RECOVERY_RATE_LIMIT_MAX = '10000';
    process.env.AUTH_REFRESH_RATE_LIMIT_MAX = '10000';
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
    await configureHttpSecurity(app, app.get(ConfigService<EnvironmentConfig>));
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

  it('applies HTTP security headers, exact CORS origins, and refresh Origin checks', async () => {
    const server = app.getHttpAdapter().getInstance();
    const protectedHeaders = await server.inject({
      method: 'GET',
      url: '/api/v1',
      headers: { origin: 'http://localhost' },
    });
    expect(protectedHeaders.headers['x-content-type-options']).toBe('nosniff');
    expect(protectedHeaders.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(protectedHeaders.headers['access-control-allow-origin']).toBe(
      'http://localhost',
    );
    const rejectedCors = await server.inject({
      method: 'GET',
      url: '/api/v1',
      headers: { origin: 'https://attacker.example' },
    });
    expect(rejectedCors.headers['access-control-allow-origin']).toBeUndefined();
    const rejectedRefresh = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        cookie: 'refresh_token=not-a-real-token',
        origin: 'https://attacker.example',
      },
    });
    expect(rejectedRefresh.statusCode).toBe(403);
    expect(rejectedRefresh.json().code).toBe('CSRF_ORIGIN_REJECTED');
    const missingOrigin = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: 'refresh_token=not-a-real-token' },
    });
    expect(missingOrigin.statusCode).toBe(403);
  });

  it('enforces endpoint-specific login limits by IP and normalized account', async () => {
    const server = app.getHttpAdapter().getInstance();
    await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'throttle.e2e@example.test',
        password: 'correct horse battery staple',
      },
    });
    const attempt = () =>
      server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'THROTTLE.E2E@example.test',
          password: 'correct horse battery staple',
        },
      });
    expect((await attempt()).statusCode).toBe(200);
    expect((await attempt()).statusCode).toBe(200);
    const limited = await attempt();
    expect(limited.statusCode).toBe(429);
    expect(limited.json().code).toBe('RATE_LIMITED');
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
      headers: { cookie: refreshCookie, origin: 'http://localhost' },
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
    await app.get(EmailOutboxService).dispatchOnce();
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
    await app.get(EmailOutboxService).dispatchOnce();
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
    await app.get(EmailOutboxService).dispatchOnce();
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
    const deniedTransfer = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/ownership-transfer`,
      headers: { authorization: ownerToken },
      payload: {
        membershipId: eligibleOwner[0]?.id,
        currentPassword: 'incorrect password',
      },
    });
    expect(deniedTransfer.statusCode).toBe(401);
    const transferred = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/ownership-transfer`,
      headers: { authorization: ownerToken },
      payload: {
        membershipId: eligibleOwner[0]?.id,
        currentPassword: 'correct horse battery staple',
      },
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
        payload: {
          membershipId: raceMember[0]?.id,
          currentPassword: 'correct horse battery staple',
        },
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

  it('enforces resource tenancy, role ownership, cursor validation, and idempotent creation', async () => {
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
      return {
        token: `Bearer ${login.json().accessToken as string}`,
        user: login.json().user as { id: string },
      };
    };
    const owner = await credentials('resource.owner@example.test');
    const member = await credentials('resource.member@example.test');
    const other = await credentials('resource.other@example.test');
    const createOrganization = async (
      actor: typeof owner,
      name: string,
      slug: string,
    ) => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: { authorization: actor.token },
        payload: { name, slug },
      });
      return response.json().id as string;
    };
    const organizationId = await createOrganization(
      owner,
      'Resource Tenant',
      'resource-tenant',
    );
    const otherOrganizationId = await createOrganization(
      other,
      'Other Tenant',
      'other-resource-tenant',
    );
    const path = `/api/v1/organizations/${organizationId}/resources`;
    const key = 'resource-create-once';
    const created = await server.inject({
      method: 'POST',
      url: path,
      headers: { authorization: owner.token, 'idempotency-key': key },
      payload: { title: 'Owner resource', description: 'tenant scoped' },
    });
    expect(created.statusCode).toBe(201);
    const replay = await server.inject({
      method: 'POST',
      url: path,
      headers: { authorization: owner.token, 'idempotency-key': key },
      payload: { title: 'Owner resource', description: 'tenant scoped' },
    });
    expect(replay.statusCode).toBe(201);
    expect(replay.json().id).toBe(created.json().id);
    const mismatch = await server.inject({
      method: 'POST',
      url: path,
      headers: { authorization: owner.token, 'idempotency-key': key },
      payload: { title: 'Different resource' },
    });
    expect(mismatch.statusCode).toBe(409);
    await databaseClient`update idempotency_records set expires_at=now() - interval '1 second' where organization_id=${organizationId} and actor_user_id=${owner.user.id} and key=${key}`;
    const expiredKeyReuse = await server.inject({
      method: 'POST',
      url: path,
      headers: { authorization: owner.token, 'idempotency-key': key },
      payload: { title: 'Reused after retention' },
    });
    expect(expiredKeyReuse.statusCode).toBe(201);
    expect(expiredKeyReuse.json().id).not.toBe(created.json().id);

    const memberRole =
      await databaseClient`select id from roles where key='MEMBER'`;
    const viewerRole =
      await databaseClient`select id from roles where key='VIEWER'`;
    const memberRow =
      await databaseClient`insert into organization_memberships (organization_id,user_id) values (${organizationId},${member.user.id}) returning id`;
    await databaseClient`insert into membership_roles (membership_id,role_id) values (${memberRow[0]?.id},${memberRole[0]?.id})`;
    const memberCreated = await server.inject({
      method: 'POST',
      url: path,
      headers: {
        authorization: member.token,
        'idempotency-key': 'member-created',
      },
      payload: { title: 'Member resource' },
    });
    expect(memberCreated.statusCode).toBe(201);
    const memberCannotUpdateOwner = await server.inject({
      method: 'PATCH',
      url: `${path}/${created.json().id as string}`,
      headers: { authorization: member.token },
      payload: { title: 'stolen' },
    });
    expect(memberCannotUpdateOwner.statusCode).toBe(403);
    const memberCanUpdateOwn = await server.inject({
      method: 'PATCH',
      url: `${path}/${memberCreated.json().id as string}`,
      headers: { authorization: member.token },
      payload: { title: 'Member update' },
    });
    expect(memberCanUpdateOwn.statusCode).toBe(200);

    await databaseClient`delete from membership_roles where membership_id=${memberRow[0]?.id}`;
    await databaseClient`insert into membership_roles (membership_id,role_id) values (${memberRow[0]?.id},${viewerRole[0]?.id})`;
    const viewerCannotDelete = await server.inject({
      method: 'DELETE',
      url: `${path}/${memberCreated.json().id as string}`,
      headers: { authorization: member.token },
    });
    expect(viewerCannotDelete.statusCode).toBe(403);
    const removedMember = await server.inject({
      method: 'PATCH',
      url: `${path}/${memberCreated.json().id as string}`,
      headers: { authorization: owner.token },
      payload: { title: 'Owner update' },
    });
    expect(removedMember.statusCode).toBe(200);
    await databaseClient`update organization_memberships set status='suspended' where id=${memberRow[0]?.id}`;
    const removedMemberList = await server.inject({
      method: 'GET',
      url: path,
      headers: { authorization: member.token },
    });
    expect(removedMemberList.statusCode).toBe(403);

    const wrongTenant = await server.inject({
      method: 'GET',
      url: `/api/v1/organizations/${otherOrganizationId}/resources/${created.json().id as string}`,
      headers: { authorization: other.token },
    });
    expect(wrongTenant.statusCode).toBe(404);
    const list = await server.inject({
      method: 'GET',
      url: `${path}?limit=1&status=active`,
      headers: { authorization: owner.token },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toHaveLength(1);
    expect(list.json().pageInfo.hasNextPage).toBe(true);
    const nextPage = await server.inject({
      method: 'GET',
      url: `${path}?limit=1&status=active&cursor=${encodeURIComponent(list.json().pageInfo.nextCursor as string)}`,
      headers: { authorization: owner.token },
    });
    expect(nextPage.statusCode).toBe(200);
    expect(nextPage.json().items[0].id).not.toBe(list.json().items[0].id);
    const mismatchedCursor = await server.inject({
      method: 'GET',
      url: `${path}?limit=1&status=archived&cursor=${encodeURIComponent(list.json().pageInfo.nextCursor as string)}`,
      headers: { authorization: owner.token },
    });
    expect(mismatchedCursor.statusCode).toBe(400);
    const unsupportedSort = await server.inject({
      method: 'GET',
      url: `${path}?sort=rawSql`,
      headers: { authorization: owner.token },
    });
    expect(unsupportedSort.statusCode).toBe(400);
    const ownerDelete = await server.inject({
      method: 'DELETE',
      url: `${path}/${memberCreated.json().id as string}`,
      headers: { authorization: owner.token },
    });
    expect(ownerDelete.statusCode).toBe(204);
    const deletedLookup = await server.inject({
      method: 'GET',
      url: `${path}/${memberCreated.json().id as string}`,
      headers: { authorization: owner.token },
    });
    expect(deletedLookup.statusCode).toBe(404);
    const inactive = await server.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/suspend`,
      headers: { authorization: owner.token },
    });
    expect(inactive.statusCode).toBe(200);
    const inactiveWrite = await server.inject({
      method: 'POST',
      url: path,
      headers: {
        authorization: owner.token,
        'idempotency-key': 'inactive-create',
      },
      payload: { title: 'No write' },
    });
    expect(inactiveWrite.statusCode).toBe(403);
  });

  afterAll(async () => {
    await app.close();
    await databaseClient.end({ timeout: 5 });
    await container.stop();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    for (const [key, value] of originalSecurityEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
});
