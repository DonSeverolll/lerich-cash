import { requireSession } from '@/lib/auth/server';
import { carregarFinancas } from '@/lib/server/store';
import { DashboardView } from '@/components/dashboard-view';

export default async function DashboardPage() {
  const sessao = await requireSession('/dashboard');
  const dados = await carregarFinancas(sessao.id);

  return <DashboardView dados={dados} />;
}
