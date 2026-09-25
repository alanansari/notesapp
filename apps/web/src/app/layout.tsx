import '@noted/ui/styles.css';
import { themeInitScript } from '@noted/ui/theme-script';
import type { Metadata, Viewport } from 'next';
import { Varela_Round } from 'next/font/google';
import type { ReactNode } from 'react';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

const varela = Varela_Round({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-varela',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Noted. Your notes and tasks, in one calm place.', template: '%s · Noted.' },
  description:
    'Sticky notes and a simple kanban side by side. Works offline, syncs across the web, macOS and Windows.',
  applicationName: 'Noted.',
  appleWebApp: { capable: true, title: 'Noted.', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#F4F6F6',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={varela.variable} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sets the theme before first paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
