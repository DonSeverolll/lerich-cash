import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { criarConta } from '@/lib/server/store';

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome da conta.').max(60),
  tipo: z.enum(['CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA']),
  saldo_inicial: z.number().finite(),
  cor_hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.')
    .default('#d4af37'),
});

export async function POST(request: Request) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    return NextResponse.json({ conta: await criarConta(auth.sessao.id, parsed.data) }, { status: 201 });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
