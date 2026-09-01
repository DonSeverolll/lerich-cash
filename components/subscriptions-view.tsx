'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Power, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { mockCategories, mockSubscriptions, mockTransactions } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Renda de referência: média das receitas dos meses com movimento. */
function useRendaMedia() {
  return useMemo(() => {
    const porMes = new Map<string, number>();
    for (const tx of mockTransactions) {
      if (tx.tipo !== 'RECEITA') continue;
      const key = tx.data_transacao.slice(0, 7);
      porMes.set(key, (porMes.get(key) ?? 0) + tx.valor);
    }
    const valores = [...porMes.values()];
    if (!valores.length) return 0;
    return valores.reduce((sum, value) => sum + value, 0) / valores.length;
  }, []);
}

export function SubscriptionsView() {
  const [subscriptions, setSubscriptions] = useState(mockSubscriptions);
  const rendaMedia = useRendaMedia();

  const ativas = subscriptions.filter((item) => item.ativo);
  const total = ativas.reduce((sum, item) => sum + item.valor, 0);
  const percentualRenda = rendaMedia > 0 ? (total / rendaMedia) * 100 : 0;

  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const proximaSemana = ativas.filter((item) => {
    const distancia = (item.dia_vencimento - diaAtual + 31) % 31;
    return distancia <= 7;
  });

  function toggle(id: string) {
    setSubscriptions((current) =>
      current.map((item) => (item.id === id ? { ...item, ativo: !item.ativo } : item)),
    );
    const alvo = subscriptions.find((item) => item.id === id);
    toast.success(`${alvo?.nome_servico} ${alvo?.ativo ? 'pausada' : 'reativada'}.`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Assinaturas &amp; Planos</CardTitle>
            <CardDescription>
              {ativas.length} serviço(s) ativo(s) de {subscriptions.length} cadastrado(s)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => toast.info(`${ativas.length} recorrente(s) prontos para lançamento no mês.`)}
          >
            Lançar recorrentes
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <div className="rounded-2xl border border-gold-500/25 bg-gradient-to-br from-gold-500/12 to-transparent p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gold-200/90">Comprometimento mensal</p>
                <p className="mt-1 font-display text-3xl font-semibold text-onyx-50">{currencyBRL(total)}</p>
              </div>
              <span className="rounded-xl border border-gold-500/25 bg-black/40 p-2.5 text-gold-300">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-600"
                style={{ width: `${Math.min(100, percentualRenda)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gold-200/80">
              {percentualRenda.toFixed(1)}% da renda média mensal ({currencyBRL(rendaMedia)}).
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/35 p-5">
            <p className="flex items-center gap-2 text-sm text-onyx-300">
              <CalendarClock className="h-4 w-4 text-gold-400" />
              Vencendo nos próximos 7 dias
            </p>
            {proximaSemana.length ? (
              <ul className="mt-3 space-y-2">
                {proximaSemana.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-onyx-100">
                      {item.nome_servico} <span className="text-onyx-500">· dia {item.dia_vencimento}</span>
                    </span>
                    <span className="text-rose-300">{currencyBRL(item.valor)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-onyx-500">Nenhum vencimento na próxima semana.</p>
            )}
            <p className="mt-4 text-xs text-onyx-500">
              Projeção anual dos ativos: {currencyBRL(total * 12)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {subscriptions.map((subscription) => {
          const category = mockCategories.find((item) => item.id === subscription.categoria_id);
          const impacto = total ? (subscription.valor / total) * 100 : 0;

          return (
            <Card key={subscription.id} className={subscription.ativo ? undefined : 'opacity-60'}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-xl">{subscription.nome_servico}</CardTitle>
                    <CardDescription>{category?.nome}</CardDescription>
                  </div>
                  <Badge tone={subscription.ativo ? 'success' : 'neutral'}>
                    {subscription.ativo ? 'Ativo' : 'Pausado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/35 px-3 py-3">
                  <span className="text-sm text-onyx-400">Valor mensal</span>
                  <span className="text-lg font-semibold text-onyx-50">{currencyBRL(subscription.valor)}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-onyx-300">
                  <span>Vencimento</span>
                  <span>Dia {subscription.dia_vencimento}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm text-onyx-300">
                    <span>Impacto no total</span>
                    <span>{impacto.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-700"
                      style={{ width: `${Math.min(100, impacto)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 justify-center gap-2"
                    onClick={() => toast.success(`${subscription.nome_servico} lançado neste mês.`)}
                    disabled={!subscription.ativo}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Lançar
                  </Button>
                  <Button
                    variant="subtle"
                    className="justify-center gap-2"
                    onClick={() => toggle(subscription.id)}
                    aria-label={subscription.ativo ? 'Pausar assinatura' : 'Reativar assinatura'}
                  >
                    <Power className="h-4 w-4" />
                    {subscription.ativo ? 'Pausar' : 'Reativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
