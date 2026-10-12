import { ConfigService } from '@nestjs/config';
import { exportPKCS8, exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import type { EnvironmentConfig } from '../../config/environment.js';
import { JwtService } from './jwt.service.js';

const config = (values: Partial<EnvironmentConfig>) =>
  new ConfigService<EnvironmentConfig>({
    NODE_ENV: 'test',
    APP_NAME: 'test',
    APP_HOST: '127.0.0.1',
    PORT: 3000,
    API_DOCS_ENABLED: false,
    DATABASE_URL: 'postgresql://app:app@localhost:5432/app',
    DB_POOL_MAX: 2,
    DB_CONNECT_TIMEOUT_SECONDS: 10,
    DB_IDLE_TIMEOUT_SECONDS: 20,
    AUTH_JWT_ISSUER: 'https://api.example.test',
    AUTH_JWT_AUDIENCE: 'test',
    AUTH_JWT_KID: 'active',
    AUTH_JWT_PRIVATE_KEY: '',
    AUTH_JWT_PUBLIC_KEY: '',
    AUTH_JWT_PUBLIC_KEYS: '',
    AUTH_REFRESH_TOKEN_KEY: '',
    AUTH_REFRESH_IDLE_DAYS: 14,
    AUTH_SESSION_MAX_DAYS: 30,
    ...values,
  });

describe('JWT session credentials', () => {
  it('signs and verifies session-bound EdDSA tokens', async () => {
    const jwt = new JwtService(config({}));
    const token = await jwt.sign(randomUUID(), randomUUID());
    const claims = await jwt.verify(token);
    expect(claims.userId).toMatch(/[0-9a-f-]{36}/);
    expect(claims.sessionId).toMatch(/[0-9a-f-]{36}/);
    await expect(jwt.verify(`${token}x`)).rejects.toMatchObject({
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  it('accepts configured retiring public keys by kid during rotation', async () => {
    const oldPair = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });
    const newPair = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });
    const oldPrivate = await exportPKCS8(oldPair.privateKey);
    const oldPublic = await exportSPKI(oldPair.publicKey);
    const newPrivate = await exportPKCS8(newPair.privateKey);
    const newPublic = await exportSPKI(newPair.publicKey);
    const retiring = new JwtService(
      config({
        AUTH_JWT_KID: 'old',
        AUTH_JWT_PRIVATE_KEY: oldPrivate,
        AUTH_JWT_PUBLIC_KEY: oldPublic,
      }),
    );
    const active = new JwtService(
      config({
        AUTH_JWT_KID: 'new',
        AUTH_JWT_PRIVATE_KEY: newPrivate,
        AUTH_JWT_PUBLIC_KEY: newPublic,
        AUTH_JWT_PUBLIC_KEYS: JSON.stringify({ old: oldPublic }),
      }),
    );
    const token = await retiring.sign(randomUUID(), randomUUID());
    await expect(active.verify(token)).resolves.toMatchObject({
      userId: expect.any(String),
      sessionId: expect.any(String),
    });
    const forgedHeader = await new SignJWT({ sid: randomUUID() })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: 'new' })
      .setIssuer('https://api.example.test')
      .setAudience('test')
      .setSubject(randomUUID())
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new Uint8Array(32));
    await expect(active.verify(forgedHeader)).rejects.toMatchObject({
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects expired access tokens and tokens missing required claims', async () => {
    const pair = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });
    const jwt = new JwtService(
      config({
        AUTH_JWT_PRIVATE_KEY: await exportPKCS8(pair.privateKey),
        AUTH_JWT_PUBLIC_KEY: await exportSPKI(pair.publicKey),
      }),
    );
    const expired = await new SignJWT({ sid: randomUUID() })
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: 'active' })
      .setIssuer('https://api.example.test')
      .setAudience('test')
      .setSubject(randomUUID())
      .setJti(randomUUID())
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(pair.privateKey);
    await expect(jwt.verify(expired)).rejects.toMatchObject({
      response: { code: 'UNAUTHENTICATED' },
    });
  });
});
