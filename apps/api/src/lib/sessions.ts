import type { ClientPlatform } from '@noted/shared';
import type { Types } from 'mongoose';
import { Session } from '../models/session.js';
import { createRefreshToken, REFRESH_TOKEN_TTL_MS, type TokenService } from './tokens.js';

export async function issueSession(
  tokens: TokenService,
  userId: Types.ObjectId,
  platform: ClientPlatform,
  userAgent: string,
) {
  const refresh = createRefreshToken();
  const session = await Session.create({
    userId,
    platform,
    userAgent: userAgent.slice(0, 300),
    tokenHash: refresh.hash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  const accessToken = await tokens.signAccess({
    userId: userId.toString(),
    sessionId: session._id.toString(),
  });
  return { accessToken, refreshToken: refresh.token };
}
