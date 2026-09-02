import { NextResponse } from 'next/server';

import { erroDeNegocio, exigirSessao } from '@/lib/server/http';
import { removerCategoria } from '@/lib/server/store';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const { id } = await context.params;
  try {
    await removerCategoria(auth.sessao.id, id);
    return NextResponse.json({ ok: true });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
