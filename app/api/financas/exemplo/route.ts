import { NextResponse } from 'next/server';

import { erroDeNegocio, exigirSessao } from '@/lib/server/http';
import { popularDadosDeExemplo } from '@/lib/server/store';

/** Preenche uma conta vazia com dados de demonstração. */
export async function POST() {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  try {
    const total = await popularDadosDeExemplo(auth.sessao.id);
    return NextResponse.json({ total }, { status: 201 });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
