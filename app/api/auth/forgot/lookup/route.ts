import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { TICKET_PURPOSE, TICKET_TTL_SECONDS } from '@/lib/auth/reset-ticket';
import { createShortToken } from '@/lib/auth/token';
import { maskEmail } from '@/lib/utils';
import { checkRateLimit, registerFailure } from '@/lib/server/rate-limit';
import { findUserByIdentifier } from '@/lib/server/store';

/**
 * Etapa 1 da recuperação: o usuário se identifica e recebe de volta apenas uma
 * fração do e-mail cadastrado, o bastante para reconhecer sem que o endereço
 * completo apareça na tela. O `ticket` assinado amarra a etapa 2 a este
 * usuário, então o envio não pode ser disparado para uma conta arbitrária.
 *
 * Consulta limitada por IP: confirmar a existência de uma conta é inerente a
 * este fluxo, e o limite é o que impede varredura em massa.
 */

const schema = z.object({
  identifier: z.string().min(1, 'Informe seu usuário ou e-mail.').max(160),
});

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

export async function POST(request: NextRequest) {
  const chave = `recuperar:${clientKey(request)}`;
  const limite = checkRateLimit(chave);

  if (!limite.allowed) {
    return NextResponse.json(
      { error: `Muitas consultas. Tente novamente em ${limite.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  registerFailure(chave);

  const user = await findUserByIdentifier(parsed.data.identifier);

  if (!user || user.status === 'SUSPENSO' || !user.email) {
    return NextResponse.json(
      { error: 'Não encontramos uma conta ativa com esses dados.' },
      { status: 404 },
    );
  }

  const ticket = await createShortToken(TICKET_PURPOSE, { id: user.id }, TICKET_TTL_SECONDS);

  return NextResponse.json({
    emailMascarado: maskEmail(user.email),
    nome: user.nome.split(' ')[0] ?? user.nome,
    ticket,
  });
}
