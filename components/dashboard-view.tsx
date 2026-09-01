'use client';

import { Activity, ArrowDownRight, ArrowUpRight, Wallet, Clock3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { mockAccounts, mockCategories, mockSubscriptions, mockTransactions } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const palette = ['#10b981', '#34d399', '#f43f5e', '#fb7185', '#f97316', '#8b5cf6', '#22c55e', '#38bdf8'];

const monthlyFlow = [
  { name: 'Jan', receitas: 5600, despesas: 3100 },
  { name: 'Fev', receitas: 6200, despesas: 3400 },
  { name: 'Mar', receitas: 5900, despesas: 3600 },
  { name: 'Abr', receitas: 6700, despesas: 3900 },
  { name: 'Mai', receitas: 7100, despesas: 4100 },
  { name: 'Jun', receitas: 6800, despesas: 4300 },
  { name: 'Jul', receitas: 7200, despesas: 3900 },
  { name: 'Ago', receitas: 8050, despesas: 4680 },
];

export function DashboardView() {
  const receitasMes = mockTransactions
    .filter((item) => item.tipo === 'RECEITA' && new Date(item.data_transacao).getMonth() === 7)
    .reduce((sum, item) => sum + item.valor, 0);

  const despesasMes = mockTransactions
    .filter((item) => item.tipo === 'DESPESA' && new Date(item.data_transacao).getMonth() === 7)
    .reduce((sum, item) => sum + item.valor, 0);

  const totalComprometido = mockSubscriptions.reduce((sum, item) => sum + item.valor, 0);
  const saldoConsolidado = mockAccounts.reduce((sum, account) => sum + account.saldo_inicial, 0);

  const despesasPorCategoria = mockCategories
    .filter((cat) => cat.tipo === 'DESPESA')
    .map((cat) => {
      const total = mockTransactions
        .filter((tx) => tx.categoria_id === cat.id && tx.tipo === 'DESPESA')
        .reduce((sum, tx) => sum + tx.valor, 0);

      return { name: cat.nome, value: total, color: cat.cor_hex || palette[0] };
    })
    .filter((item) => item.value > 0);

  const nextSubscriptions = mockSubscriptions.slice(0, 3);
  const lastTransactions = mockTransactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Saldo consolidado" value={currencyBRL(saldoConsolidado)} tone="success" icon={<Wallet className="h-5 w-5" />} />
        <StatCard title="Receitas do mês" value={currencyBRL(receitasMes)} tone="success" icon={<ArrowUpRight className="h-5 w-5" />} />
        <StatCard title="Despesas do mês" value={currencyBRL(despesasMes)} tone="danger" icon={<ArrowDownRight className="h-5 w-5" />} />
        <StatCard title="Comprometido" value={currencyBRL(totalComprometido)} tone="neutral" icon={<Activity className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Fluxo financeiro</CardTitle>
              <CardDescription>Entradas vs saídas mensais</CardDescription>
            </div>
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">+12.4%</Badge>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
                  formatter={(value: number) => currencyBRL(Number(value))}
                />
                <Bar dataKey="receitas" radius={[8, 8, 0, 0]} fill="#10b981" />
                <Bar dataKey="despesas" radius={[8, 8, 0, 0]} fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de gastos</CardTitle>
            <CardDescription>Despesas por categoria</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={despesasPorCategoria} innerRadius={52} outerRadius={90} paddingAngle={4} dataKey="value">
                  {despesasPorCategoria.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color || palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => currencyBRL(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Últimas transações</CardTitle>
            <CardDescription>Registro recente do extrato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {lastTransactions.map((tx) => {
              const category = mockCategories.find((item) => item.id === tx.categoria_id);
              const accent = tx.tipo === 'RECEITA' ? 'text-emerald-300' : 'text-rose-300';
              return (
                <div key={tx.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3">
                  <div>
                    <p className="font-medium text-white">{tx.descricao}</p>
                    <p className="text-xs text-zinc-400">{category?.nome} • {new Date(tx.data_transacao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className={accent}>{tx.tipo === 'RECEITA' ? '+' : '-'}{currencyBRL(tx.valor)}</p>
                    <p className="text-xs text-zinc-400">{tx.status}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinaturas próximas</CardTitle>
            <CardDescription>Próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {nextSubscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3">
                <div>
                  <p className="font-medium text-white">{subscription.nome_servico}</p>
                  <p className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock3 className="h-3.5 w-3.5" /> vence dia {subscription.dia_vencimento}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-rose-300">{currencyBRL(subscription.valor)}</p>
                  <p className="text-xs text-zinc-400">ativo</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ title, value, tone, icon }: { title: string; value: string; tone: 'success' | 'danger' | 'neutral'; icon: React.ReactNode }) {
  const toneClasses = {
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    neutral: 'border-zinc-700 bg-zinc-800/80 text-zinc-100',
  };

  return (
    <Card className={toneClasses[tone]}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/60">{icon}</div>
      </CardContent>
    </Card>
  );
}
