/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WEBSITE_URL?: string;
}

interface Window {
  noted: {
    platform: 'macos' | 'windows' | 'linux';
    openExternal: (url: string) => Promise<void>;
  };
}
