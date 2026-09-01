import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lerich Cash',
  description: 'Gestão financeira inteligente, controle de fluxo e previsibilidade.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
