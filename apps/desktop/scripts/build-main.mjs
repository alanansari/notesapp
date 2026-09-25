import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

for (const file of ['.env.local', '.env']) {
  if (existsSync(`${root}${file}`)) process.loadEnvFile(`${root}${file}`);
}

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  outExtension: { '.js': '.cjs' },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL ?? 'http://localhost:4000'),
    __WEBSITE_URL__: JSON.stringify(process.env.VITE_WEBSITE_URL ?? 'http://localhost:3000'),
  },
  logLevel: 'warning',
};

const targets = [
  { ...shared, entryPoints: [`${root}src/main/index.ts`], outdir: `${root}dist/main` },
  { ...shared, entryPoints: [`${root}src/preload/index.ts`], outdir: `${root}dist/preload` },
];

export async function buildMain({ watch = false } = {}) {
  if (!watch) return Promise.all(targets.map((options) => build({ ...options, minify: true })));
  const contexts = await Promise.all(targets.map((options) => context(options)));
  await Promise.all(contexts.map((ctx) => ctx.rebuild()));
  return contexts;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await buildMain();
