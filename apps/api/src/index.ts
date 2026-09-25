import mongoose from 'mongoose';
import { buildApp } from './app';
import { loadEnv } from './env';

try {
  process.loadEnvFile();
} catch {}

const env = loadEnv();
await mongoose.connect(env.MONGODB_URI);
const app = await buildApp(env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
