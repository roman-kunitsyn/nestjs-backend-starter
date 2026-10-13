import { z } from 'zod';

export const membershipRoleSchema = z.enum(['ADMIN', 'MEMBER', 'VIEWER']);
export const organizationRoleSchema = z.enum([
  'OWNER',
  'ADMIN',
  'MEMBER',
  'VIEWER',
]);
export const memberIdSchema = z.string().uuid();
export const invitationIdSchema = z.string().uuid();
export const memberRoleUpdateSchema = z
  .object({ role: membershipRoleSchema })
  .strict();
export const invitationCreateSchema = z
  .object({
    email: z.string().trim().email().max(320),
    role: membershipRoleSchema,
  })
  .strict();
export const invitationAcceptSchema = z
  .object({ token: z.string().min(32).max(128) })
  .strict();
export const ownershipTransferSchema = z
  .object({
    membershipId: z.string().uuid(),
    currentPassword: z.string().min(1).max(256),
  })
  .strict();

export const memberResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: organizationRoleSchema,
  status: z.enum(['active', 'suspended']),
  joinedAt: z.date(),
});
export const invitationResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: membershipRoleSchema,
  status: z.enum(['pending', 'accepted', 'revoked']),
  expiresAt: z.date(),
  createdAt: z.date(),
});
export type CreateInvitationInput = z.output<typeof invitationCreateSchema>;
