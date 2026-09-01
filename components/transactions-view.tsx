'use client';

import { Search, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';

import { mockCategories, mockAccounts, mockTransactions } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function TransactionsView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Transações</CardTitle>
            <CardDescription>Controle de receitas e despesas em um só lugar</CardDescription>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova transação
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input placeholder="Buscar transação, categoria ou conta" className="pl-9" />
            </div>
            <select className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none">
              <option>Todos os tipos</option>
              <option>Receita</option>
              <option>Despesa</option>
            </select>
            <select className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none">
              <option>Todas as contas</option>
              {mockAccounts.map((account) => (
                <option key={account.id}>{account.nome}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Conta</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((tx) => {
                  const category = mockCategories.find((item) => item.id === tx.categoria_id);
                  const account = mockAccounts.find((item) => item.id === tx.conta_id);
                  return (
                    <tr key={tx.id} className="border-b border-zinc-800/80 text-zinc-200">
                      <td className="px-5 py-4">{tx.descricao}</td>
                      <td className="px-5 py-4">{category?.nome}</td>
                      <td className="px-5 py-4">{account?.nome}</td>
                      <td className="px-5 py-4">{new Date(tx.data_transacao).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs ${tx.status === 'EFETIVADA' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`px-5 py-4 font-medium ${tx.tipo === 'RECEITA' ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {tx.tipo === 'RECEITA' ? '+' : '-'}{currencyBRL(tx.valor)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button className="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:bg-zinc-800">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button className="rounded-lg border border-zinc-700 p-2 text-rose-300 hover:bg-zinc-800">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
