import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccessClaims {
  userId: string;
  sessionId: string;
}

export function createTokenService(secret: string) {
  const key = new TextEncoder().encode(secret);

  return {
    signAccess: ({ userId, sessionId }: AccessClaims) =>
      new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_TTL)
        .sign(key),

    async verifyAccess(token: string): Promise<AccessClaims | null> {
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
        if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
        return { userId: payload.sub, sessionId: payload.sid };
      } catch {
        return null;
      }
    },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;

export function createRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
