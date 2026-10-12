import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const PaginationBaseSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(2048).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export function createPaginationQuerySchema<
  const TSort extends readonly [string, ...string[]],
>(sortFields: TSort) {
  return PaginationBaseSchema.extend({
    sort: z.enum(sortFields).optional(),
  }).strict();
}

export const PaginationQuerySchema = createPaginationQuerySchema([
  'createdAt',
  'id',
]);

export type PaginationQuery = z.output<typeof PaginationQuerySchema>;

export interface CursorContext {
  query: string;
  tenantId?: string;
}

interface CursorPayload {
  version: 1;
  value: unknown;
  context: string;
}

function contextDigest(context: CursorContext, secret: string): string {
  return createHmac('sha256', secret)
    .update(
      JSON.stringify({
        query: context.query,
        tenantId: context.tenantId ?? null,
      }),
    )
    .digest('base64url');
}

/** Signed opaque cursor that cannot be reused with a different query or tenant. */
export function encodeCursor(
  value: unknown,
  context: CursorContext,
  secret: string,
): string {
  if (secret.length < 32)
    throw new Error('Cursor secret must be at least 32 characters');
  const payload: CursorPayload = {
    version: 1,
    value,
    context: contextDigest(context, secret),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function decodeCursor<T = unknown>(
  cursor: string,
  context: CursorContext,
  secret: string,
): T {
  if (secret.length < 32)
    throw new Error('Cursor secret must be at least 32 characters');
  const parts = cursor.split('.');
  if (parts.length !== 2 || cursor.length > 2048)
    throw new Error('Invalid cursor');
  const [encoded, signature] = parts as [string, string];
  const expected = createHmac('sha256', secret).update(encoded).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    throw new Error('Invalid cursor');
  }
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new Error('Invalid cursor');
  }
  let payload: CursorPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as CursorPayload;
  } catch {
    throw new Error('Invalid cursor');
  }
  const expectedContext = contextDigest(context, secret);
  const actualContext = Buffer.from(payload.context ?? '');
  const contextBuffer = Buffer.from(expectedContext);
  if (
    payload.version !== 1 ||
    actualContext.length !== contextBuffer.length ||
    !timingSafeEqual(actualContext, contextBuffer)
  ) {
    throw new Error('Cursor does not match this query');
  }
  return payload.value as T;
}

export function parsePaginationQuery<
  TSort extends readonly [string, ...string[]],
>(input: unknown, sortFields: TSort) {
  const result = createPaginationQuerySchema(sortFields).safeParse(input);
  if (!result.success) {
    throw new Error('Invalid pagination or unsupported sort field');
  }
  return result.data;
}
