import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateKeyPair,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
} from 'jose';
import { randomUUID } from 'node:crypto';
import type { EnvironmentConfig } from '../../config/environment.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class JwtService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly kid: string;
  private readonly privateKey: Promise<CryptoKey>;
  private readonly publicKeys: Promise<Map<string, CryptoKey>>;
  constructor(config: ConfigService<EnvironmentConfig>) {
    this.issuer = config.getOrThrow('AUTH_JWT_ISSUER', { infer: true });
    this.audience = config.getOrThrow('AUTH_JWT_AUDIENCE', { infer: true });
    this.kid = config.getOrThrow('AUTH_JWT_KID', { infer: true });
    const privatePem = config
      .getOrThrow('AUTH_JWT_PRIVATE_KEY', { infer: true })
      .replaceAll('\\n', '\n');
    const publicPem = config
      .getOrThrow('AUTH_JWT_PUBLIC_KEY', { infer: true })
      .replaceAll('\\n', '\n');
    if (privatePem && publicPem) {
      this.privateKey = importPKCS8(privatePem, 'EdDSA');
      const configured = config.getOrThrow('AUTH_JWT_PUBLIC_KEYS', {
        infer: true,
      });
      this.publicKeys = Promise.all([
        importSPKI(publicPem, 'EdDSA'),
        configured
          ? Promise.resolve(JSON.parse(configured) as Record<string, string>)
          : Promise.resolve({}),
      ]).then(async ([active, previous]) => {
        const keys = new Map<string, CryptoKey>();
        for (const [keyId, pem] of Object.entries(
          previous as Record<string, string>,
        ))
          keys.set(
            keyId,
            await importSPKI(pem.replaceAll('\\n', '\n'), 'EdDSA'),
          );
        keys.set(this.kid, active);
        return keys;
      });
    } else {
      const pair = generateKeyPair('EdDSA', {
        crv: 'Ed25519',
        extractable: true,
      });
      this.privateKey = pair.then(({ privateKey }) => privateKey);
      this.publicKeys = pair.then(
        ({ publicKey }) => new Map([[this.kid, publicKey]]),
      );
    }
  }
  async sign(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: this.kid })
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setSubject(userId)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(await this.privateKey);
  }
  async verify(token: string): Promise<{ userId: string; sessionId: string }> {
    try {
      const { payload } = await jwtVerify(
        token,
        async (header) => {
          if (header.alg !== 'EdDSA' || typeof header.kid !== 'string')
            throw new Error('invalid header');
          const key = (await this.publicKeys).get(header.kid);
          if (!key) throw new Error('unknown kid');
          return key;
        },
        {
          algorithms: ['EdDSA'],
          issuer: this.issuer,
          audience: this.audience,
          requiredClaims: ['sub', 'sid', 'jti', 'iat', 'exp'],
        },
      );
      if (
        typeof payload.sub !== 'string' ||
        !UUID_PATTERN.test(payload.sub) ||
        typeof payload.sid !== 'string' ||
        !UUID_PATTERN.test(payload.sid) ||
        typeof payload.jti !== 'string' ||
        !UUID_PATTERN.test(payload.jti) ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      )
        throw new Error('invalid claims');
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Access token is invalid or expired',
      });
    }
  }
}
