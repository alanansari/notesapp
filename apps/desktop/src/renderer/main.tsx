import '@fontsource/varela-round/400.css';
import '@noted/ui/styles.css';
import './desktop.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

if (window.noted.platform === 'macos') {
  document.documentElement.style.setProperty('--titlebar-inset', '28px');
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
