import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron';

declare const __API_URL__: string;

const SCHEME = 'app';
const APP_ORIGIN = `${SCHEME}://noted`;
const devServerUrl = app.isPackaged ? undefined : process.env.VITE_DEV_SERVER_URL;
const rendererDir = path.join(__dirname, '../renderer');
const isMac = process.platform === 'darwin';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${new URL(__API_URL__).origin}`,
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, codeCache: true },
  },
]);

function resolveRendererFile(requestUrl: string): string {
  const { pathname } = new URL(requestUrl);
  const target = path.normalize(path.join(rendererDir, decodeURIComponent(pathname)));
  const inside = target.startsWith(rendererDir + path.sep);
  return inside && existsSync(target) && statSync(target).isFile()
    ? target
    : path.join(rendererDir, 'index.html');
}

function isHttpUrl(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: 'Noted.',
    backgroundColor: '#F4F6F6',
    autoHideMenuBar: true,
    ...(isMac ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 18, y: 18 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  const startUrl = devServerUrl ?? `${APP_ORIGIN}/index.html`;
  const allowedOrigin = new URL(startUrl).origin;

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin === allowedOrigin) return;
    event.preventDefault();
    if (isHttpUrl(url)) void shell.openExternal(url);
  });

  void window.loadURL(startUrl);
  return window;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, async (request) => {
      const response = await net.fetch(pathToFileURL(resolveRendererFile(request.url)).toString());
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', CSP);
      return new Response(response.body, { status: response.status, headers });
    });

    ipcMain.handle('open-external', (_event, url: unknown) => {
      if (typeof url === 'string' && isHttpUrl(url)) return shell.openExternal(url);
    });

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
}
