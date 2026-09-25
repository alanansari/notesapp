import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Noted.',
    short_name: 'Noted',
    description: 'Sticky notes and tasks that work offline and sync everywhere.',
    id: '/app',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F6F6',
    theme_color: '#86CFFA',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
