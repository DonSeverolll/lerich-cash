'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import type { SessionUser } from '@/types';

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const initials = user.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  async function handleLogout() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Sessão encerrada.');
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Não foi possível sair. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-gold-500/20 bg-black/50 px-2 py-1.5 text-sm text-onyx-100 transition hover:border-gold-500/50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-gold-300 to-gold-600 text-xs font-semibold text-black">
          {initials || <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden max-w-[9rem] truncate text-left sm:block">
          <span className="block truncate text-xs font-medium text-onyx-100">{user.nome}</span>
          <span className="block truncate text-[10px] uppercase tracking-wider text-gold-500/80">{user.role}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-onyx-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-gold-500/20 bg-onyx-950/95 p-1.5 shadow-soft backdrop-blur"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-onyx-50">{user.nome}</p>
            <p className="truncate text-xs text-onyx-500">@{user.username}</p>
          </div>
          <div className="gold-rule mx-2" />

          <Link
            href="/perfil"
            role="menuitem"
            className="mt-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-onyx-200 transition hover:bg-white/5 hover:text-gold-100"
          >
            <UserRound className="h-4 w-4 text-onyx-400" />
            Meu perfil
          </Link>

          {user.role === 'ADMIN' ? (
            <Link
              href="/admin"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-onyx-200 transition hover:bg-white/5 hover:text-gold-100"
            >
              <ShieldCheck className="h-4 w-4 text-onyx-400" />
              Painel administrativo
            </Link>
          ) : null}

          <Link
            href="/dashboard"
            role="menuitem"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-onyx-200 transition hover:bg-white/5 hover:text-gold-100"
          >
            <LayoutDashboard className="h-4 w-4 text-onyx-400" />
            Painel do cliente
          </Link>

          <div className="gold-rule mx-2 my-1.5" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={pending}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {pending ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
