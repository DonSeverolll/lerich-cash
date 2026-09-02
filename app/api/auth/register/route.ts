import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { createSessionToken, sessionCookieOptions } from '@/lib/auth/server';
import { checkRateLimit, registerFailure } from '@/lib/server/rate-limit';
import { createUser, getSettings, recordAudit } from '@/lib/server/store';

const schema = z.object({
  nome: z.string().min(2, 'Informe seu nome completo.').max(120),
  username: z
    .string()
    .min(3, 'O usuário precisa de ao menos 3 caracteres.')
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou underline.'),
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.').max(200),
});

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

export async function POST(request: NextRequest) {
  const settings = await getSettings();
  if (!settings.permitirCadastroPublico) {
    return NextResponse.json(
      { error: 'O cadastro público está desativado. Peça um acesso ao administrador.' },
      { status: 403 },
    );
  }

  // Impede criação em massa a partir do mesmo endereço.
  const chave = `cadastro:${clientKey(request)}`;
  const limite = checkRateLimit(chave);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${limite.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  registerFailure(chave);

  try {
    const user = await createUser({ ...parsed.data, role: 'CLIENTE', plano: 'FREE' });

    await recordAudit({
      action: 'CADASTRO_PUBLICO',
      actor: user.username,
      target: user.id,
      detalhe: `Conta criada pelo formulário público (${user.email})`,
    });

    // Entra direto: o usuário acabou de provar que conhece a própria senha.
    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      nome: user.nome,
      role: user.role,
    });

    const response = NextResponse.json({ user, redirectTo: '/dashboard' }, { status: 201 });
    response.cookies.set({ ...sessionCookieOptions, value: token });
    return response;
  } catch (causa) {
    const mensagem = causa instanceof Error ? causa.message : 'Não foi possível concluir o cadastro.';
    return NextResponse.json({ error: mensagem }, { status: 409 });
  }
}
