import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/server';
import { createUser, listUsers, recordAudit } from '@/lib/server/store';

const createSchema = z.object({
  username: z
    .string()
    .min(3, 'Usuário precisa de ao menos 3 caracteres.')
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou underline.'),
  nome: z.string().min(2, 'Informe o nome completo.').max(120),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.').max(200),
  role: z.enum(['ADMIN', 'CLIENTE']).default('CLIENTE'),
  plano: z.enum(['FREE', 'PRO', 'PREMIUM']).default('FREE'),
});

async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ADMIN') return { error: NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const { error } = await guard();
  if (error) return error;

  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: NextRequest) {
  const { error, session } = await guard();
  if (error || !session) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  try {
    const user = await createUser(parsed.data);
    await recordAudit({
      action: 'USUARIO_CRIADO',
      actor: session.username,
      target: user.id,
      detalhe: `${user.username} criado como ${user.role} (${user.plano})`,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Não foi possível criar o usuário.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
