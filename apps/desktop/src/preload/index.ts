import { contextBridge, ipcRenderer } from 'electron';

const platform = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux';

contextBridge.exposeInMainWorld('noted', {
  platform,
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
});
