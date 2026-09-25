import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;
export const PENDING_SIGNUP_TTL_MS = 24 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

const hashCode = (code: string) => createHash('sha256').update(code).digest();

export function createVerificationCode(): { code: string; hash: string } {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  return { code, hash: hashCode(code).toString('hex') };
}

export function matchesVerificationCode(hash: string, code: string): boolean {
  return timingSafeEqual(Buffer.from(hash, 'hex'), hashCode(code));
}
