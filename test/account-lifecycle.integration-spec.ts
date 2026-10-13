import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { Database } from '../src/infrastructure/database/database.types.js';
import * as schema from '../src/infrastructure/database/schema/index.js';
import { PasswordHasher } from '../src/modules/auth/password-hasher.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import {
  InMemoryEmailSender,
  type EmailSender,
} from '../src/modules/email/email-sender.js';
import {
  AuditEventService,
  EmailOutboxService,
} from '../src/modules/email/email-outbox.service.js';
import { JwtService } from '../src/modules/auth/jwt.service.js';
import { SessionService } from '../src/modules/auth/session.service.js';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from '../src/config/environment.js';

describe('account lifecycle against PostgreSQL', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let client: ReturnType<typeof postgres>;
  let database: Database;
  let email: InMemoryEmailSender;
  let outbox: EmailOutboxService;
  let auth: AuthService;
  let sessions: SessionService;

  const tokenFromLatestMessage = async (): Promise<string> => {
    await outbox.dispatchOnce();
    const message = email.messages.at(-1);
    const token = message?.text.match(/token: ([A-Za-z0-9_-]+)/)?.[1];
    if (!token) throw new Error('Email did not contain an account token');
    return token;
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18.6-alpine').start();
    client = postgres(container.getConnectionUri(), {
      max: 2,
      connect_timeout: 10,
      prepare: false,
      onnotice: () => undefined,
    });
    database = drizzle({ client, schema });
    await migrate(database, { migrationsFolder: './drizzle/migrations' });
    email = new InMemoryEmailSender();
    outbox = new EmailOutboxService(database, email);
    auth = new AuthService(
      database,
      new PasswordHasher(),
      outbox,
      new AuditEventService(),
    );
    const config = new ConfigService<EnvironmentConfig>({
      NODE_ENV: 'test',
      APP_NAME: 'test',
      APP_HOST: '127.0.0.1',
      PORT: 3000,
      API_DOCS_ENABLED: false,
      DATABASE_URL: container.getConnectionUri(),
      DB_POOL_MAX: 2,
      DB_CONNECT_TIMEOUT_SECONDS: 10,
      DB_IDLE_TIMEOUT_SECONDS: 20,
      AUTH_JWT_ISSUER: 'https://api.example.test',
      AUTH_JWT_AUDIENCE: 'test',
      AUTH_JWT_KID: 'test-ed25519-1',
      AUTH_JWT_PRIVATE_KEY: '',
      AUTH_JWT_PUBLIC_KEY: '',
      AUTH_JWT_PUBLIC_KEYS: '',
      AUTH_REFRESH_TOKEN_KEY: '',
      AUTH_REFRESH_COOKIE_SECURE: false,
      AUTH_REFRESH_IDLE_DAYS: 14,
      AUTH_SESSION_MAX_DAYS: 30,
    });
    sessions = new SessionService(
      database,
      auth,
      new JwtService(config),
      config,
      outbox,
      new AuditEventService(),
    );
  }, 120000);

  beforeEach(async () => {
    await client`truncate table users cascade`;
    await client`truncate table email_outbox, audit_events cascade`;
    email.messages.length = 0;
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
    await container.stop();
  });

  it('registers normalized accounts, sends verification after persistence, and consumes verification once', async () => {
    const result = await auth.register({
      email: ' User@Example.com ',
      password: 'correct horse battery staple',
    });
    expect(result.user.email).toBe('User@Example.com');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(email.messages).toHaveLength(0);
    expect(await database.select().from(schema.emailOutbox)).toHaveLength(1);

    const [stored] = await database.select().from(schema.users);
    expect(stored?.normalizedEmail).toBe('user@example.com');
    expect(stored?.passwordHash).not.toBe('correct horse battery staple');

    const token = await tokenFromLatestMessage();
    await expect(auth.verifyEmail(token)).resolves.toEqual({ verified: true });
    await expect(auth.verifyEmail(token)).rejects.toMatchObject({
      response: { code: 'TOKEN_EXPIRED' },
    });
    await expect(auth.profile(result.user.id)).resolves.toMatchObject({
      email: 'User@Example.com',
      emailVerifiedAt: expect.any(Date),
    });
  });

  it('rejects duplicate normalized email and keeps recovery responses enumeration resistant', async () => {
    await auth.register({
      email: 'person@example.com',
      password: 'correct horse battery staple',
    });
    await expect(
      auth.register({
        email: ' PERSON@example.com ',
        password: 'another long passphrase',
      }),
    ).rejects.toMatchObject({ response: { code: 'RESOURCE_CONFLICT' } });

    const before = email.messages.length;
    await expect(auth.forgotPassword('absent@example.com')).resolves.toEqual({
      accepted: true,
    });
    expect(email.messages).toHaveLength(before);
    await expect(auth.forgotPassword('person@example.com')).resolves.toEqual({
      accepted: true,
    });
    await outbox.dispatchOnce();
    expect(email.messages).toHaveLength(before + 2);
  });

  it('resets passwords once, rejects expired tokens, and permits long passphrases', async () => {
    await auth.register({
      email: 'reset@example.com',
      password: 'original long passphrase',
    });
    const activeSession = await sessions.login(
      'reset@example.com',
      'original long passphrase',
    );
    await auth.forgotPassword('reset@example.com');
    const token = await tokenFromLatestMessage();
    await expect(
      auth.resetPassword(token, 'a much longer replacement passphrase'),
    ).resolves.toEqual({ reset: true });
    await expect(
      sessions.validate(activeSession.user.id, activeSession.sessionId),
    ).rejects.toMatchObject({ response: { code: 'UNAUTHENTICATED' } });
    await expect(
      auth.resetPassword(token, 'yet another long passphrase'),
    ).rejects.toMatchObject({ response: { code: 'TOKEN_EXPIRED' } });
    await expect(
      auth.authenticate('reset@example.com', 'original long passphrase'),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CREDENTIALS' } });
    await expect(
      auth.authenticate(
        'reset@example.com',
        'a much longer replacement passphrase',
      ),
    ).resolves.toHaveProperty('email', 'reset@example.com');

    await auth.forgotPassword('reset@example.com');
    const expiredToken = await tokenFromLatestMessage();
    const expiredDigest = createHash('sha256')
      .update(expiredToken)
      .digest('hex');
    await database
      .update(schema.passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.passwordResetTokens.tokenDigest, expiredDigest));
    await expect(
      auth.resetPassword(expiredToken, 'expired token replacement'),
    ).rejects.toMatchObject({ response: { code: 'TOKEN_EXPIRED' } });
  });

  it('limits token issuance and rejects disabled accounts', async () => {
    const registered = await auth.register({
      email: 'disabled@example.com',
      password: 'correct horse battery staple',
    });
    await Promise.all(
      Array.from({ length: 5 }, () =>
        auth.resendVerification('disabled@example.com'),
      ),
    );
    await outbox.dispatchOnce();
    expect(email.messages).toHaveLength(3);
    await database
      .update(schema.users)
      .set({ status: 'disabled' })
      .where(eq(schema.users.id, registered.user.id));

    await expect(
      auth.authenticate('disabled@example.com', 'correct horse battery staple'),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CREDENTIALS' } });
    await expect(auth.profile(registered.user.id)).rejects.toMatchObject({
      response: { code: 'UNAUTHENTICATED' },
    });
    const emailCount = email.messages.length;
    await expect(auth.forgotPassword('disabled@example.com')).resolves.toEqual({
      accepted: true,
    });
    expect(email.messages).toHaveLength(emailCount);
  });

  it('requires current-password confirmation for password changes', async () => {
    const registered = await auth.register({
      email: 'change@example.com',
      password: 'correct horse battery staple',
    });
    const activeSession = await sessions.login(
      'change@example.com',
      'correct horse battery staple',
    );
    await expect(
      auth.changePassword(
        registered.user.id,
        'incorrect current passphrase',
        'a replacement long passphrase',
      ),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CREDENTIALS' } });
    await expect(
      auth.changePassword(
        registered.user.id,
        'correct horse battery staple',
        'a replacement long passphrase',
      ),
    ).resolves.toEqual({ changed: true });
    await expect(
      sessions.validate(registered.user.id, activeSession.sessionId),
    ).rejects.toMatchObject({ response: { code: 'UNAUTHENTICATED' } });
    await expect(
      auth.authenticate('change@example.com', 'a replacement long passphrase'),
    ).resolves.toHaveProperty('email', 'change@example.com');
    const [audit] = await database
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, 'auth.password_change'));
    expect(audit).toMatchObject({
      actorUserId: registered.user.id,
      metadata: {},
    });
    const [notice] = await database
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.template, 'password-changed'));
    expect(notice?.recipient).toBe('change@example.com');
  });

  it('sends a notice and writes an audit row when a saved session is revoked', async () => {
    await auth.register({
      email: 'revoke@example.test',
      password: 'correct horse battery staple',
    });
    const session = await sessions.login(
      'revoke@example.test',
      'correct horse battery staple',
    );
    await expect(
      sessions.revoke(session.user.id, session.sessionId),
    ).resolves.toEqual({ revoked: true });
    const [notice] = await database
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.template, 'security-session-revoked'));
    expect(notice?.recipient).toBe('revoke@example.test');
    const [event] = await database
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, 'auth.session_revoked'));
    expect(event).toMatchObject({
      actorUserId: session.user.id,
      actorSessionId: session.sessionId,
    });
  });

  it('leases a message to one dispatcher and marks bounded provider failures permanently', async () => {
    await database.transaction((tx) =>
      new AuditEventService().record(tx, {
        action: 'test.safe_metadata',
        metadata: {
          operation: 'role_change',
          accessToken: 'never persist',
          nested: { passwordHash: 'never persist', count: 2 },
        },
      }),
    );
    const [safeAudit] = await database
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, 'test.safe_metadata'));
    expect(safeAudit?.metadata).toEqual({
      operation: 'role_change',
      nested: { count: 2 },
    });

    await database.insert(schema.emailOutbox).values({
      template: 'password-changed',
      recipient: 'lease@example.test',
      payload: { recipient: 'lease@example.test' },
    });
    let enterSend!: () => void;
    let releaseSend!: () => void;
    const entered = new Promise<void>((resolve) => {
      enterSend = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    let sends = 0;
    const slowSender: EmailSender = {
      send: async () => {
        sends += 1;
        enterSend();
        await blocked;
      },
    };
    const slowOutbox = new EmailOutboxService(database, slowSender);
    const firstDispatch = slowOutbox.dispatchOnce();
    await entered;
    await expect(slowOutbox.dispatchOnce()).resolves.toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
    });
    releaseSend();
    await expect(firstDispatch).resolves.toEqual({
      claimed: 1,
      sent: 1,
      failed: 0,
    });
    expect(sends).toBe(1);

    const failingOutbox = new EmailOutboxService(database, {
      send: async () => {
        throw new Error('provider unavailable with secret');
      },
    });
    const failingAuth = new AuthService(
      database,
      new PasswordHasher(),
      failingOutbox,
      new AuditEventService(),
    );
    await failingAuth.register({
      email: 'fail@example.test',
      password: 'correct horse battery staple',
    });
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await database
        .update(schema.emailOutbox)
        .set({ nextAttemptAt: new Date(0) })
        .where(eq(schema.emailOutbox.recipient, 'fail@example.test'));
      await failingOutbox.dispatchOnce();
    }
    const [failed] = await database
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.recipient, 'fail@example.test'));
    expect(failed).toMatchObject({
      status: 'failed',
      attemptCount: 8,
      lastError: 'Error',
    });
    expect(failed?.lastError).not.toContain('secret');
    await expect(
      failingAuth.profile(
        (
          await database
            .select()
            .from(schema.users)
            .where(eq(schema.users.normalizedEmail, 'fail@example.test'))
        )[0]!.id,
      ),
    ).resolves.toHaveProperty('email', 'fail@example.test');
    await expect(
      database.select().from(schema.emailVerificationTokens),
    ).resolves.toHaveLength(1);

    await database.insert(schema.emailOutbox).values({
      template: 'password-changed',
      recipient: 'crashed@example.test',
      payload: { recipient: 'crashed@example.test' },
      status: 'processing',
      attemptCount: 8,
      nextAttemptAt: new Date(0),
      lockedUntil: new Date(0),
    });
    await failingOutbox.dispatchOnce();
    const [crashed] = await database
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.recipient, 'crashed@example.test'));
    expect(crashed).toMatchObject({
      status: 'failed',
      attemptCount: 8,
      lastError: 'RetryLimitExceeded',
    });
  });

  it('retries concurrent rotation idempotently and revokes late replay with an audit event', async () => {
    await auth.register({
      email: 'session@example.com',
      password: 'correct horse battery staple',
    });
    const login = await sessions.login(
      'session@example.com',
      'correct horse battery staple',
    );
    expect(login.accessToken).toContain('.');
    const [rotated, concurrentRetry] = await Promise.all([
      sessions.refresh(login.refreshToken),
      sessions.refresh(login.refreshToken),
    ]);
    expect(rotated.refreshToken).not.toBe(login.refreshToken);
    expect(concurrentRetry.refreshToken).toBe(rotated.refreshToken);
    const oldDigest = createHash('sha256')
      .update(login.refreshToken)
      .digest('hex');
    await database
      .update(schema.refreshTokenHistory)
      .set({ rotatedAt: new Date(Date.now() - 3000) })
      .where(eq(schema.refreshTokenHistory.tokenDigest, oldDigest));
    await expect(sessions.refresh(login.refreshToken)).rejects.toMatchObject({
      response: { code: 'UNAUTHENTICATED' },
    });
    await expect(
      sessions.validate(login.user.id, login.sessionId),
    ).rejects.toMatchObject({ response: { code: 'UNAUTHENTICATED' } });
    const [event] = await database
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, 'auth.refresh_reuse'));
    expect(event?.resourceId).toBe(login.sessionId);
  });
});
