import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { atualizarConta, removerConta } from '@/lib/server/store';

const schema = z.object({
  nome: z.string().min(1).max(60).optional(),
  tipo: z.enum(['CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA']).optional(),
  saldo_inicial: z.number().finite().optional(),
  cor_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.').optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    return NextResponse.json({ conta: await atualizarConta(auth.sessao.id, id, parsed.data) });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  try {
    await removerConta(auth.sessao.id, id);
    return NextResponse.json({ ok: true });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
