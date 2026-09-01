import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/token';

/** Rotas do cliente autenticado. */
const CLIENT_PREFIXES = ['/dashboard', '/transacoes', '/assinaturas', '/contas', '/importar', '/perfil'];
/** Rotas exclusivas do administrador. */
const ADMIN_PREFIXES = ['/admin'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  const isAdminRoute = matches(pathname, ADMIN_PREFIXES);
  const isClientRoute = matches(pathname, CLIENT_PREFIXES);

  // Já autenticado tentando abrir o login: manda para o painel adequado.
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL(session.role === 'ADMIN' ? '/admin' : '/dashboard', request.url));
  }

  if (!session && (isAdminRoute || isClientRoute)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    const response = NextResponse.redirect(login);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (session && isAdminRoute && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/admin/:path*',
    '/dashboard/:path*',
    '/transacoes/:path*',
    '/assinaturas/:path*',
    '/contas/:path*',
    '/importar/:path*',
    '/perfil/:path*',
  ],
};
