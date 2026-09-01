import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Lerich Finance',
    template: '%s · Lerich Finance',
  },
  description: 'Gestão financeira inteligente, controle de fluxo e previsibilidade.',
  applicationName: 'Lerich Finance',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d0b07',
              border: '1px solid rgba(212,175,55,0.28)',
              color: '#f6f1e4',
            },
          }}
        />
      </body>
    </html>
  );
}
