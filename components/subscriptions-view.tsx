'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';

import { mockCategories, mockSubscriptions } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SubscriptionsView() {
  const total = mockSubscriptions.reduce((sum, item) => sum + item.valor, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assinaturas & Planos</CardTitle>
            <CardDescription>Serviços fixos e recorrentes</CardDescription>
          </div>
          <Button variant="outline">Lançar recorrentes</Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-200">Comprometimento mensal</p>
                <p className="mt-1 text-3xl font-semibold text-white">{currencyBRL(total)}</p>
              </div>
              <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-300">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-xs text-emerald-200/80">Equivale a {((total / 7000) * 100).toFixed(1)}% da renda mensal estimada.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {mockSubscriptions.map((subscription) => {
          const category = mockCategories.find((item) => item.id === subscription.categoria_id);
          return (
            <Card key={subscription.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{subscription.nome_servico}</CardTitle>
                    <CardDescription>{category?.nome}</CardDescription>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    {subscription.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center justify-between rounded-xl bg-zinc-950/70 px-3 py-3">
                  <span className="text-zinc-400">Valor</span>
                  <span className="text-lg font-semibold text-white">{currencyBRL(subscription.valor)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>Vencimento</span>
                  <span>Dia {subscription.dia_vencimento}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>Impacto</span>
                  <span>{((subscription.valor / total) * 100).toFixed(1)}%</span>
                </div>
                <Button variant="outline" className="w-full justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Lançar neste mês
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
