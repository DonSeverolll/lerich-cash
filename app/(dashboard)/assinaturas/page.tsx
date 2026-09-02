import type { Metadata } from 'next';

import { requireSession } from '@/lib/auth/server';
import { carregarFinancas } from '@/lib/server/store';
import { SubscriptionsView } from '@/components/subscriptions-view';

export const metadata: Metadata = { title: 'Assinaturas' };

export default async function SubscriptionsPage() {
  const sessao = await requireSession('/assinaturas');
  const dados = await carregarFinancas(sessao.id);

  return <SubscriptionsView dados={dados} />;
}
