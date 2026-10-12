import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { EnvironmentConfig } from '../../config/environment.js';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import { auditEvents } from '../../infrastructure/database/schema/resources.schema.js';
import {
  authSessions,
  refreshTokenHistory,
  users,
} from '../../infrastructure/database/schema/identity.schema.js';
import { AuthService } from './auth.service.js';
import { JwtService } from './jwt.service.js';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const unavailable = () =>
  new UnauthorizedException({
    code: 'UNAUTHENTICATED',
    message: 'Session is invalid or expired',
  });

@Injectable()
export class SessionService {
  private readonly refreshKey: Buffer;
  private readonly retryGraceMs = 2000;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentConfig>,
  ) {
    const configuredKey = config.getOrThrow('AUTH_REFRESH_TOKEN_KEY', {
      infer: true,
    });
    this.refreshKey = configuredKey
      ? Buffer.from(configuredKey, 'base64url')
      : randomBytes(32);
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const user = await this.auth.authenticate(email, password);
    const now = new Date();
    const refreshToken = randomBytes(32).toString('base64url');
    const [session] = await this.db
      .insert(authSessions)
      .values({
        userId: user.id,
        refreshTokenDigest: digest(refreshToken),
        familyId: randomUUID(),
        expiresAt: new Date(
          now.getTime() + this.days('AUTH_SESSION_MAX_DAYS') * 86400000,
        ),
        userAgent,
        ipAddress,
      })
      .returning();
    if (!session) throw new Error('Session creation failed');
    return {
      user,
      sessionId: session.id,
      accessToken: await this.jwt.sign(user.id, session.id),
      refreshToken,
    };
  }

  async refresh(token: string) {
    const tokenDigest = digest(token);
    const result = await this.db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(authSessions)
        .where(eq(authSessions.refreshTokenDigest, tokenDigest))
        .limit(1)
        .for('update');
      if (!session) {
        const [consumed] = await tx
          .select()
          .from(refreshTokenHistory)
          .where(eq(refreshTokenHistory.tokenDigest, tokenDigest))
          .limit(1);
        if (consumed) {
          const now = new Date();
          if (
            consumed.reuseDetectedAt === null &&
            now.getTime() - consumed.rotatedAt.getTime() <= this.retryGraceMs
          ) {
            const [owner] = await tx
              .select({
                userId: authSessions.userId,
                revokedAt: authSessions.revokedAt,
                expiresAt: authSessions.expiresAt,
                lastUsedAt: authSessions.lastUsedAt,
                status: users.status,
              })
              .from(authSessions)
              .innerJoin(users, eq(users.id, authSessions.userId))
              .where(eq(authSessions.id, consumed.sessionId))
              .limit(1);
            if (
              !owner ||
              owner.revokedAt ||
              owner.status !== 'active' ||
              owner.expiresAt <= now ||
              owner.lastUsedAt.getTime() +
                this.days('AUTH_REFRESH_IDLE_DAYS') * 86400000 <=
                now.getTime()
            )
              return { outcome: 'invalid' as const };
            return {
              outcome: 'retry' as const,
              userId: owner?.userId,
              sessionId: consumed.sessionId,
              refreshToken: this.nextRefreshToken(
                consumed.sessionId,
                tokenDigest,
              ),
            };
          }
          await tx
            .update(refreshTokenHistory)
            .set({ reuseDetectedAt: now })
            .where(eq(refreshTokenHistory.id, consumed.id));
          const [sessionOwner] = await tx
            .select({ userId: authSessions.userId })
            .from(authSessions)
            .where(eq(authSessions.id, consumed.sessionId))
            .limit(1);
          await tx
            .update(authSessions)
            .set({ revokedAt: now, revocationReason: 'refresh_reuse' })
            .where(
              and(
                eq(authSessions.id, consumed.sessionId),
                isNull(authSessions.revokedAt),
              ),
            );
          await tx.insert(auditEvents).values({
            actorUserId: sessionOwner?.userId,
            actorSessionId: consumed.sessionId,
            action: 'auth.refresh_reuse',
            resourceType: 'auth_session',
            resourceId: consumed.sessionId,
            metadata: {},
          });
          return { outcome: 'replay' as const };
        }
        return { outcome: 'invalid' as const };
      }
      const now = new Date();
      if (
        session.revokedAt ||
        session.expiresAt <= now ||
        session.lastUsedAt.getTime() +
          this.days('AUTH_REFRESH_IDLE_DAYS') * 86400000 <=
          now.getTime()
      )
        throw unavailable();
      const [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, session.userId), eq(users.status, 'active')))
        .limit(1);
      if (!user) throw unavailable();
      const refreshToken = this.nextRefreshToken(session.id, tokenDigest);
      await tx.insert(refreshTokenHistory).values({
        sessionId: session.id,
        tokenDigest,
        expiresAt: session.expiresAt,
      });
      await tx
        .update(authSessions)
        .set({ refreshTokenDigest: digest(refreshToken), lastUsedAt: now })
        .where(
          and(
            eq(authSessions.id, session.id),
            eq(authSessions.refreshTokenDigest, tokenDigest),
            isNull(authSessions.revokedAt),
          ),
        );
      return {
        outcome: 'rotated' as const,
        userId: user.id,
        sessionId: session.id,
        refreshToken,
      };
    });
    if (result.outcome === 'invalid' || result.outcome === 'replay')
      throw unavailable();
    if (!result.userId) throw unavailable();
    return {
      ...result,
      accessToken: await this.jwt.sign(result.userId, result.sessionId),
    };
  }

  async validate(userId: string, sessionId: string) {
    const now = new Date();
    const [session] = await this.db
      .select({ id: authSessions.id })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.id, sessionId),
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
          eq(users.status, 'active'),
        ),
      )
      .limit(1);
    if (!session) throw unavailable();
  }

  async logout(sessionId: string) {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date(), revocationReason: 'logout' })
      .where(
        and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)),
      );
    return { loggedOut: true };
  }
  async logoutAll(userId: string) {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date(), revocationReason: 'logout' })
      .where(
        and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)),
      );
    return { loggedOut: true };
  }
  async list(userId: string) {
    return this.db
      .select({
        id: authSessions.id,
        createdAt: authSessions.createdAt,
        lastUsedAt: authSessions.lastUsedAt,
        expiresAt: authSessions.expiresAt,
        userAgent: authSessions.userAgent,
        ipAddress: authSessions.ipAddress,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(authSessions.lastUsedAt));
  }
  async revoke(userId: string, sessionId: string) {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date(), revocationReason: 'logout' })
      .where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.id, sessionId),
          isNull(authSessions.revokedAt),
        ),
      );
    return { revoked: true };
  }
  accessToken(userId: string, sessionId: string) {
    return this.jwt.sign(userId, sessionId);
  }
  cookieOptions() {
    return {
      secure:
        this.config.get('AUTH_REFRESH_COOKIE_SECURE', { infer: true }) ??
        this.config.getOrThrow('NODE_ENV', { infer: true }) === 'production',
      maxAge: this.days('AUTH_REFRESH_IDLE_DAYS') * 86400,
    };
  }
  private days(key: 'AUTH_REFRESH_IDLE_DAYS' | 'AUTH_SESSION_MAX_DAYS') {
    return this.config.getOrThrow(key, { infer: true });
  }

  private nextRefreshToken(sessionId: string, priorDigest: string): string {
    return createHmac('sha256', this.refreshKey)
      .update(`${sessionId}:${priorDigest}`)
      .digest('base64url');
  }
}
