import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { authenticate, recordAudit } from '@/lib/server/store';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth/server';
import { checkRateLimit, registerFailure, resetRateLimit } from '@/lib/server/rate-limit';

const schema = z.object({
  username: z
    .string({ required_error: 'Informe o usuário.', invalid_type_error: 'Informe o usuário.' })
    .min(1, 'Informe o usuário.')
    .max(120),
  password: z
    .string({ required_error: 'Informe a senha.', invalid_type_error: 'Informe a senha.' })
    .min(1, 'Informe a senha.')
    .max(200),
  // O formulário manda `null` quando não há `?next=` na URL.
  next: z.string().nullish(),
});

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

export async function POST(request: NextRequest) {
  const payload = schema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const { username, password, next } = payload.data;
  const key = `${clientKey(request)}:${username.toLowerCase()}`;
  const limit = checkRateLimit(key);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const result = await authenticate(username, password);

  if (!result.ok) {
    registerFailure(key);
    await recordAudit({
      action: 'LOGIN_FALHA',
      actor: username,
      detalhe: result.reason === 'SUSPENSO' ? 'Conta suspensa' : 'Credenciais inválidas',
    });

    const message =
      result.reason === 'SUSPENSO'
        ? 'Conta suspensa. Procure o administrador.'
        : 'Usuário ou senha incorretos.';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  resetRateLimit(key);

  const token = await createSessionToken({
    id: result.user.id,
    username: result.user.username,
    nome: result.user.nome,
    role: result.user.role,
  });

  await recordAudit({
    action: 'LOGIN_OK',
    actor: result.user.username,
    target: result.user.id,
    detalhe: `Acesso como ${result.user.role}`,
  });

  const fallback = result.user.role === 'ADMIN' ? '/admin' : '/dashboard';
  // Só aceitamos redirecionamentos internos, evitando open redirect.
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;

  const response = NextResponse.json({ user: result.user, redirectTo });
  response.cookies.set({ ...sessionCookieOptions, value: token });
  return response;
}
