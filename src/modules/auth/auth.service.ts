import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import {
  emailVerificationTokens,
  passwordResetTokens,
  users,
} from '../../infrastructure/database/schema/identity.schema.js';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender.js';
import { PasswordHasher } from './password-hasher.js';
import type { RegisterInput } from './auth.schemas.js';

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
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
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
    await this.email.send({
      to: email,
      subject: 'Verify your email',
      text: `Verify your email with this token: ${token}`,
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
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, normalizedEmail))
      .limit(1);
    if (user?.status === 'active' && !user.emailVerifiedAt) {
      if (await this.canIssue(emailVerificationTokens, user.id)) {
        const token = randomBytes(32).toString('base64url');
        await this.db.insert(emailVerificationTokens).values({
          userId: user.id,
          tokenDigest: digest(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await this.email.send({
          to: user.email,
          subject: 'Verify your email',
          text: `Verify your email with this token: ${token}`,
        });
      }
    }
    return { accepted: true };
  }

  async forgotPassword(email: string): Promise<{ accepted: true }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, normalizeEmail(email)))
      .limit(1);
    if (
      user?.status === 'active' &&
      user.passwordHash &&
      (await this.canIssue(passwordResetTokens, user.id))
    ) {
      const token = randomBytes(32).toString('base64url');
      await this.db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenDigest: digest(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      await this.email.send({
        to: user.email,
        subject: 'Reset your password',
        text: `Reset your password with this token: ${token}`,
      });
    }
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
    if (!user || !valid || user.status !== 'active')
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    if (this.passwords.needsRehash(hash)) {
      const passwordHash = await this.passwords.hash(password);
      await this.db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));
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
    const passwordHash = await this.passwords.hash(nextPassword);
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(
        and(eq(users.id, user.id), eq(users.passwordHash, user.passwordHash)),
      );
    return { changed: true };
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
    table: typeof emailVerificationTokens | typeof passwordResetTokens,
    userId: string,
  ): Promise<boolean> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await this.db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.userId, userId), gt(table.createdAt, hourAgo)))
      .limit(3);
    return rows.length < 3;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
