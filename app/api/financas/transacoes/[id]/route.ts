import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { atualizarTransacao, removerTransacao } from '@/lib/server/store';

const schema = z.object({
  conta_id: z.string().min(1).optional(),
  categoria_id: z.string().min(1).optional(),
  descricao: z.string().min(1).max(120).optional(),
  valor: z.number().positive('O valor precisa ser maior que zero.').optional(),
  tipo: z.enum(['RECEITA', 'DESPESA']).optional(),
  data_transacao: z.string().min(1).optional(),
  status: z.enum(['PENDENTE', 'EFETIVADA']).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    return NextResponse.json({ transacao: await atualizarTransacao(auth.sessao.id, id, parsed.data) });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  try {
    await removerTransacao(auth.sessao.id, id);
    return NextResponse.json({ ok: true });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
