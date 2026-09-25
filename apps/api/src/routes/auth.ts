import { loginSchema, refreshSchema, signupSchema } from '@noted/shared';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { issueSession } from '../lib/sessions.js';
import {
  createRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  type TokenService,
} from '../lib/tokens.js';
import { Session } from '../models/session.js';
import { toUserDTO, User } from '../models/user.js';
import { requireAuth } from '../plugins/auth.js';

const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };

export async function authRoutes(app: FastifyInstance, { tokens }: { tokens: TokenService }) {
  app.post('/auth/signup', { config: authRateLimit }, async (request, reply) => {
    const input = signupSchema.parse(request.body);
    if (await User.exists({ email: input.email })) {
      throw new HttpError(409, 'An account with this email already exists. Try logging in.');
    }
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    const pair = await issueSession(tokens, user._id, input.platform, request.headers['user-agent'] ?? '');
    return reply.code(201).send({ user: toUserDTO(user), ...pair });
  });

  app.post('/auth/login', { config: authRateLimit }, async (request) => {
    const input = loginSchema.parse(request.body);
    const user = await User.findOne({ email: input.email });
    const valid = await verifyPassword(user?.passwordHash, input.password);
    if (!user || !valid) {
      throw new HttpError(401, 'That email and password don’t match. Try again.');
    }
    const pair = await issueSession(tokens, user._id, input.platform, request.headers['user-agent'] ?? '');
    return { user: toUserDTO(user), ...pair };
  });

  app.post(
    '/auth/refresh',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request) => {
      const { refreshToken } = refreshSchema.parse(request.body);
      const next = createRefreshToken();
      const session = await Session.findOneAndUpdate(
        { tokenHash: hashRefreshToken(refreshToken), expiresAt: { $gt: new Date() } },
        {
          tokenHash: next.hash,
          lastSeenAt: new Date(),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
        { returnDocument: 'after' },
      );
      if (!session) throw new HttpError(401, 'Your session has ended. Log in again.');
      const accessToken = await tokens.signAccess({
        userId: session.userId.toString(),
        sessionId: session._id.toString(),
      });
      return { accessToken, refreshToken: next.token };
    },
  );

  app.post('/auth/logout', { onRequest: app.authenticate }, async (request, reply) => {
    const { sessionId } = requireAuth(request);
    await Session.deleteOne({ _id: sessionId });
    return reply.code(204).send();
  });
}
