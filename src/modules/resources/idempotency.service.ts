import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, lt } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import { idempotencyRecords } from '../../infrastructure/database/schema/resources.schema.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export function requestFingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function canonicalJson(value: unknown): string {
  const normalize = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(normalize);
    if (typeof current === 'object' && current !== null) {
      return Object.fromEntries(
        Object.entries(current)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, normalize(nested)]),
      );
    }
    return current;
  };
  const result = JSON.stringify(normalize(value));
  if (result === undefined)
    throw new Error('Request fingerprint requires JSON data');
  return result;
}

@Injectable()
export class IdempotencyService {
  private readonly retentionHours: number;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    config: ConfigService,
  ) {
    this.retentionHours = config.getOrThrow<number>(
      'RESOURCE_IDEMPOTENCY_RETENTION_HOURS',
    );
  }

  async execute<T>(input: {
    organizationId: string;
    actorUserId: string;
    key: string;
    fingerprint: string;
    responseStatus: number;
    parseResponse: (value: unknown) => T;
    perform: (tx: Transaction) => Promise<unknown>;
  }): Promise<{ status: number; body: T }> {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      await tx
        .delete(idempotencyRecords)
        .where(
          and(
            eq(idempotencyRecords.organizationId, input.organizationId),
            eq(idempotencyRecords.actorUserId, input.actorUserId),
            lt(idempotencyRecords.expiresAt, now),
          ),
        );
      const [inserted] = await tx
        .insert(idempotencyRecords)
        .values({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          key: input.key,
          requestFingerprint: input.fingerprint,
          responseStatus: input.responseStatus,
          responseBody: {},
          expiresAt: new Date(
            now.getTime() + this.retentionHours * 60 * 60 * 1000,
          ),
        })
        .onConflictDoNothing()
        .returning({ key: idempotencyRecords.key });

      if (!inserted) {
        const [existing] = await tx
          .select()
          .from(idempotencyRecords)
          .where(
            and(
              eq(idempotencyRecords.organizationId, input.organizationId),
              eq(idempotencyRecords.actorUserId, input.actorUserId),
              eq(idempotencyRecords.key, input.key),
            ),
          )
          .limit(1);
        if (!existing) throw new Error('Idempotency record disappeared');
        if (existing.requestFingerprint !== input.fingerprint) {
          throw new ConflictException({
            code: 'RESOURCE_CONFLICT',
            message:
              'The idempotency key was already used with a different request',
          });
        }
        return {
          status: existing.responseStatus,
          body: input.parseResponse(existing.responseBody),
        };
      }

      const body = input.parseResponse(await input.perform(tx));
      await tx
        .update(idempotencyRecords)
        .set({ responseBody: body })
        .where(
          and(
            eq(idempotencyRecords.organizationId, input.organizationId),
            eq(idempotencyRecords.actorUserId, input.actorUserId),
            eq(idempotencyRecords.key, input.key),
          ),
        );
      return { status: input.responseStatus, body };
    });
  }
}
