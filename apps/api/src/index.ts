import Fastify from 'fastify';
import { appPlugin, serverOptions } from './create-app.js';
import { loadEnv } from './env.js';
import { databasePlugin } from './plugins/database.js';

try {
  process.loadEnvFile();
} catch {}

const env = loadEnv();
const app = Fastify(serverOptions(env));

app.register(databasePlugin, { uri: env.MONGODB_URI });
app.register(appPlugin, { env });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().finally(() => process.exit(0));
  });
}

app.listen({ host: env.HOST, port: env.PORT }, (error) => {
  if (error) {
    app.log.error(error, 'Server failed to start');
    process.exit(1);
  }
});
