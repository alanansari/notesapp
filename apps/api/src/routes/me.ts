import { changePasswordSchema, type DeviceSession, updateProfileSchema } from '@noted/shared';
import type { FastifyInstance } from 'fastify';
import { Types } from 'mongoose';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { Counter } from '../models/counter.js';
import { Note, Task } from '../models/entities.js';
import { Session } from '../models/session.js';
import { toUserDTO, User } from '../models/user.js';
import { requireAuth } from '../plugins/auth.js';

async function findUser(userId: Types.ObjectId) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(401, 'Account not found.');
  return user;
}

export async function meRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/me', async (request) => toUserDTO(await findUser(requireAuth(request).userId)));

  app.patch('/me', async (request) => {
    const { userId } = requireAuth(request);
    const input = updateProfileSchema.parse(request.body);
    if (input.email && (await User.exists({ email: input.email, _id: { $ne: userId } }))) {
      throw new HttpError(409, 'That email is already used by another account.');
    }
    const user = await findUser(userId);
    user.set(input);
    await user.save();
    return toUserDTO(user);
  });

  app.post(
    '/me/password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request) => {
      const { userId, sessionId } = requireAuth(request);
      const input = changePasswordSchema.parse(request.body);
      const user = await findUser(userId);
      if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
        throw new HttpError(400, 'Your current password is incorrect.');
      }
      user.passwordHash = await hashPassword(input.newPassword);
      user.passwordChangedAt = new Date();
      await user.save();
      await Session.deleteMany({ userId, _id: { $ne: sessionId } });
      return toUserDTO(user);
    },
  );

  app.delete('/me', async (request, reply) => {
    const { userId } = requireAuth(request);
    await Promise.all([
      User.deleteOne({ _id: userId }),
      Session.deleteMany({ userId }),
      Note.deleteMany({ userId }),
      Task.deleteMany({ userId }),
      Counter.deleteOne({ _id: userId }),
    ]);
    return reply.code(204).send();
  });

  app.get('/me/sessions', async (request): Promise<DeviceSession[]> => {
    const { userId, sessionId } = requireAuth(request);
    const sessions = await Session.find({ userId, expiresAt: { $gt: new Date() } })
      .sort({ lastSeenAt: -1 })
      .lean();
    return sessions.map((s) => ({
      id: s._id.toString(),
      platform: s.platform,
      userAgent: s.userAgent,
      createdAt: s.createdAt.getTime(),
      lastSeenAt: s.lastSeenAt.getTime(),
      current: s._id.equals(sessionId),
    }));
  });

  app.delete<{ Params: { id: string } }>('/me/sessions/:id', async (request, reply) => {
    const { userId } = requireAuth(request);
    if (!Types.ObjectId.isValid(request.params.id)) throw new HttpError(404, 'Device not found.');
    await Session.deleteOne({ _id: new Types.ObjectId(request.params.id), userId });
    return reply.code(204).send();
  });
}
