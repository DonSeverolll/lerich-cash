/**
 * Emissão e validação do token de sessão. Sem dependência de `fs` — pode ser
 * importado pelo middleware (Edge runtime).
 */
import type { SessionUser } from '@/types';

import { fromBase64Url, hmac, safeEqual, toBase64Url } from './crypto';

export const SESSION_COOKIE = 'lerich_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

const DEV_SECRET = 'lerich-finance-dev-secret-troque-em-producao';

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET ausente ou muito curto. Defina uma chave com 32+ caracteres.');
  }
  return DEV_SECRET;
}

interface TokenPayload extends SessionUser {
  iat: number;
  exp: number;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    nome: user.nome,
    role: user.role,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(getAuthSecret(), body);
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = await hmac(getAuthSecret(), body);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as TokenPayload;
    if (!payload?.id || !payload?.role) return null;
    if (payload.exp * 1000 < Date.now()) return null;

    return { id: payload.id, username: payload.username, nome: payload.nome, role: payload.role };
  } catch {
    return null;
  }
}
