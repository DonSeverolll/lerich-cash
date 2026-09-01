'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Banknote, CreditCard, LayoutDashboard, ListFilter, PiggyBank, ReceiptText, Wallet, Landmark } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacoes', label: 'Transações', icon: ReceiptText },
  { href: '/assinaturas', label: 'Assinaturas', icon: CreditCard },
  { href: '/contas', label: 'Contas', icon: Landmark },
  { href: '/importar', label: 'Importar Extrato', icon: ArrowUpRight },
];

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6 xl:px-8">
        <aside className="hidden w-72 shrink-0 flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 md:flex">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Lerich</p>
              <h1 className="text-xl font-semibold text-white">Cash</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    active ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-zinc-700/80 bg-zinc-950/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
              <PiggyBank className="h-4 w-4 text-emerald-400" />
              Status do mês
            </div>
            <p className="text-2xl font-semibold text-white">+12.4%</p>
            <p className="mt-1 text-xs text-zinc-400">Fluxo de caixa acima da média</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Gestão financeira</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Lerich Cash</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200">
                <Banknote className="h-4 w-4 text-emerald-400" />
                Agosto 2025
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200">
                <ListFilter className="h-4 w-4" />
                Filtro
              </button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
