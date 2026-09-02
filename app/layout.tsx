import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import { SCRIPT_TEMA, ThemeProvider } from '@/components/theme/theme-provider';

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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
    { media: '(prefers-color-scheme: light)', color: '#f4f6f8' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-tema="escuro" suppressHydrationWarning>
      <head>
        {/*
          Aplica o tema salvo antes da primeira pintura. Sem isso, quem escolheu
          o modo claro veria um piscar escuro em cada carregamento.
        */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            theme="system"
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgb(var(--campo))',
                border: '1px solid rgb(var(--gold-500) / 0.28)',
                color: 'rgb(var(--texto))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
