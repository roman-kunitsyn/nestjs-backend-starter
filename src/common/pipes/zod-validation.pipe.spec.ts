import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  it('returns normalized and coerced schema output', () => {
    const schema = z
      .object({
        email: z.string().trim().email().toLowerCase(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .strict();

    expect(
      new ZodValidationPipe(schema).transform({ email: ' USER@EXAMPLE.COM ' }),
    ).toEqual({
      email: 'user@example.com',
      limit: 20,
    });
  });

  it('rejects unknown write fields with safe issue details', () => {
    const pipe = new ZodValidationPipe(
      z.object({ name: z.string().max(80) }).strict(),
    );

    try {
      pipe.transform({ name: 'Example', isAdmin: true });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toMatchObject({
        status: 400,
        response: { code: 'VALIDATION_ERROR', issues: expect.any(Array) },
      });
    }
  });
});
