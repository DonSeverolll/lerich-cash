import type { Metadata } from 'next';

import { requireSession } from '@/lib/auth/server';
import { carregarFinancas } from '@/lib/server/store';
import { AccountsView } from '@/components/accounts-view';

export const metadata: Metadata = { title: 'Contas' };

export default async function AccountsPage() {
  const sessao = await requireSession('/contas');
  const dados = await carregarFinancas(sessao.id);

  return <AccountsView dados={dados} />;
}
