import Fastify from 'fastify';
import mongoose from 'mongoose';
import { configureApp, serverOptions } from './create-app.js';
import { loadEnv } from './env.js';

try {
  process.loadEnvFile();
} catch {}

const env = loadEnv();
await mongoose.connect(env.MONGODB_URI);
const app = await configureApp(Fastify(serverOptions(env)), env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
