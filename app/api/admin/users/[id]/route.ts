import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/server';
import { deleteUser, recordAudit, updateUser } from '@/lib/server/store';

const updateSchema = z
  .object({
    nome: z.string().min(2).max(120).optional(),
    email: z.string().email('E-mail inválido.').optional(),
    role: z.enum(['ADMIN', 'CLIENTE']).optional(),
    status: z.enum(['ATIVO', 'SUSPENSO']).optional(),
    plano: z.enum(['FREE', 'PRO', 'PREMIUM']).optional(),
    password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.').max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada para atualizar.' });

async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  if (session.role !== 'ADMIN') return { error: NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 }) };
  return { session };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await guard();
  if (error || !session) return error;

  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  try {
    const user = await updateUser(id, parsed.data);
    const changed = Object.keys(parsed.data).filter((field) => field !== 'password');
    await recordAudit({
      action: parsed.data.password ? 'SENHA_REDEFINIDA' : 'USUARIO_ATUALIZADO',
      actor: session.username,
      target: user.id,
      detalhe: parsed.data.password
        ? `Senha de ${user.username} redefinida`
        : `${user.username}: ${changed.join(', ') || 'sem alterações visíveis'}`,
    });
    return NextResponse.json({ user });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Não foi possível atualizar.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await guard();
  if (error || !session) return error;

  const { id } = await context.params;
  if (id === session.id) {
    return NextResponse.json({ error: 'Você não pode remover a própria conta.' }, { status: 400 });
  }

  try {
    const user = await deleteUser(id);
    await recordAudit({
      action: 'USUARIO_REMOVIDO',
      actor: session.username,
      target: user.id,
      detalhe: `${user.username} removido`,
    });
    return NextResponse.json({ user });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Não foi possível remover.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
