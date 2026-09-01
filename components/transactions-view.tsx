'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Transaction, TransactionStatus, TransactionType } from '@/types';

import { mockAccounts, mockCategories, mockTransactions } from '@/lib/mock-data';
import { currencyBRL, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type TipoFiltro = 'TODOS' | TransactionType;
type StatusFiltro = 'TODOS' | TransactionStatus;
type Ordenacao = 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc';

const PAGE_SIZE = 12;

export function TransactionsView() {
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<TipoFiltro>('TODOS');
  const [conta, setConta] = useState('TODAS');
  const [status, setStatus] = useState<StatusFiltro>('TODOS');
  const [ordem, setOrdem] = useState<Ordenacao>('data-desc');
  const [visiveis, setVisiveis] = useState(PAGE_SIZE);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const resultado = mockTransactions.filter((tx) => {
      const categoria = mockCategories.find((item) => item.id === tx.categoria_id)?.nome ?? '';
      const contaNome = mockAccounts.find((item) => item.id === tx.conta_id)?.nome ?? '';

      const matchTermo =
        !termo ||
        tx.descricao.toLowerCase().includes(termo) ||
        categoria.toLowerCase().includes(termo) ||
        contaNome.toLowerCase().includes(termo);

      return (
        matchTermo &&
        (tipo === 'TODOS' || tx.tipo === tipo) &&
        (conta === 'TODAS' || tx.conta_id === conta) &&
        (status === 'TODOS' || tx.status === status)
      );
    });

    const comparadores: Record<Ordenacao, (a: Transaction, b: Transaction) => number> = {
      'data-desc': (a, b) => b.data_transacao.localeCompare(a.data_transacao),
      'data-asc': (a, b) => a.data_transacao.localeCompare(b.data_transacao),
      'valor-desc': (a, b) => b.valor - a.valor,
      'valor-asc': (a, b) => a.valor - b.valor,
    };

    return [...resultado].sort(comparadores[ordem]);
  }, [busca, tipo, conta, status, ordem]);

  const totais = useMemo(() => {
    const receitas = filtradas.filter((tx) => tx.tipo === 'RECEITA').reduce((sum, tx) => sum + tx.valor, 0);
    const despesas = filtradas.filter((tx) => tx.tipo === 'DESPESA').reduce((sum, tx) => sum + tx.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filtradas]);

  function exportarCsv() {
    const header = 'data;descricao;categoria;conta;tipo;status;valor';
    const linhas = filtradas.map((tx) =>
      [
        formatDate(tx.data_transacao),
        tx.descricao.replaceAll(';', ','),
        mockCategories.find((item) => item.id === tx.categoria_id)?.nome ?? '',
        mockAccounts.find((item) => item.id === tx.conta_id)?.nome ?? '',
        tx.tipo,
        tx.status,
        tx.valor.toFixed(2).replace('.', ','),
      ].join(';'),
    );

    const blob = new Blob([`${header}\n${linhas.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtradas.length} transação(ões) exportada(s).`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              {filtradas.length} lançamento(s) · saldo do filtro{' '}
              <span className={totais.saldo >= 0 ? 'text-gold-200' : 'text-rose-300'}>
                {currencyBRL(totais.saldo)}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportarCsv} disabled={!filtradas.length}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button className="gap-2" onClick={() => toast.info('Cadastro manual disponível ao conectar o Supabase.')}>
              <Plus className="h-4 w-4" />
              Nova transação
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-onyx-500" />
              <Input
                value={busca}
                onChange={(event) => {
                  setBusca(event.target.value);
                  setVisiveis(PAGE_SIZE);
                }}
                placeholder="Buscar transação, categoria ou conta"
                className="pl-9"
                aria-label="Buscar transações"
              />
            </div>

            <Select aria-label="Tipo" value={tipo} onChange={(event) => setTipo(event.target.value as TipoFiltro)}>
              <option value="TODOS">Todos os tipos</option>
              <option value="RECEITA">Receitas</option>
              <option value="DESPESA">Despesas</option>
            </Select>

            <Select aria-label="Conta" value={conta} onChange={(event) => setConta(event.target.value)}>
              <option value="TODAS">Todas as contas</option>
              {mockAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.nome}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFiltro)}
            >
              <option value="TODOS">Todos os status</option>
              <option value="EFETIVADA">Efetivadas</option>
              <option value="PENDENTE">Pendentes</option>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge tone="gold">Receitas {currencyBRL(totais.receitas)}</Badge>
            <Badge tone="danger">Despesas {currencyBRL(totais.despesas)}</Badge>
            <button
              type="button"
              onClick={() => setOrdem(ordem === 'data-desc' ? 'data-asc' : 'data-desc')}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gold-500/20 px-2.5 py-1.5 text-xs text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Data {ordem === 'data-desc' ? '↓' : '↑'}
            </button>
            <button
              type="button"
              onClick={() => setOrdem(ordem === 'valor-desc' ? 'valor-asc' : 'valor-desc')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/20 px-2.5 py-1.5 text-xs text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Valor {ordem === 'valor-desc' ? '↓' : '↑'}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gold-500/15 bg-black/40 text-xs uppercase tracking-wider text-onyx-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Conta</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, visiveis).map((tx) => {
                  const category = mockCategories.find((item) => item.id === tx.categoria_id);
                  const account = mockAccounts.find((item) => item.id === tx.conta_id);
                  const receita = tx.tipo === 'RECEITA';

                  return (
                    <tr key={tx.id} className="border-b border-white/5 text-onyx-200 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-medium text-onyx-50">{tx.descricao}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category?.cor_hex ?? '#d4af37' }}
                          />
                          {category?.nome}
                        </span>
                      </td>
                      <td className="px-5 py-4">{account?.nome}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(tx.data_transacao)}</td>
                      <td className="px-5 py-4">
                        <Badge tone={tx.status === 'EFETIVADA' ? 'success' : 'warning'}>{tx.status}</Badge>
                      </td>
                      <td className={`whitespace-nowrap px-5 py-4 font-medium ${receita ? 'text-gold-200' : 'text-rose-300'}`}>
                        {receita ? '+' : '-'}
                        {currencyBRL(tx.valor)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            aria-label="Editar transação"
                            onClick={() => toast.info('Edição disponível ao conectar o Supabase.')}
                            className="rounded-lg border border-gold-500/20 p-2 text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            aria-label="Excluir transação"
                            onClick={() => toast.info('Exclusão disponível ao conectar o Supabase.')}
                            className="rounded-lg border border-rose-500/25 p-2 text-rose-300 transition hover:bg-rose-500/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtradas.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-onyx-500">
                      Nenhuma transação encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {visiveis < filtradas.length ? (
            <div className="border-t border-white/5 p-4 text-center">
              <Button variant="subtle" onClick={() => setVisiveis((value) => value + PAGE_SIZE)}>
                Carregar mais ({filtradas.length - visiveis} restantes)
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
