'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DadosFinanceiros } from '@/types';

import { compactTick, corDeCategoria, paletaGrafico } from '@/lib/chart-theme';
import { currencyBRL } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { chamarApi } from '@/lib/api-client';
import { assinaturaCobraNoMes, mesesRestantes } from '@/lib/assinaturas';
import { useTema } from '@/components/theme/theme-provider';

function monthKeyLabel(key: string) {
  const [ano, mes] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(ano, mes - 1, 1));
}

export function DashboardView({ dados }: { dados: DadosFinanceiros }) {
  const router = useRouter();
  const { tema } = useTema();
  const cores = paletaGrafico(tema);
  const [populando, setPopulando] = useState(false);
  const { contas: mockAccounts, categorias: mockCategories, assinaturas: mockSubscriptions, transacoes: mockTransactions } = dados;

  /** Meses com movimento, do mais recente para o mais antigo; sempre inclui o atual. */
  const months = useMemo(() => {
    const agora = new Date();
    const atual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const chaves = new Set(mockTransactions.map((tx) => tx.data_transacao.slice(0, 7)));
    chaves.add(atual);
    return [...chaves].sort((a, b) => b.localeCompare(a));
  }, [mockTransactions]);

  const [selectedMonth, setSelectedMonth] = useState(months[0]);

  const doMes = useMemo(
    () => mockTransactions.filter((tx) => tx.data_transacao.startsWith(selectedMonth)),
    [mockTransactions, selectedMonth],
  );

  const receitasMes = doMes.filter((tx) => tx.tipo === 'RECEITA').reduce((sum, tx) => sum + tx.valor, 0);
  const despesasMes = doMes.filter((tx) => tx.tipo === 'DESPESA').reduce((sum, tx) => sum + tx.valor, 0);
  const resultado = receitasMes - despesasMes;
  const taxaPoupanca = receitasMes > 0 ? (resultado / receitasMes) * 100 : 0;

  const totalComprometido = mockSubscriptions
    .filter((item) => assinaturaCobraNoMes(item))
    .reduce((sum, item) => sum + item.valor, 0);

  // Saldo real: saldo inicial de cada conta mais o efeito de todos os lançamentos.
  const saldoConsolidado = useMemo(() => {
    const movimento = mockTransactions.reduce(
      (soma, tx) => soma + (tx.tipo === 'RECEITA' ? tx.valor : -tx.valor),
      0,
    );
    return mockAccounts.reduce((soma, conta) => soma + conta.saldo_inicial, 0) + movimento;
  }, [mockAccounts, mockTransactions]);
  const pendentes = doMes.filter((tx) => tx.status === 'PENDENTE');

  // Comparação com o mês anterior. Se o mês selecionado ainda está em curso,
  // comparamos período equivalente (dia 1 até hoje) para não distorcer.
  const agora = new Date();
  const chaveMesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const mesEmCurso = selectedMonth === chaveMesAtual;
  const diaCorte = mesEmCurso ? agora.getDate() : 31;

  const indiceAtual = months.indexOf(selectedMonth);
  const mesAnterior = months[indiceAtual + 1];
  const despesasAnterior = mesAnterior
    ? mockTransactions
        .filter(
          (tx) =>
            tx.data_transacao.startsWith(mesAnterior) &&
            tx.tipo === 'DESPESA' &&
            new Date(tx.data_transacao).getDate() <= diaCorte,
        )
        .reduce((sum, tx) => sum + tx.valor, 0)
    : 0;
  const variacaoDespesas = despesasAnterior ? ((despesasMes - despesasAnterior) / despesasAnterior) * 100 : 0;

  const fluxoMensal = useMemo(
    () =>
      [...months]
        .reverse()
        .map((key) => {
          const doPeriodo = mockTransactions.filter((tx) => tx.data_transacao.startsWith(key));
          const receitas = doPeriodo.filter((tx) => tx.tipo === 'RECEITA').reduce((sum, tx) => sum + tx.valor, 0);
          const despesas = doPeriodo.filter((tx) => tx.tipo === 'DESPESA').reduce((sum, tx) => sum + tx.valor, 0);
          return { name: monthKeyLabel(key), receitas, despesas, saldo: receitas - despesas };
        }),
    [months, mockTransactions],
  );

  const despesasPorCategoria = useMemo(
    () =>
      mockCategories
        .filter((cat) => cat.tipo === 'DESPESA')
        .map((cat, index) => ({
          name: cat.nome,
          value: doMes
            .filter((tx) => tx.categoria_id === cat.id && tx.tipo === 'DESPESA')
            .reduce((sum, tx) => sum + tx.valor, 0),
          // A cor vem da paleta do tema, não do hexadecimal gravado.
          color: corDeCategoria(index, cores),
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value),
    [doMes, mockCategories, cores],
  );

  const maiorCategoria = despesasPorCategoria[0];
  const hoje = new Date();
  const proximasAssinaturas = [...mockSubscriptions]
    .filter((item) => assinaturaCobraNoMes(item))
    .sort((a, b) => {
      const distancia = (dia: number) => (dia - hoje.getDate() + 31) % 31;
      return distancia(a.dia_vencimento) - distancia(b.dia_vencimento);
    })
    .slice(0, 4);

  async function popularExemplo() {
    setPopulando(true);
    const resposta = await chamarApi<{ total: number }>('/api/financas/exemplo', { method: 'POST' });
    setPopulando(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(`${resposta.dados.total} lançamentos de exemplo criados.`);
    router.refresh();
  }

  if (!mockTransactions.length) {
    return (
      <EmptyState
        icone={<LayoutDashboard className="h-6 w-6" />}
        titulo="Seu painel está pronto, falta o movimento"
        descricao="Cadastre uma conta e lance suas receitas e despesas — ou comece com dados de exemplo para ver como tudo funciona."
        acao={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/contas">Cadastrar conta</Link>
            </Button>
            <Button variant="outline" className="gap-2" onClick={popularExemplo} disabled={populando}>
              {populando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Usar dados de exemplo
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-onyx-400">
            Resumo de <span className="capitalize text-gold-200">{monthKeyLabel(selectedMonth)}</span>
          </p>
          {mesEmCurso ? <Badge tone="warning">mês em curso</Badge> : null}
        </div>
        <Select
          aria-label="Selecionar mês"
          data-dica="Selecionar mês"
          data-dica-lado="esquerda"
          className="sm:w-48"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          {months.map((key) => (
            <option key={key} value={key}>
              {monthKeyLabel(key)}
            </option>
          ))}
        </Select>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Saldo consolidado"
          value={currencyBRL(saldoConsolidado)}
          hint={`${mockAccounts.length} ${mockAccounts.length === 1 ? 'conta conectada' : 'contas conectadas'}`}
          tone="gold"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Receitas do mês"
          value={currencyBRL(receitasMes)}
          tone="success"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          title="Despesas do mês"
          value={currencyBRL(despesasMes)}
          tone="danger"
          trend={
            mesAnterior && despesasAnterior
              ? `${variacaoDespesas >= 0 ? '+' : ''}${variacaoDespesas.toFixed(1)}% vs. ${
                  mesEmCurso ? 'mesmo período do mês anterior' : 'mês anterior'
                }`
              : undefined
          }
          trendPositive={variacaoDespesas <= 0}
          icon={<ArrowDownRight className="h-5 w-5" />}
        />
        <StatCard
          title="Resultado do mês"
          value={currencyBRL(resultado)}
          hint={`Taxa de poupança de ${taxaPoupanca.toFixed(1)}%`}
          tone={resultado >= 0 ? 'success' : 'danger'}
          icon={<PiggyBank className="h-5 w-5" />}
        />
      </section>

      {pendentes.length ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gold-100">
            <strong>{pendentes.length}</strong> lançamento(s) pendente(s) somando{' '}
            {currencyBRL(pendentes.reduce((sum, tx) => sum + tx.valor, 0))}.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/transacoes">Revisar pendências</Link>
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Fluxo financeiro</CardTitle>
              <CardDescription>Entradas, saídas e resultado dos últimos meses</CardDescription>
            </div>
            <Badge tone={resultado >= 0 ? 'success' : 'danger'}>
              {resultado >= 0 ? 'Superávit' : 'Déficit'} {currencyBRL(Math.abs(resultado))}
            </Badge>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke={cores.grade} vertical={false} />
                <XAxis dataKey="name" stroke={cores.eixo} tickLine={false} axisLine={false} />
                <YAxis stroke={cores.eixo} tickLine={false} axisLine={false} width={52} tickFormatter={compactTick} />
                <Tooltip
                  cursor={{ fill: cores.cursor }}
                  contentStyle={cores.tooltip}
                  formatter={(value) => currencyBRL(Number(value))}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(valor) => <span style={{ color: cores.legenda }}>{valor}</span>}
                />
                <Bar name="Receitas" dataKey="receitas" radius={[8, 8, 0, 0]} fill={cores.positivo} />
                <Bar name="Despesas" dataKey="despesas" radius={[8, 8, 0, 0]} fill={cores.negativo} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de gastos</CardTitle>
            <CardDescription>
              {maiorCategoria
                ? `${maiorCategoria.name} lidera com ${currencyBRL(maiorCategoria.value)}`
                : 'Despesas por categoria'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            {despesasPorCategoria.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={despesasPorCategoria}
                    innerRadius={52}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {despesasPorCategoria.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || cores.serie[index % cores.serie.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={cores.tooltip} formatter={(value) => currencyBRL(Number(value))} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(valor) => <span style={{ color: cores.legenda }}>{valor}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-onyx-500">Sem despesas registradas neste mês.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimas transações</CardTitle>
              <CardDescription>Movimentos mais recentes do período</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/transacoes">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {doMes.slice(0, 6).map((tx) => {
              const category = mockCategories.find((item) => item.id === tx.categoria_id);
              const receita = tx.tipo === 'RECEITA';
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-onyx-50/5 bg-onyx-950/35 px-3 py-3 transition hover:border-gold-500/25"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-onyx-50">{tx.descricao}</p>
                    <p className="truncate text-xs text-onyx-500">
                      {category?.nome} • {new Date(tx.data_transacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={receita ? 'font-medium text-gold-200' : 'font-medium text-rose-300'}>
                      {receita ? '+' : '-'}
                      {currencyBRL(tx.valor)}
                    </p>
                    <p className="text-xs text-onyx-500">{tx.status}</p>
                  </div>
                </div>
              );
            })}
            {!doMes.length ? <p className="text-sm text-onyx-500">Nenhuma transação neste mês.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assinaturas próximas</CardTitle>
              <CardDescription>
                {currencyBRL(totalComprometido)} comprometidos por mês
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {proximasAssinaturas.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-onyx-50/5 bg-onyx-950/35 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-onyx-50">{subscription.nome_servico}</p>
                    <p className="flex items-center gap-1.5 text-xs text-onyx-500">
                      <Clock3 className="h-3.5 w-3.5" /> vence dia {subscription.dia_vencimento}
                      {(() => {
                        // Avisa antes de o plano acabar, para o prazo não passar batido.
                        const restantes = mesesRestantes(subscription);
                        if (restantes === null || restantes > 2) return null;
                        return (
                          <span className="text-aviso-200">
                            · {restantes === 0 ? 'último mês' : `encerra em ${restantes} mês(es)`}
                          </span>
                        );
                      })()}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-rose-300">{currencyBRL(subscription.valor)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução do resultado</CardTitle>
              <CardDescription>Receitas menos despesas por mês</CardDescription>
            </CardHeader>
            <CardContent className="h-48 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fluxoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke={cores.grade} vertical={false} />
                  <XAxis dataKey="name" stroke={cores.eixo} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={cores.tooltip} formatter={(value) => currencyBRL(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke={cores.positivo}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: cores.positivo }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-onyx-50">Projeção para os próximos 12 meses</p>
              <p className="text-sm text-onyx-400">
                Mantendo o ritmo atual, o resultado acumulado seria de {currencyBRL(resultado * 12)}.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/assinaturas">Revisar recorrentes</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
