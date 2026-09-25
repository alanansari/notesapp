import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Types } from 'mongoose';
import { HttpError } from '../lib/http-error.js';
import type { TokenService } from '../lib/tokens.js';
import { Session } from '../models/session.js';

export interface RequestAuth {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: RequestAuth | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function requireAuth(request: FastifyRequest): RequestAuth {
  if (!request.auth) throw new HttpError(401, 'Not signed in.');
  return request.auth;
}

export const authPlugin = fp<{ tokens: TokenService }>(async (app: FastifyInstance, { tokens }) => {
  app.decorateRequest('auth', null);

  app.decorate('authenticate', async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const claims = token ? await tokens.verifyAccess(token) : null;
    if (!claims || !Types.ObjectId.isValid(claims.sessionId)) throw new HttpError(401, 'Not signed in.');

    const sessionId = new Types.ObjectId(claims.sessionId);
    const userId = new Types.ObjectId(claims.userId);
    const session = await Session.findOne(
      { _id: sessionId, userId, expiresAt: { $gt: new Date() } },
      { lastSeenAt: 1 },
    ).lean();
    if (!session) throw new HttpError(401, 'Your session has ended. Log in again.');
    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await Session.updateOne({ _id: sessionId }, { lastSeenAt: new Date() });
    }

    request.auth = { userId, sessionId };
  });
});
