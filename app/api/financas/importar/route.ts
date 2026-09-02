import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { importarTransacoes } from '@/lib/server/store';

const item = z.object({
  id: z.string(),
  data_transacao: z.string().min(1),
  descricao: z.string().min(1).max(120),
  valor: z.number().positive(),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  status: z.enum(['PENDENTE', 'EFETIVADA']),
  origem: z.string().max(20),
  conta_id: z.string().min(1, 'Escolha a conta de cada lançamento.'),
  categoria_id: z.string().min(1, 'Escolha a categoria de cada lançamento.'),
});

const schema = z.object({
  itens: z.array(item).min(1, 'Nenhum lançamento selecionado.').max(500, 'Divida a importação em partes menores.'),
});

export async function POST(request: Request) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    const total = await importarTransacoes(auth.sessao.id, parsed.data.itens);
    return NextResponse.json({ total }, { status: 201 });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
