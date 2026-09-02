import { NextResponse } from 'next/server';

import { erroDeNegocio, exigirSessao } from '@/lib/server/http';
import { lancarAssinatura } from '@/lib/server/store';

/** Cria a transação do mês corrente para uma assinatura ativa. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  try {
    return NextResponse.json({ transacao: await lancarAssinatura(auth.sessao.id, id) }, { status: 201 });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
