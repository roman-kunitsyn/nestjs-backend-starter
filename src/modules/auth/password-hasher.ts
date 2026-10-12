import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasher {
  private readonly options: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  };

  hash(password: string): Promise<string> {
    return argon2.hash(password, { ...this.options, raw: false });
  }

  verify(encoded: string, password: string): Promise<boolean> {
    return argon2.verify(encoded, password).catch(() => false);
  }

  needsRehash(encoded: string): boolean {
    try {
      return argon2.needsRehash(encoded, this.options);
    } catch {
      return true;
    }
  }
}
