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
import { InMemoryEmailSender } from '../src/modules/email/email-sender.js';

describe('account lifecycle against PostgreSQL', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let client: ReturnType<typeof postgres>;
  let database: Database;
  let email: InMemoryEmailSender;
  let auth: AuthService;

  const tokenFromLatestMessage = (): string => {
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
    auth = new AuthService(database, new PasswordHasher(), email);
  }, 120000);

  beforeEach(async () => {
    await client`truncate table users cascade`;
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
    expect(email.messages).toHaveLength(1);

    const [stored] = await database.select().from(schema.users);
    expect(stored?.normalizedEmail).toBe('user@example.com');
    expect(stored?.passwordHash).not.toBe('correct horse battery staple');

    const token = tokenFromLatestMessage();
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
    expect(email.messages).toHaveLength(before + 1);
  });

  it('resets passwords once, rejects expired tokens, and permits long passphrases', async () => {
    await auth.register({
      email: 'reset@example.com',
      password: 'original long passphrase',
    });
    await auth.forgotPassword('reset@example.com');
    const token = tokenFromLatestMessage();
    await expect(
      auth.resetPassword(token, 'a much longer replacement passphrase'),
    ).resolves.toEqual({ reset: true });
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
    const expiredToken = tokenFromLatestMessage();
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
      auth.authenticate('change@example.com', 'a replacement long passphrase'),
    ).resolves.toHaveProperty('email', 'change@example.com');
  });
});
