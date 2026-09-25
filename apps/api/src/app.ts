import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import type { Env } from './env.js';
import { createTokenService } from './lib/tokens.js';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { syncRoutes } from './routes/sync.js';

export async function buildApp(env: Env) {
  const app = Fastify({
    trustProxy: true,
    logger:
      env.NODE_ENV === 'test'
        ? false
        : env.NODE_ENV === 'development'
          ? {
              transport: {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
              },
            }
          : true,
  });

  const tokens = createTokenService(env.JWT_SECRET);

  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization'],
    maxAge: 86_400,
  });
  await app.register(rateLimit, { global: false });
  await app.register(authPlugin, { tokens });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) request.log.error(error);
    return reply.code(status).send({ message: status >= 500 ? 'Something went wrong.' : error.message });
  });

  app.get('/health', async () => ({ ok: true }));
  await app.register(authRoutes, { tokens });
  await app.register(meRoutes);
  await app.register(syncRoutes);

  return app;
}
