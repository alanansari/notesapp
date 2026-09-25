import {
  loginSchema,
  type PendingSignup as PendingSignupDTO,
  refreshSchema,
  resendSignupCodeSchema,
  signupSchema,
  verifySignupSchema,
} from '@noted/shared';
import type { FastifyInstance } from 'fastify';
import { mongo } from 'mongoose';
import { HttpError } from '../lib/http-error.js';
import { type Mailer, verificationEmail } from '../lib/mailer.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { issueSession } from '../lib/sessions.js';
import {
  createRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  type TokenService,
} from '../lib/tokens.js';
import {
  createVerificationCode,
  MAX_CODE_ATTEMPTS,
  matchesVerificationCode,
  PENDING_SIGNUP_TTL_MS,
  RESEND_COOLDOWN_MS,
  VERIFICATION_CODE_TTL_MS,
} from '../lib/verification.js';
import { PendingSignup } from '../models/pending-signup.js';
import { Session } from '../models/session.js';
import { toUserDTO, User, type UserDoc } from '../models/user.js';
import { requireAuth } from '../plugins/auth.js';

const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };

const EXPIRED_SIGNUP = 'This sign-up has expired. Create your account again.';

const toPendingDTO = (pending: { email: string; sentAt: Date }): PendingSignupDTO => ({
  email: pending.email,
  resendAfter: pending.sentAt.getTime() + RESEND_COOLDOWN_MS,
});

export async function authRoutes(
  app: FastifyInstance,
  { tokens, mailer }: { tokens: TokenService; mailer: Mailer },
) {
  // Emails a fresh code and stores it (plus any account fields) on the pending sign-up.
  async function sendVerificationCode(email: string, name: string, fields: { passwordHash?: string } = {}) {
    const { code, hash } = createVerificationCode();
    await mailer.send(verificationEmail(email, name, code));
    const now = Date.now();
    const pending = await PendingSignup.findOneAndUpdate(
      { email },
      {
        ...fields,
        name,
        codeHash: hash,
        attempts: 0,
        sentAt: new Date(now),
        codeExpiresAt: new Date(now + VERIFICATION_CODE_TTL_MS),
        expiresAt: new Date(now + PENDING_SIGNUP_TTL_MS),
      },
      { upsert: true, returnDocument: 'after' },
    );
    if (!pending) throw new HttpError(500, 'Something went wrong.');
    return pending;
  }

  app.post('/auth/signup', { config: authRateLimit }, async (request, reply) => {
    const input = signupSchema.parse(request.body);
    if (await User.exists({ email: input.email })) {
      throw new HttpError(409, 'An account with this email already exists. Try logging in.');
    }
    const passwordHash = await hashPassword(input.password);
    const existing = await PendingSignup.findOne({ email: input.email, expiresAt: { $gt: new Date() } });
    if (existing && Date.now() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
      // A code was just sent; keep it valid rather than emailing another one.
      existing.set({ name: input.name, passwordHash });
      await existing.save();
      return reply.code(202).send(toPendingDTO(existing));
    }
    const pending = await sendVerificationCode(input.email, input.name, { passwordHash });
    return reply.code(202).send(toPendingDTO(pending));
  });

  app.post('/auth/signup/verify', { config: authRateLimit }, async (request, reply) => {
    const input = verifySignupSchema.parse(request.body);
    const pending = await PendingSignup.findOneAndUpdate(
      { email: input.email, expiresAt: { $gt: new Date() } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!pending) throw new HttpError(400, EXPIRED_SIGNUP);
    if (pending.attempts > MAX_CODE_ATTEMPTS || pending.codeExpiresAt.getTime() < Date.now()) {
      throw new HttpError(400, 'This code has expired. Send a new one.');
    }
    if (!matchesVerificationCode(pending.codeHash, input.code)) {
      throw new HttpError(400, 'That code isn’t right. Check your email and try again.');
    }

    let user: UserDoc;
    try {
      user = await User.create({
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
      });
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new HttpError(409, 'An account with this email already exists. Try logging in.');
      }
      throw error;
    } finally {
      await pending.deleteOne();
    }
    const pair = await issueSession(tokens, user._id, input.platform, request.headers['user-agent'] ?? '');
    return reply.code(201).send({ user: toUserDTO(user), ...pair });
  });

  app.post('/auth/signup/resend', { config: authRateLimit }, async (request) => {
    const { email } = resendSignupCodeSchema.parse(request.body);
    const pending = await PendingSignup.findOne({ email, expiresAt: { $gt: new Date() } });
    if (!pending) throw new HttpError(400, EXPIRED_SIGNUP);
    const wait = pending.sentAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
    if (wait > 0) {
      throw new HttpError(429, `Wait ${Math.ceil(wait / 1000)} seconds before sending another code.`);
    }
    return toPendingDTO(await sendVerificationCode(email, pending.name));
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
