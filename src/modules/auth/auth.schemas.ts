import { z } from 'zod';

const password = z.string().min(12).max(256);
export const registerSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password,
    displayName: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
export const emailSchema = z
  .object({ email: z.string().trim().email().max(320) })
  .strict();
export const tokenSchema = z
  .object({ token: z.string().min(32).max(256) })
  .strict();
export const resetSchema = tokenSchema.extend({ password }).strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: password,
  })
  .strict();
export type RegisterInput = z.infer<typeof registerSchema>;
