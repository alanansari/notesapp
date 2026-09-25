import { themeInitScript } from '@noted/ui/theme-script';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function themeInit(): Plugin {
  return {
    name: 'noted-theme-init',
    configureServer(server) {
      server.middlewares.use('/theme-init.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(themeInitScript);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'theme-init.js', source: themeInitScript });
    },
  };
}

export default defineConfig({
  root: 'src/renderer',
  envDir: '../..',
  base: './',
  plugins: [react(), themeInit()],
  server: { port: 5173, strictPort: true },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    target: 'chrome130',
  },
});
