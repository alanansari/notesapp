import Fastify from 'fastify';
import mongoose from 'mongoose';
import { configureApp, serverOptions } from './create-app.js';
import { loadEnv } from './env.js';

try {
  process.loadEnvFile();
} catch {}

const env = loadEnv();
try {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
} catch (error) {
  const host = env.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, '').split(/[/?]/)[0];
  console.error(`Could not connect to MongoDB at ${host}.`, error);
  throw error;
}
const app = await configureApp(Fastify(serverOptions(env)), env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
