import type { ReactNode } from 'react';
import { ShieldCheck, TrendingUp, Wallet } from 'lucide-react';

import { BrandLockup } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const highlights = [
  { icon: Wallet, title: 'Fluxo consolidado', text: 'Todas as contas e cartões em um só extrato.' },
  { icon: TrendingUp, title: 'Projeção de caixa', text: 'Antecipe o saldo do mês com base nos recorrentes.' },
  { icon: ShieldCheck, title: 'Acesso por perfil', text: 'Administração e clientes com permissões separadas.' },
];

/** Moldura das telas públicas: apresentação à esquerda, formulário à direita. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(600px_circle_at_20%_20%,rgb(var(--gold-500)/0.16),transparent_60%)]" />

      <div className="relative grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-center lg:flex">
          <h1 className="sr-only">Lerich Finance</h1>
          <BrandLockup width={340} className="drop-shadow-[0_0_40px_rgb(var(--gold-500)/0.25)]" />
          <div className="gold-rule my-7 max-w-sm" />
          <p className="max-w-md text-onyx-300">
            Gestão financeira com padrão de private banking: preto, dourado e informação no lugar certo.
          </p>

          <ul className="mt-9 space-y-4">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-onyx-50">{title}</p>
                  <p className="text-sm text-onyx-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {children}
      </div>
    </main>
  );
}
