import type { Metadata } from 'next';

import { requireSession } from '@/lib/auth/server';
import { carregarFinancas } from '@/lib/server/store';
import { ImportView } from '@/components/import-view';

export const metadata: Metadata = { title: 'Importar extrato' };

export default async function ImportPage() {
  const sessao = await requireSession('/importar');
  const dados = await carregarFinancas(sessao.id);

  return <ImportView contas={dados.contas} categorias={dados.categorias} />;
}
