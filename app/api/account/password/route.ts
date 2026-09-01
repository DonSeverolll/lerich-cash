import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/server';
import { authenticate, recordAudit, updateUser } from '@/lib/server/store';

const schema = z.object({
  atual: z.string().min(1, 'Informe a senha atual.'),
  nova: z.string().min(8, 'A nova senha precisa de ao menos 8 caracteres.').max(200),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const check = await authenticate(session.username, parsed.data.atual);
  if (!check.ok) return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });

  await updateUser(session.id, { password: parsed.data.nova });
  await recordAudit({
    action: 'SENHA_REDEFINIDA',
    actor: session.username,
    target: session.id,
    detalhe: 'Senha alterada pelo próprio usuário',
  });

  return NextResponse.json({ ok: true });
}
