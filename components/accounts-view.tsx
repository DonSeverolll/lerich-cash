'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { mockAccounts, mockTransactions } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

const tipoLabels: Record<string, string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança',
  INVESTIMENTO: 'Investimento',
  CARTEIRA: 'Carteira',
};

export function AccountsView() {
  const resumo = useMemo(
    () =>
      mockAccounts.map((account) => {
        const doPeriodo = mockTransactions.filter((tx) => tx.conta_id === account.id);
        const entradas = doPeriodo.filter((tx) => tx.tipo === 'RECEITA').reduce((sum, tx) => sum + tx.valor, 0);
        const saidas = doPeriodo.filter((tx) => tx.tipo === 'DESPESA').reduce((sum, tx) => sum + tx.valor, 0);

        return {
          ...account,
          entradas,
          saidas,
          saldoAtual: account.saldo_inicial + entradas - saidas,
          movimentos: doPeriodo.length,
        };
      }),
    [],
  );

  const totalAtual = resumo.reduce((sum, item) => sum + item.saldoAtual, 0);
  const totalInicial = resumo.reduce((sum, item) => sum + item.saldo_inicial, 0);
  const variacao = totalInicial ? ((totalAtual - totalInicial) / totalInicial) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Patrimônio consolidado"
          value={currencyBRL(totalAtual)}
          tone="gold"
          trend={`${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}% sobre o saldo inicial`}
          trendPositive={variacao >= 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Entradas acumuladas"
          value={currencyBRL(resumo.reduce((sum, item) => sum + item.entradas, 0))}
          tone="success"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          title="Saídas acumuladas"
          value={currencyBRL(resumo.reduce((sum, item) => sum + item.saidas, 0))}
          tone="danger"
          icon={<ArrowDownRight className="h-5 w-5" />}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Contas bancárias</CardTitle>
            <CardDescription>Saldo consolidado por instituição</CardDescription>
          </div>
          <Button className="gap-2" onClick={() => toast.info('Cadastro de contas disponível ao conectar o Supabase.')}>
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resumo.map((account) => {
          const participacao = totalAtual ? (account.saldoAtual / totalAtual) * 100 : 0;

          return (
            <Card key={account.id} className="overflow-hidden">
              <div className="h-1.5 w-full" style={{ backgroundColor: account.cor_hex }} />
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-onyx-500">
                      {tipoLabels[account.tipo] ?? account.tipo}
                    </p>
                    <h3 className="mt-1 truncate text-xl font-semibold text-onyx-50">{account.nome}</h3>
                  </div>
                  <Badge tone="gold">{participacao.toFixed(0)}%</Badge>
                </div>

                <div>
                  <p className="text-sm text-onyx-400">Saldo atual</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-onyx-50">
                    {currencyBRL(account.saldoAtual)}
                  </p>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(2, participacao))}%`, backgroundColor: account.cor_hex }}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                    <dt className="text-xs text-onyx-500">Entradas</dt>
                    <dd className="mt-0.5 font-medium text-gold-200">{currencyBRL(account.entradas)}</dd>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                    <dt className="text-xs text-onyx-500">Saídas</dt>
                    <dd className="mt-0.5 font-medium text-rose-300">{currencyBRL(account.saidas)}</dd>
                  </div>
                </dl>

                <p className="text-xs text-onyx-500">
                  Saldo inicial {currencyBRL(account.saldo_inicial)} · {account.movimentos} movimento(s)
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
