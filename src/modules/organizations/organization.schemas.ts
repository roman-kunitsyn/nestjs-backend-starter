import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((value) =>
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''),
  )
  .pipe(
    z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((value) => !['admin', 'system', 'api'].includes(value), {
        message: 'This slug is reserved',
      }),
  );

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: slugSchema,
  })
  .strict();

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    slug: slugSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const organizationIdSchema = z.string().uuid();

export const organizationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200),
  slug: z.string().max(100),
  status: z.enum(['active', 'suspended', 'archived']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const organizationMembershipResponseSchema = z.object({
  id: z.string().uuid(),
  role: z.string().nullable(),
  status: z.enum(['active', 'suspended']),
});

export const organizationListItemResponseSchema =
  organizationResponseSchema.extend({
    membership: organizationMembershipResponseSchema,
  });

export type CreateOrganizationInput = z.output<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.output<typeof updateOrganizationSchema>;
