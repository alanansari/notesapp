import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

for (const file of ['.env.local', '.env']) {
  if (existsSync(`${root}${file}`)) process.loadEnvFile(`${root}${file}`);
}

const buildId = Date.now().toString(36);

await build({
  entryPoints: [`${root}src/sw/sw.ts`],
  outfile: `${root}public/sw.js`,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: process.env.NODE_ENV === 'production' || process.argv.includes('--minify'),
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __API_URL__: JSON.stringify(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'),
  },
  logLevel: 'warning',
});

console.log(`Service worker built (${buildId})`);
