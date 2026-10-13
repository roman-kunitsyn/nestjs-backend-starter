import { z } from 'zod';

export const resourceIdSchema = z.string().uuid();
export const resourceStatusSchema = z.enum(['active', 'archived']);
export const resourceResponseSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    createdByMembershipId: z.string().uuid(),
    title: z.string().max(200),
    description: z.string().nullable(),
    status: resourceStatusSchema,
    createdAt: z.coerce.date().transform((date) => date.toISOString()),
    updatedAt: z.coerce.date().transform((date) => date.toISOString()),
  })
  .strict();
export const createResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10000).nullable().optional(),
  })
  .strict();
export const updateResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(10000).nullable().optional(),
    status: resourceStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export const resourceListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().max(2048).optional(),
    sort: z.enum(['createdAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    status: resourceStatusSchema.optional(),
    q: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
export const idempotencyKeySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\x21-\x7E]+$/);

export type CreateResourceInput = z.output<typeof createResourceSchema>;
export type UpdateResourceInput = z.output<typeof updateResourceSchema>;
export type ResourceListQuery = z.output<typeof resourceListQuerySchema>;
