import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@/types';

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from './token';

/** Sessão do request atual, ou `null` se não autenticado. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Garante uma sessão válida; caso contrário manda para o login. */
export async function requireSession(returnTo?: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }
  return session;
}

/** Garante sessão com papel ADMIN. Clientes são devolvidos ao próprio painel. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession('/admin');
  if (session.role !== 'ADMIN') redirect('/dashboard');
  return session;
}

export const sessionCookieOptions = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export { SESSION_COOKIE, createSessionToken, verifySessionToken };
