import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import {
  authSessions,
  emailVerificationTokens,
  passwordResetTokens,
  users,
} from '../../infrastructure/database/schema/identity.schema.js';
import {
  AuditEventService,
  EmailOutboxService,
} from '../email/email-outbox.service.js';
import { PasswordHasher } from './password-hasher.js';
import type { RegisterInput } from './auth.schemas.js';
import { MetricsService } from '../observability/metrics.js';

const digest = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$5hHGBymmrBgnPsclQW31Zg$LjUz0P8mrM/xvGFAH+QcFrd9vf35sI3uwOn0GAu2a8c';
const normalizeEmail = (email: string): string =>
  email.trim().normalize('NFKC').toLowerCase();
const publicUser = (user: typeof users.$inferSelect) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  emailVerifiedAt: user.emailVerifiedAt,
  status: user.status,
  createdAt: user.createdAt,
});

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly passwords: PasswordHasher,
    private readonly outbox: EmailOutboxService,
    private readonly audit: AuditEventService,
    @Optional() private readonly metrics: MetricsService = new MetricsService(),
  ) {}

  async register(input: RegisterInput) {
    const email = input.email.trim().normalize('NFKC');
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await this.passwords.hash(input.password);
    const token = randomBytes(32).toString('base64url');
    const created = await this.db
      .transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email,
            normalizedEmail,
            passwordHash,
            displayName: input.displayName,
          })
          .returning();
        if (!user) throw new Error('User insert returned no row');
        await tx.insert(emailVerificationTokens).values({
          userId: user.id,
          tokenDigest: digest(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await this.outbox.enqueue(tx, 'verify-email', {
          recipient: email,
          token,
        });
        return user;
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error))
          throw new ConflictException({
            code: 'RESOURCE_CONFLICT',
            message: 'An account with this email already exists',
          });
        throw error;
      });
    return { user: publicUser(created), emailVerificationRequired: true };
  }

  async verifyEmail(token: string): Promise<{ verified: true }> {
    const tokenDigest = digest(token);
    return this.db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.tokenDigest, tokenDigest),
            isNull(emailVerificationTokens.consumedAt),
            gt(emailVerificationTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!record)
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Verification token is invalid or expired',
        });
      const [consumed] = await tx
        .update(emailVerificationTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(emailVerificationTokens.id, record.id),
            isNull(emailVerificationTokens.consumedAt),
            gt(emailVerificationTokens.expiresAt, new Date()),
          ),
        )
        .returning({ id: emailVerificationTokens.id });
      if (!consumed)
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Verification token is invalid or expired',
        });
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, record.userId))
        .limit(1);
      if (!user || user.status !== 'active')
        throw new UnauthorizedException({
          code: 'UNAUTHENTICATED',
          message: 'Account is unavailable',
        });
      await tx
        .update(users)
        .set({
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      return { verified: true };
    });
  }

  async resendVerification(email: string): Promise<{ accepted: true }> {
    const normalizedEmail = normalizeEmail(email);
    await this.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.normalizedEmail, normalizedEmail))
        .limit(1)
        .for('update');
      if (
        user?.status !== 'active' ||
        user.emailVerifiedAt ||
        !(await this.canIssue(tx, emailVerificationTokens, user.id))
      )
        return undefined;
      const token = randomBytes(32).toString('base64url');
      await tx.insert(emailVerificationTokens).values({
        userId: user.id,
        tokenDigest: digest(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await this.outbox.enqueue(tx, 'verify-email', {
        recipient: user.email,
        token,
      });
    });
    return { accepted: true };
  }

  async forgotPassword(email: string): Promise<{ accepted: true }> {
    await this.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.normalizedEmail, normalizeEmail(email)))
        .limit(1)
        .for('update');
      if (
        user?.status !== 'active' ||
        !user.passwordHash ||
        !(await this.canIssue(tx, passwordResetTokens, user.id))
      )
        return undefined;
      const token = randomBytes(32).toString('base64url');
      await tx.insert(passwordResetTokens).values({
        userId: user.id,
        tokenDigest: digest(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      await this.outbox.enqueue(tx, 'reset-password', {
        recipient: user.email,
        token,
      });
    });
    return { accepted: true };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ reset: true }> {
    const tokenDigest = digest(token);
    const passwordHash = await this.passwords.hash(password);
    return this.db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenDigest, tokenDigest),
            isNull(passwordResetTokens.consumedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!record)
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Reset token is invalid or expired',
        });
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, record.userId))
        .limit(1);
      if (!user || user.status !== 'active')
        throw new UnauthorizedException({
          code: 'UNAUTHENTICATED',
          message: 'Account is unavailable',
        });
      const [consumed] = await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.id, record.id),
            isNull(passwordResetTokens.consumedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .returning({ id: passwordResetTokens.id });
      if (!consumed)
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Reset token is invalid or expired',
        });
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date(), revocationReason: 'password_reset' })
        .where(
          and(eq(authSessions.userId, user.id), isNull(authSessions.revokedAt)),
        );
      await this.outbox.enqueue(tx, 'password-changed', {
        recipient: user.email,
        ...(user.displayName ? { userName: user.displayName } : {}),
      });
      await this.audit.record(tx, {
        actorUserId: user.id,
        action: 'auth.password_reset',
        resourceType: 'user',
        resourceId: user.id,
      });
      return { reset: true };
    });
  }

  async authenticate(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, normalizeEmail(email)))
      .limit(1);
    const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const valid = await this.passwords.verify(hash, password);
    if (!user || !valid || user.status !== 'active') {
      this.metrics.increment('authentication_failures_total');
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    if (user.passwordHash && this.passwords.needsRehash(hash)) {
      const passwordHash = await this.passwords.hash(password);
      await this.db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(and(eq(users.id, user.id), eq(users.passwordHash, hash)));
    }
    return publicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    nextPassword: string,
  ): Promise<{ changed: true }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (
      !user?.passwordHash ||
      user.status !== 'active' ||
      !(await this.passwords.verify(user.passwordHash, currentPassword))
    )
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    const currentHash = user.passwordHash;
    const passwordHash = await this.passwords.hash(nextPassword);
    const updated = await this.db.transaction(async (tx) => {
      const [changed] = await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(and(eq(users.id, user.id), eq(users.passwordHash, currentHash)))
        .returning({ id: users.id });
      if (changed)
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date(), revocationReason: 'password_change' })
          .where(
            and(
              eq(authSessions.userId, user.id),
              isNull(authSessions.revokedAt),
            ),
          );
      if (changed) {
        await this.outbox.enqueue(tx, 'password-changed', {
          recipient: user.email,
          ...(user.displayName ? { userName: user.displayName } : {}),
        });
        await this.audit.record(tx, {
          actorUserId: user.id,
          action: 'auth.password_change',
          resourceType: 'user',
          resourceId: user.id,
        });
      }
      return changed;
    });
    if (!updated)
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    return { changed: true };
  }

  async confirmCurrentPassword(userId: string, currentPassword: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'active')))
      .limit(1);
    if (
      !user?.passwordHash ||
      !(await this.passwords.verify(user.passwordHash, currentPassword))
    )
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
  }

  async profile(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'active')))
      .limit(1);
    if (!user)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Account is unavailable',
      });
    return publicUser(user);
  }

  private async canIssue(
    db: Pick<Database, 'select'>,
    table: typeof emailVerificationTokens | typeof passwordResetTokens,
    userId: string,
  ): Promise<boolean> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.userId, userId), gt(table.createdAt, hourAgo)))
      .limit(3);
    return rows.length < 3;
  }
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<object>();
  let candidate: unknown = error;
  while (typeof candidate === 'object' && candidate !== null) {
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    if (
      'code' in candidate &&
      (candidate as { code?: unknown }).code === '23505'
    )
      return true;
    candidate =
      'cause' in candidate
        ? (candidate as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}
