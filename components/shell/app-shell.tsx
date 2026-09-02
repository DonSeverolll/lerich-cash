'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  CreditCard,
  LayoutDashboard,
  Landmark,
  Menu,
  ReceiptText,
  ScrollText,
  Settings,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { SessionUser } from '@/types';

import { cn, monthLabel } from '@/lib/utils';
import { BRAND_NAME, BrandMark, BrandWordmark } from '@/components/brand/logo';
import { UserMenu } from '@/components/shell/user-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const clientNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão geral do mês' },
  { href: '/transacoes', label: 'Transações', icon: ReceiptText, description: 'Receitas e despesas' },
  { href: '/assinaturas', label: 'Assinaturas', icon: CreditCard, description: 'Gastos recorrentes' },
  { href: '/contas', label: 'Contas', icon: Landmark, description: 'Bancos e carteiras' },
  { href: '/importar', label: 'Importar extrato', icon: ArrowUpRight, description: 'OFX e CSV' },
];

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard, description: 'Indicadores da operação' },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users, description: 'Clientes e administradores' },
  { href: '/admin/auditoria', label: 'Auditoria', icon: ScrollText, description: 'Trilha de eventos' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, description: 'Parâmetros do sistema' },
];

/** Rotas fora do menu que ainda precisam de título no cabeçalho. */
const extraTitles: Record<string, { label: string; description: string }> = {
  '/perfil': { label: 'Meu perfil', description: 'Dados da conta e segurança' },
};

export interface AppShellProps {
  variant: 'client' | 'admin';
  user: SessionUser;
  children: ReactNode;
  /** Conteúdo opcional à direita do cabeçalho. */
  headerSlot?: ReactNode;
}

export function AppShell({ variant, user, children, headerSlot }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = variant === 'admin' ? adminNav : clientNav;

  const current = useMemo(() => {
    const extra = extraTitles[pathname];
    if (extra) return extra;

    const sorted = [...navigation].sort((a, b) => b.href.length - a.href.length);
    return sorted.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navigation[0];
  }, [navigation, pathname]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-5 md:px-6 xl:px-8">
        {/* ----- Sidebar (desktop) ----- */}
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-72 shrink-0 flex-col rounded-2xl border border-gold-500/15 bg-onyx-950/60 p-4 backdrop-blur lg:flex">
          <Brand variant={variant} />
          <Nav items={navigation} pathname={pathname} />
          <SidebarFooter variant={variant} />
        </aside>

        {/* ----- Conteúdo ----- */}
        <div className="min-w-0 flex-1">
          {/*
            `backdrop-blur` cria um contexto de empilhamento próprio, então o
            z-index do menu do usuário só vale dentro do cabeçalho. Sem um
            z-index aqui, o conteúdo da página — que vem depois no DOM — pinta
            por cima do menu aberto.
          */}
          <header className="relative z-30 mb-6 flex flex-col gap-4 rounded-2xl border border-gold-500/15 bg-onyx-950/50 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
                className="rounded-xl border border-gold-500/25 p-2 text-gold-200 transition hover:bg-gold-500/10 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-gold-500/70">
                  {variant === 'admin' ? 'Painel administrativo' : 'Painel do cliente'}
                </p>
                <h2 className="mt-0.5 text-xl font-semibold text-onyx-50 md:text-2xl">{current.label}</h2>
                <p className="text-xs text-onyx-500">{current.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {headerSlot}
              <ThemeToggle />
              <span className="hidden items-center gap-2 rounded-xl border border-gold-500/20 bg-onyx-950/50 px-3 py-2 text-sm capitalize text-onyx-200 sm:inline-flex">
                <Wallet className="h-4 w-4 text-gold-400" />
                {monthLabel(new Date())}
              </span>
              <UserMenu user={user} />
            </div>
          </header>

          <main className="relative z-0 animate-fade-up pb-10">{children}</main>
        </div>
      </div>

      {/* ----- Drawer (mobile) ----- */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-onyx-950/75 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-gold-500/20 bg-onyx-950 p-4">
            <div className="mb-2 flex items-start justify-between">
              <Brand variant={variant} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-2 text-onyx-400 hover:text-gold-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Nav items={navigation} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter variant={variant} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Brand({ variant }: { variant: 'client' | 'admin' }) {
  return (
    <Link
      href={variant === 'admin' ? '/admin' : '/dashboard'}
      className="mb-8 flex items-center gap-3 px-2"
      aria-label={`${BRAND_NAME} — ir para o painel`}
    >
      <BrandMark size={44} className="h-11 w-11 drop-shadow-[0_0_14px_rgb(var(--gold-500)/0.35)]" />
      <span className="min-w-0">
        <BrandWordmark className="block truncate text-base" />
        <span className="block text-[10px] uppercase tracking-[0.28em] text-gold-500/70">
          {variant === 'admin' ? 'Administração' : 'Cliente'}
        </span>
      </span>
    </Link>
  );
}

function Nav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'border border-gold-500/30 bg-gold-500/10 text-gold-100'
                : 'border border-transparent text-onyx-300 hover:border-onyx-50/5 hover:bg-onyx-50/5 hover:text-onyx-50',
            )}
          >
            <Icon className={cn('h-4 w-4 transition', active ? 'text-gold-300' : 'text-onyx-400 group-hover:text-gold-300')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ variant }: { variant: 'client' | 'admin' }) {
  return (
    <div className="mt-auto rounded-2xl border border-gold-500/15 bg-gradient-to-b from-gold-500/10 to-transparent p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-500/80">
        {variant === 'admin' ? 'Modo administrador' : 'Plano ativo'}
      </p>
      <p className="mt-2 font-display text-2xl text-onyx-50">
        {variant === 'admin' ? 'Controle total' : 'Lerich Pro'}
      </p>
      <p className="mt-1 text-xs text-onyx-400">
        {variant === 'admin'
          ? 'Gestão de acessos, planos e auditoria.'
          : 'Extratos, recorrentes e projeção de caixa.'}
      </p>
    </div>
  );
}
