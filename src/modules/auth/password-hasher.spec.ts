import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('hashes with Argon2id and verifies without exposing the password', async () => {
    const encoded = await hasher.hash('a long passphrase with spaces');
    expect(encoded).toMatch(/^\$argon2id\$/);
    await expect(
      hasher.verify(encoded, 'a long passphrase with spaces'),
    ).resolves.toBe(true);
    await expect(hasher.verify(encoded, 'wrong passphrase')).resolves.toBe(
      false,
    );
  });

  it('reports old or malformed hashes for safe rehash handling', () => {
    expect(hasher.needsRehash('$argon2id$invalid')).toBe(true);
  });
});
