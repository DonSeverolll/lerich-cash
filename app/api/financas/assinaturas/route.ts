import { NextResponse } from 'next/server';
import { z } from 'zod';

import { corpoJson, erroDeNegocio, erroDeValidacao, exigirSessao } from '@/lib/server/http';
import { criarAssinatura } from '@/lib/server/store';

const schema = z.object({
  conta_id: z.string().min(1, 'Escolha a conta.'),
  categoria_id: z.string().min(1, 'Escolha a categoria.'),
  nome_servico: z.string().min(1, 'Informe o nome do serviço.').max(80),
  valor: z.number().positive('O valor precisa ser maior que zero.'),
  dia_vencimento: z.number().int().min(1).max(31),
});

export async function POST(request: Request) {
  const auth = await exigirSessao();
  if ('erro' in auth) return auth.erro;

  const parsed = schema.safeParse(await corpoJson(request));
  if (!parsed.success) return erroDeValidacao(parsed.error);

  try {
    const assinatura = await criarAssinatura(auth.sessao.id, parsed.data);
    return NextResponse.json({ assinatura }, { status: 201 });
  } catch (causa) {
    return erroDeNegocio(causa);
  }
}
