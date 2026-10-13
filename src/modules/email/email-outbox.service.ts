import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, gte, lte, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import { emailOutbox } from '../../infrastructure/database/schema/resources.schema.js';
import { auditEvents } from '../../infrastructure/database/schema/resources.schema.js';
import {
  renderEmail,
  type EmailTemplate,
  type TemplateInput,
} from './email-templates.js';
import { EMAIL_SENDER, type EmailSender } from './email-sender.js';
import type { EnvironmentConfig } from '../../config/environment.js';
import { MetricsService } from '../observability/metrics.js';
import { trace, SpanStatusCode } from '@opentelemetry/api';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const MAX_ATTEMPTS = 8;
const MAX_BATCH_SIZE = 25;
const LEASE_MS = 15 * 60_000;
const DELIVERY_CONCURRENCY = 5;

function safeAuditMetadata(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/password|token|secret|authorization|cookie|credential/i.test(key))
      continue;
    if (item && typeof item === 'object' && !Array.isArray(item))
      safe[key] = safeAuditMetadata(item as Record<string, unknown>);
    else if (Array.isArray(item))
      safe[key] = item.map((entry) =>
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? safeAuditMetadata(entry as Record<string, unknown>)
          : entry,
      );
    else safe[key] = item;
  }
  return safe;
}

@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    @Optional() private readonly metrics: MetricsService = new MetricsService(),
  ) {}

  async enqueue(
    tx: Transaction,
    template: EmailTemplate,
    input: TemplateInput,
  ): Promise<void> {
    await tx.insert(emailOutbox).values({
      template,
      recipient: input.recipient,
      payload: input,
    });
  }

  /** Dispatches one bounded batch. Provider calls happen after claim transactions commit. */
  async dispatchOnce(
    batchSize = 25,
  ): Promise<{ claimed: number; sent: number; failed: number }> {
    const now = new Date();
    let expiredLeaseIds: string[] = [];
    const claimed = await this.db.transaction(async (tx) => {
      const exhausted = await tx
        .update(emailOutbox)
        .set({
          status: 'failed',
          lockedUntil: null,
          lastError: 'RetryLimitExceeded',
        })
        .where(
          and(
            eq(emailOutbox.status, 'processing'),
            lte(emailOutbox.lockedUntil, now),
            gte(emailOutbox.attemptCount, MAX_ATTEMPTS),
          ),
        )
        .returning({ id: emailOutbox.id });
      expiredLeaseIds = exhausted.map(({ id }) => id);
      const rows = await tx
        .select()
        .from(emailOutbox)
        .where(
          and(
            lte(emailOutbox.nextAttemptAt, now),
            or(
              eq(emailOutbox.status, 'pending'),
              and(
                eq(emailOutbox.status, 'processing'),
                lte(emailOutbox.lockedUntil, now),
              ),
            ),
          ),
        )
        .orderBy(asc(emailOutbox.createdAt))
        .limit(Math.max(1, Math.min(batchSize, MAX_BATCH_SIZE)))
        .for('update', { skipLocked: true });
      if (!rows.length) return [];
      const ids = rows.map((row) => row.id);
      await tx
        .update(emailOutbox)
        .set({
          status: 'processing',
          attemptCount: sql`${emailOutbox.attemptCount} + 1`,
          lockedUntil: new Date(now.getTime() + LEASE_MS),
        })
        .where(or(...ids.map((id) => eq(emailOutbox.id, id))));
      return rows;
    });
    for (const id of expiredLeaseIds)
      this.logger.error(
        `Email outbox item ${id} exhausted its retry limit after lease expiry`,
      );
    let sent = 0;
    let failed = 0;
    let cursor = 0;
    const deliver = async (row: (typeof claimed)[number]) => {
      try {
        const input = row.payload as TemplateInput;
        await trace
          .getTracer('nestjs-backend-starter')
          .startActiveSpan('email.send', async (span) => {
            try {
              span.setAttribute('email.template', row.template);
              await this.sender.send(
                renderEmail(row.template as EmailTemplate, {
                  ...input,
                  recipient: row.recipient,
                }),
              );
            } catch (error) {
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw error;
            } finally {
              span.end();
            }
          });
        await this.db
          .update(emailOutbox)
          .set({
            status: 'sent',
            sentAt: new Date(),
            lockedUntil: null,
            lastError: null,
          })
          .where(eq(emailOutbox.id, row.id));
        sent += 1;
      } catch (error) {
        this.metrics.increment('email_delivery_failures_total');
        const attemptCount = row.attemptCount + 1;
        const terminal = attemptCount >= MAX_ATTEMPTS;
        const delayMs = Math.min(
          60_000 * 2 ** (attemptCount - 1),
          6 * 60 * 60 * 1000,
        );
        const safeError =
          error instanceof Error ? error.name : 'EmailDeliveryError';
        await this.db
          .update(emailOutbox)
          .set({
            status: terminal ? 'failed' : 'pending',
            attemptCount,
            nextAttemptAt: new Date(Date.now() + delayMs),
            lockedUntil: null,
            lastError: safeError,
          })
          .where(eq(emailOutbox.id, row.id));
        if (terminal)
          this.logger.error(
            `Email outbox item ${row.id} permanently failed after ${attemptCount} attempts (${safeError})`,
          );
        failed += 1;
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(DELIVERY_CONCURRENCY, claimed.length) },
        async () => {
          while (cursor < claimed.length) {
            const row = claimed[cursor++];
            if (row) await deliver(row);
          }
        },
      ),
    );
    return { claimed: claimed.length, sent, failed };
  }
}

/** Small polling runner for the narrow email outbox; leases coordinate replicas. */
@Injectable()
export class EmailOutboxRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxRunner.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  constructor(
    private readonly outbox: EmailOutboxService,
    private readonly config: ConfigService<EnvironmentConfig>,
  ) {}

  onModuleInit(): void {
    if (this.config.getOrThrow('NODE_ENV', { infer: true }) === 'test') return;
    this.timer = setInterval(() => void this.tick(), 5000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.outbox.dispatchOnce();
    } catch (error) {
      this.logger.error(
        `Email outbox dispatch failed (${error instanceof Error ? error.name : 'unknown error'})`,
      );
    } finally {
      this.running = false;
    }
  }
}

@Injectable()
export class AuditEventService {
  async record(
    tx: Transaction,
    event: {
      action: string;
      organizationId?: string;
      actorUserId?: string;
      actorSessionId?: string;
      resourceType?: string;
      resourceId?: string;
      requestId?: string;
      ipAddress?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx
      .insert(auditEvents)
      .values({ ...event, metadata: safeAuditMetadata(event.metadata ?? {}) });
  }
}
