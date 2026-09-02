import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { criarTransacao } from '@/lib/server/store';

const schema = z.object({
  conta_id: z.string().min(1, 'Escolha a conta.'),
  categoria_id: z.string().min(1, 'Escolha a categoria.'),
  descricao: z.string().min(1, 'Informe a descrição.').max(120),
  valor: z.number().positive('O valor precisa ser maior que zero.'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  data_transacao: z.string().min(1, 'Informe a data.'),
  status: z.enum(['PENDENTE', 'EFETIVADA']),
});

export async function POST(request: Request) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    const transacao = await criarTransacao(auth.sessao.id, parsed.data);
    return NextResponse.json({ transacao }, { status: 201 });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
