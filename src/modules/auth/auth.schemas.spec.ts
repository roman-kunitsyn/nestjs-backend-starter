import { emailSchema, registerSchema, resetSchema } from './auth.schemas.js';

describe('account request schemas', () => {
  it('accepts long passphrases and rejects short passwords and unknown fields', () => {
    expect(
      registerSchema.safeParse({
        email: ' User@Example.com ',
        password: 'correct horse battery staple',
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({ email: 'user@example.com', password: 'short' })
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        email: 'user@example.com',
        password: 'correct horse battery staple',
        passwordHash: 'secret',
      }).success,
    ).toBe(false);
  });

  it('validates recovery inputs and rejects malformed addresses/tokens', () => {
    expect(emailSchema.safeParse({ email: 'user@example.com' }).success).toBe(
      true,
    );
    expect(emailSchema.safeParse({ email: 'not an email' }).success).toBe(
      false,
    );
    expect(
      resetSchema.safeParse({
        token: 'tiny',
        password: 'correct horse battery staple',
      }).success,
    ).toBe(false);
  });
});
