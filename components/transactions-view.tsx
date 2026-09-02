'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Download, LoaderCircle, Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { DadosFinanceiros, Transaction, TransactionStatus, TransactionType } from '@/types';

import { chamarApi, deInputData, paraInputData } from '@/lib/api-client';
import { currencyBRL, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type TipoFiltro = 'TODOS' | TransactionType;
type StatusFiltro = 'TODOS' | TransactionStatus;
type Ordenacao = 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc';

const PAGINA = 12;

export function TransactionsView({ dados }: { dados: DadosFinanceiros }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<TipoFiltro>('TODOS');
  const [conta, setConta] = useState('TODAS');
  const [status, setStatus] = useState<StatusFiltro>('TODOS');
  const [ordem, setOrdem] = useState<Ordenacao>('data-desc');
  const [visiveis, setVisiveis] = useState(PAGINA);

  const [editando, setEditando] = useState<Transaction | null>(null);
  const [criando, setCriando] = useState(false);
  const [removendo, setRemovendo] = useState<Transaction | null>(null);
  const [pendente, setPendente] = useState(false);

  const semEstrutura = !dados.contas.length;

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const resultado = dados.transacoes.filter((tx) => {
      const categoria = dados.categorias.find((item) => item.id === tx.categoria_id)?.nome ?? '';
      const contaNome = dados.contas.find((item) => item.id === tx.conta_id)?.nome ?? '';

      const combina =
        !termo ||
        tx.descricao.toLowerCase().includes(termo) ||
        categoria.toLowerCase().includes(termo) ||
        contaNome.toLowerCase().includes(termo);

      return (
        combina &&
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
  }, [dados, busca, tipo, conta, status, ordem]);

  const totais = useMemo(() => {
    const receitas = filtradas.filter((tx) => tx.tipo === 'RECEITA').reduce((s, tx) => s + tx.valor, 0);
    const despesas = filtradas.filter((tx) => tx.tipo === 'DESPESA').reduce((s, tx) => s + tx.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filtradas]);

  function exportarCsv() {
    const cabecalho = 'data;descricao;categoria;conta;tipo;status;valor';
    const linhas = filtradas.map((tx) =>
      [
        formatDate(tx.data_transacao),
        tx.descricao.replaceAll(';', ','),
        dados.categorias.find((item) => item.id === tx.categoria_id)?.nome ?? '',
        dados.contas.find((item) => item.id === tx.conta_id)?.nome ?? '',
        tx.tipo,
        tx.status,
        tx.valor.toFixed(2).replace('.', ','),
      ].join(';'),
    );

    const blob = new Blob([`${cabecalho}\n${linhas.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtradas.length} transação(ões) exportada(s).`);
  }

  async function remover(transacao: Transaction) {
    setPendente(true);
    const resposta = await chamarApi(`/api/financas/transacoes/${transacao.id}`, { method: 'DELETE' });
    setPendente(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success('Transação removida.');
    setRemovendo(null);
    router.refresh();
  }

  async function alternarStatus(transacao: Transaction) {
    const novo: TransactionStatus = transacao.status === 'EFETIVADA' ? 'PENDENTE' : 'EFETIVADA';
    const resposta = await chamarApi(`/api/financas/transacoes/${transacao.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: novo }),
    });

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(novo === 'EFETIVADA' ? 'Marcada como efetivada.' : 'Marcada como pendente.');
    router.refresh();
  }

  if (semEstrutura) {
    return (
      <EmptyState
        icone={<ReceiptText className="h-6 w-6" />}
        titulo="Cadastre uma conta primeiro"
        descricao="Toda transação pertence a uma conta. Crie a primeira em Saldo geral & Carteira e volte aqui."
        acao={
          <Button asChild>
            <a href="/contas">Ir para Saldo geral</a>
          </Button>
        }
      />
    );
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
            <Button className="gap-2" onClick={() => setCriando(true)}>
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
                  setVisiveis(PAGINA);
                }}
                placeholder="Buscar transação, categoria ou conta"
                className="pl-9"
                aria-label="Buscar transações"
              />
            </div>

            <Select aria-label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoFiltro)}>
              <option value="TODOS">Todos os tipos</option>
              <option value="RECEITA">Receitas</option>
              <option value="DESPESA">Despesas</option>
            </Select>

            <Select aria-label="Conta" value={conta} onChange={(e) => setConta(e.target.value)}>
              <option value="TODAS">Todas as contas</option>
              {dados.contas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </Select>

            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFiltro)}>
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

      {dados.transacoes.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gold-500/15 bg-onyx-950/40 text-xs uppercase tracking-wider text-onyx-500">
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
                    const categoria = dados.categorias.find((item) => item.id === tx.categoria_id);
                    const contaDaLinha = dados.contas.find((item) => item.id === tx.conta_id);
                    const receita = tx.tipo === 'RECEITA';

                    return (
                      <tr key={tx.id} className="border-b border-onyx-50/5 text-onyx-200 last:border-0 hover:bg-onyx-50/[0.02]">
                        <td className="px-5 py-4 font-medium text-onyx-50">{tx.descricao}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: categoria?.cor_hex ?? '#d4af37' }}
                            />
                            {categoria?.nome ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">{contaDaLinha?.nome ?? '—'}</td>
                        <td className="whitespace-nowrap px-5 py-4">{formatDate(tx.data_transacao)}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => alternarStatus(tx)}
                            title="Alternar status"
                            className="cursor-pointer"
                          >
                            <Badge tone={tx.status === 'EFETIVADA' ? 'success' : 'warning'}>{tx.status}</Badge>
                          </button>
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-4 font-medium ${receita ? 'text-gold-200' : 'text-rose-300'}`}
                        >
                          {receita ? '+' : '-'}
                          {currencyBRL(tx.valor)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              aria-label="Editar transação"
                              onClick={() => setEditando(tx)}
                              className="rounded-lg border border-gold-500/20 p-2 text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              aria-label="Excluir transação"
                              onClick={() => setRemovendo(tx)}
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
              <div className="border-t border-onyx-50/5 p-4 text-center">
                <Button variant="subtle" onClick={() => setVisiveis((valor) => valor + PAGINA)}>
                  Carregar mais ({filtradas.length - visiveis} restantes)
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icone={<ReceiptText className="h-6 w-6" />}
          titulo="Nenhuma transação ainda"
          descricao="Lance a primeira receita ou despesa, ou importe um extrato do banco."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <Button className="gap-2" onClick={() => setCriando(true)}>
                <Plus className="h-4 w-4" />
                Nova transação
              </Button>
              <Button asChild variant="outline">
                <a href="/importar">Importar extrato</a>
              </Button>
            </div>
          }
        />
      )}

      <TransacaoDialog
        aberto={criando || Boolean(editando)}
        transacao={editando}
        dados={dados}
        onFechar={() => {
          setCriando(false);
          setEditando(null);
        }}
        onSalvo={() => router.refresh()}
      />

      <Dialog open={Boolean(removendo)} onOpenChange={(aberto) => !aberto && setRemovendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
            <DialogDescription>
              <strong className="text-onyx-100">{removendo?.descricao}</strong> será removida do extrato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="subtle" onClick={() => setRemovendo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pendente} onClick={() => removendo && remover(removendo)}>
              {pendente ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransacaoDialog({
  aberto,
  transacao,
  dados,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  transacao: Transaction | null;
  dados: DadosFinanceiros;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [tipo, setTipo] = useState<TransactionType>(transacao?.tipo ?? 'DESPESA');
  const [pendente, setPendente] = useState(false);

  const categoriasDoTipo = dados.categorias.filter((item) => item.tipo === tipo);

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const corpo = {
      conta_id: String(form.get('conta_id')),
      categoria_id: String(form.get('categoria_id')),
      descricao: String(form.get('descricao')),
      valor: Number(String(form.get('valor')).replace(',', '.')),
      tipo,
      data_transacao: deInputData(String(form.get('data'))),
      status: form.get('status') as TransactionStatus,
    };

    setPendente(true);
    const resposta = transacao
      ? await chamarApi(`/api/financas/transacoes/${transacao.id}`, {
          method: 'PATCH',
          body: JSON.stringify(corpo),
        })
      : await chamarApi('/api/financas/transacoes', { method: 'POST', body: JSON.stringify(corpo) });
    setPendente(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(transacao ? 'Transação atualizada.' : 'Transação lançada.');
    onFechar();
    onSalvo();
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(estado) => {
        if (!estado) onFechar();
        else setTipo(transacao?.tipo ?? 'DESPESA');
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transacao ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          <DialogDescription>Receitas somam ao saldo; despesas subtraem.</DialogDescription>
        </DialogHeader>

        <form key={transacao?.id ?? 'nova'} onSubmit={salvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-tipo">Tipo</Label>
              <Select
                id="tx-tipo"
                value={tipo}
                onChange={(event) => setTipo(event.target.value as TransactionType)}
              >
                <option value="DESPESA">Despesa</option>
                <option value="RECEITA">Receita</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-valor">Valor (R$)</Label>
              <Input
                id="tx-valor"
                name="valor"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={transacao?.valor}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-descricao">Descrição</Label>
            <Input
              id="tx-descricao"
              name="descricao"
              required
              maxLength={120}
              defaultValue={transacao?.descricao}
              placeholder="Ex.: Supermercado"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-conta">Conta</Label>
              <Select id="tx-conta" name="conta_id" required defaultValue={transacao?.conta_id}>
                {dados.contas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-categoria">Categoria</Label>
              <Select
                id="tx-categoria"
                name="categoria_id"
                required
                defaultValue={transacao?.categoria_id}
                key={`categoria-${tipo}`}
              >
                {categoriasDoTipo.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-data">Data</Label>
              <Input
                id="tx-data"
                name="data"
                type="date"
                required
                defaultValue={paraInputData(transacao?.data_transacao ?? new Date().toISOString())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-status">Status</Label>
              <Select id="tx-status" name="status" defaultValue={transacao?.status ?? 'EFETIVADA'}>
                <option value="EFETIVADA">Efetivada</option>
                <option value="PENDENTE">Pendente</option>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="subtle" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente} className="gap-2">
              {pendente ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {transacao ? 'Salvar' : 'Lançar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
