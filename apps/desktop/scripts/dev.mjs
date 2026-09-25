import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { createServer } from 'vite';
import { buildMain } from './build-main.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const server = await createServer({ configFile: `${root}vite.config.ts` });
await server.listen();
const url = server.resolvedUrls?.local[0];
server.printUrls();

await buildMain({ watch: true });

const env = { ...process.env, VITE_DEV_SERVER_URL: url };
delete env.ELECTRON_RUN_AS_NODE;

const app = spawn(String(electron), [root], { stdio: 'inherit', env });

app.on('close', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
