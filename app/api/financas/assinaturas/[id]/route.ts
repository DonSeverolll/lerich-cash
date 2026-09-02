import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { atualizarAssinatura, removerAssinatura } from '@/lib/server/store';

const schema = z.object({
  conta_id: z.string().min(1).optional(),
  categoria_id: z.string().min(1).optional(),
  nome_servico: z.string().min(1).max(80).optional(),
  valor: z.number().positive().optional(),
  dia_vencimento: z.number().int().min(1).max(31).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    return NextResponse.json({ assinatura: await atualizarAssinatura(auth.sessao.id, id, parsed.data) });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  try {
    await removerAssinatura(auth.sessao.id, id);
    return NextResponse.json({ ok: true });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
