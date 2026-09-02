'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, Landmark, LoaderCircle, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import type { Account, AccountType, DadosFinanceiros } from '@/types';

import { chamarApi } from '@/lib/api-client';
import { currencyBRL } from '@/lib/utils';
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
import { StatCard } from '@/components/ui/stat-card';

const tipoLabels: Record<AccountType, string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança',
  INVESTIMENTO: 'Investimento',
  CARTEIRA: 'Carteira',
};

const cores = ['#d4af37', '#e9cb6d', '#b8912a', '#f2e0a0', '#936e23', '#dcb648'];

export function AccountsView({ dados }: { dados: DadosFinanceiros }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Account | null>(null);
  const [criando, setCriando] = useState(false);
  const [removendo, setRemovendo] = useState<Account | null>(null);
  const [pendente, setPendente] = useState(false);

  const resumo = useMemo(
    () =>
      dados.contas.map((conta) => {
        const doPeriodo = dados.transacoes.filter((tx) => tx.conta_id === conta.id);
        const entradas = doPeriodo.filter((tx) => tx.tipo === 'RECEITA').reduce((s, tx) => s + tx.valor, 0);
        const saidas = doPeriodo.filter((tx) => tx.tipo === 'DESPESA').reduce((s, tx) => s + tx.valor, 0);

        return {
          ...conta,
          entradas,
          saidas,
          saldoAtual: conta.saldo_inicial + entradas - saidas,
          movimentos: doPeriodo.length,
        };
      }),
    [dados],
  );

  const totalAtual = resumo.reduce((soma, item) => soma + item.saldoAtual, 0);
  const totalInicial = resumo.reduce((soma, item) => soma + item.saldo_inicial, 0);
  const variacao = totalInicial ? ((totalAtual - totalInicial) / totalInicial) * 100 : 0;

  async function remover(conta: Account) {
    setPendente(true);
    const resposta = await chamarApi(`/api/financas/contas/${conta.id}`, { method: 'DELETE' });
    setPendente(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(`${conta.nome} removida.`);
    setRemovendo(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {dados.contas.length ? (
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Patrimônio consolidado"
            value={currencyBRL(totalAtual)}
            tone="gold"
            trend={totalInicial ? `${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}% sobre o saldo inicial` : undefined}
            trendPositive={variacao >= 0}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Entradas acumuladas"
            value={currencyBRL(resumo.reduce((s, item) => s + item.entradas, 0))}
            tone="success"
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          <StatCard
            title="Saídas acumuladas"
            value={currencyBRL(resumo.reduce((s, item) => s + item.saidas, 0))}
            tone="danger"
            icon={<ArrowDownRight className="h-5 w-5" />}
          />
        </section>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Contas bancárias</CardTitle>
            <CardDescription>
              {dados.contas.length
                ? 'Saldo calculado a partir do saldo inicial mais os lançamentos'
                : 'Cadastre a primeira conta para começar a lançar'}
            </CardDescription>
          </div>
          <Button className="gap-2" onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        </CardHeader>
      </Card>

      {dados.contas.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumo.map((conta) => {
            const participacao = totalAtual ? (conta.saldoAtual / totalAtual) * 100 : 0;

            return (
              <Card key={conta.id} className="overflow-hidden">
                <div className="h-1.5 w-full" style={{ backgroundColor: conta.cor_hex }} />
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.14em] text-onyx-500">
                        {tipoLabels[conta.tipo]}
                      </p>
                      <h3 className="mt-1 truncate text-xl font-semibold text-onyx-50">{conta.nome}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Editar ${conta.nome}`}
                        onClick={() => setEditando(conta)}
                        className="rounded-lg border border-gold-500/20 p-2 text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${conta.nome}`}
                        onClick={() => setRemovendo(conta)}
                        className="rounded-lg border border-rose-500/25 p-2 text-rose-300 transition hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-onyx-400">Saldo atual</p>
                    <p className="mt-1 font-display text-3xl font-semibold text-onyx-50">
                      {currencyBRL(conta.saldoAtual)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="mr-3 h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(2, participacao))}%`,
                          backgroundColor: conta.cor_hex,
                        }}
                      />
                    </div>
                    <Badge tone="gold">{participacao.toFixed(0)}%</Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                      <dt className="text-xs text-onyx-500">Entradas</dt>
                      <dd className="mt-0.5 font-medium text-gold-200">{currencyBRL(conta.entradas)}</dd>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                      <dt className="text-xs text-onyx-500">Saídas</dt>
                      <dd className="mt-0.5 font-medium text-rose-300">{currencyBRL(conta.saidas)}</dd>
                    </div>
                  </dl>

                  <p className="text-xs text-onyx-500">
                    Saldo inicial {currencyBRL(conta.saldo_inicial)} · {conta.movimentos} movimento(s)
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icone={<Landmark className="h-6 w-6" />}
          titulo="Nenhuma conta cadastrada"
          descricao="As contas são o ponto de partida: toda transação pertence a uma delas."
          acao={
            <Button className="gap-2" onClick={() => setCriando(true)}>
              <Plus className="h-4 w-4" />
              Cadastrar primeira conta
            </Button>
          }
        />
      )}

      <ContaDialog
        aberto={criando || Boolean(editando)}
        conta={editando}
        onFechar={() => {
          setCriando(false);
          setEditando(null);
        }}
        onSalvo={() => router.refresh()}
      />

      <Dialog open={Boolean(removendo)} onOpenChange={(aberto) => !aberto && setRemovendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover conta</DialogTitle>
            <DialogDescription>
              A conta <strong className="text-onyx-100">{removendo?.nome}</strong> será apagada. Contas com
              lançamentos não podem ser removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="subtle" onClick={() => setRemovendo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pendente} onClick={() => removendo && remover(removendo)}>
              {pendente ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContaDialog({
  aberto,
  conta,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  conta: Account | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [pendente, setPendente] = useState(false);

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const corpo = {
      nome: String(form.get('nome')),
      tipo: form.get('tipo'),
      saldo_inicial: Number(String(form.get('saldo_inicial')).replace(',', '.')),
      cor_hex: String(form.get('cor_hex')),
    };

    setPendente(true);
    const resposta = conta
      ? await chamarApi(`/api/financas/contas/${conta.id}`, { method: 'PATCH', body: JSON.stringify(corpo) })
      : await chamarApi('/api/financas/contas', { method: 'POST', body: JSON.stringify(corpo) });
    setPendente(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(conta ? 'Conta atualizada.' : 'Conta criada.');
    onFechar();
    onSalvo();
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conta ? `Editar ${conta.nome}` : 'Nova conta'}</DialogTitle>
          <DialogDescription>O saldo inicial é o ponto de partida do cálculo.</DialogDescription>
        </DialogHeader>

        <form key={conta?.id ?? 'nova'} onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conta-nome">Nome</Label>
            <Input id="conta-nome" name="nome" required maxLength={60} defaultValue={conta?.nome} placeholder="Ex.: NuBank" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="conta-tipo">Tipo</Label>
              <Select id="conta-tipo" name="tipo" defaultValue={conta?.tipo ?? 'CORRENTE'}>
                {(Object.keys(tipoLabels) as AccountType[]).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipoLabels[tipo]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conta-saldo">Saldo inicial (R$)</Label>
              <Input
                id="conta-saldo"
                name="saldo_inicial"
                type="number"
                step="0.01"
                required
                defaultValue={conta?.saldo_inicial ?? 0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conta-cor">Cor</Label>
            <Select id="conta-cor" name="cor_hex" defaultValue={conta?.cor_hex ?? cores[0]}>
              {cores.map((cor) => (
                <option key={cor} value={cor}>
                  {cor}
                </option>
              ))}
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="subtle" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente} className="gap-2">
              {pendente ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {conta ? 'Salvar' : 'Criar conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
