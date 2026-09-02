import type { Metadata } from 'next';

import { requireSession } from '@/lib/auth/server';
import { carregarFinancas } from '@/lib/server/store';
import { TransactionsView } from '@/components/transactions-view';

export const metadata: Metadata = { title: 'Transações' };

export default async function TransactionsPage() {
  const sessao = await requireSession('/transacoes');
  const dados = await carregarFinancas(sessao.id);

  return <TransactionsView dados={dados} />;
}
