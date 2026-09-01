'use client';

import { Plus, TrendingUp } from 'lucide-react';

import { mockAccounts } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AccountsView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Contas bancárias</CardTitle>
            <CardDescription>Saldo consolidado por instituição</CardDescription>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockAccounts.map((account) => (
          <Card key={account.id} className="overflow-hidden border border-zinc-800/80">
            <div className="h-2 w-full" style={{ backgroundColor: account.cor_hex }} />
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-400">{account.tipo}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{account.nome}</h3>
                </div>
                <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-2 text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400">Saldo atual</p>
                <p className="mt-1 text-3xl font-semibold text-white">{currencyBRL(account.saldo_inicial)}</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
                <span>Saldo inicial</span>
                <span>{currencyBRL(account.saldo_inicial)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
