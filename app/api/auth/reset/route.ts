import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { consumePasswordReset, recordAudit } from '@/lib/server/store';

const schema = z.object({
  token: z.string().min(1),
  senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.').max(200),
});

const mensagens = {
  INVALIDO: 'Link inválido. Peça uma nova recuperação.',
  EXPIRADO: 'Este link expirou. Peça uma nova recuperação.',
  USADO: 'Este link já foi usado. Peça uma nova recuperação.',
} as const;

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const resultado = await consumePasswordReset(parsed.data.token, parsed.data.senha);

  if (!resultado.ok) {
    return NextResponse.json({ error: mensagens[resultado.reason] }, { status: 400 });
  }

  await recordAudit({
    action: 'RESET_CONCLUIDO',
    actor: resultado.user.username,
    target: resultado.user.id,
    detalhe: 'Senha redefinida pelo link enviado por e-mail',
  });

  // Sem login automático: o usuário entra com a senha nova, provando que a sabe.
  return NextResponse.json({ ok: true, username: resultado.user.username });
}
