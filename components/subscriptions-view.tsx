'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, CheckCircle2, CreditCard, LoaderCircle, Pencil, Plus, Power, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { DadosFinanceiros, Subscription } from '@/types';

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

export function SubscriptionsView({ dados }: { dados: DadosFinanceiros }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Subscription | null>(null);
  const [removendo, setRemovendo] = useState<Subscription | null>(null);
  const [pendenteId, setPendenteId] = useState<string | null>(null);

  const ativas = dados.assinaturas.filter((item) => item.ativo);
  const total = ativas.reduce((soma, item) => soma + item.valor, 0);

  /** Renda média dos meses que já tiveram receita. */
  const rendaMedia = useMemo(() => {
    const porMes = new Map<string, number>();
    for (const tx of dados.transacoes) {
      if (tx.tipo !== 'RECEITA') continue;
      const chave = tx.data_transacao.slice(0, 7);
      porMes.set(chave, (porMes.get(chave) ?? 0) + tx.valor);
    }
    const valores = [...porMes.values()];
    if (!valores.length) return 0;
    return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
  }, [dados.transacoes]);

  const percentualRenda = rendaMedia > 0 ? (total / rendaMedia) * 100 : 0;

  const hoje = new Date();
  const proximaSemana = ativas.filter((item) => (item.dia_vencimento - hoje.getDate() + 31) % 31 <= 7);

  async function alternar(assinatura: Subscription) {
    setPendenteId(assinatura.id);
    const resposta = await chamarApi(`/api/financas/assinaturas/${assinatura.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo: !assinatura.ativo }),
    });
    setPendenteId(null);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(`${assinatura.nome_servico} ${assinatura.ativo ? 'pausada' : 'reativada'}.`);
    router.refresh();
  }

  async function lancar(assinatura: Subscription) {
    setPendenteId(assinatura.id);
    const resposta = await chamarApi(`/api/financas/assinaturas/${assinatura.id}/lancar`, { method: 'POST' });
    setPendenteId(null);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(`${assinatura.nome_servico} lançada neste mês.`);
    router.refresh();
  }

  async function remover(assinatura: Subscription) {
    setPendenteId(assinatura.id);
    const resposta = await chamarApi(`/api/financas/assinaturas/${assinatura.id}`, { method: 'DELETE' });
    setPendenteId(null);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success('Assinatura removida.');
    setRemovendo(null);
    router.refresh();
  }

  if (!dados.contas.length) {
    return (
      <EmptyState
        icone={<CreditCard className="h-6 w-6" />}
        titulo="Cadastre uma conta primeiro"
        descricao="Cada assinatura é debitada de uma conta. Crie a primeira em Contas."
        acao={
          <Button asChild>
            <a href="/contas">Ir para Contas</a>
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
            <CardTitle>Assinaturas &amp; Planos</CardTitle>
            <CardDescription>
              {ativas.length} ativa(s) de {dados.assinaturas.length} cadastrada(s)
            </CardDescription>
          </div>
          <Button className="gap-2" onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" />
            Nova assinatura
          </Button>
        </CardHeader>

        {dados.assinaturas.length ? (
          <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
            <div className="rounded-2xl border border-gold-500/25 bg-gradient-to-br from-gold-500/12 to-transparent p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gold-200/90">Comprometimento mensal</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-onyx-50">{currencyBRL(total)}</p>
                </div>
                <span className="rounded-xl border border-gold-500/25 bg-onyx-950/40 p-2.5 text-gold-300">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
              {rendaMedia > 0 ? (
                <>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-onyx-950/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-600"
                      style={{ width: `${Math.min(100, percentualRenda)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gold-200/80">
                    {percentualRenda.toFixed(1)}% da renda média mensal ({currencyBRL(rendaMedia)}).
                  </p>
                </>
              ) : (
                <p className="mt-3 text-xs text-gold-200/80">
                  Lance suas receitas para ver quanto isso pesa na renda.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-onyx-50/8 bg-onyx-950/35 p-5">
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
              <p className="mt-4 text-xs text-onyx-500">Projeção anual dos ativos: {currencyBRL(total * 12)}</p>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {dados.assinaturas.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {dados.assinaturas.map((assinatura) => {
            const categoria = dados.categorias.find((item) => item.id === assinatura.categoria_id);
            const conta = dados.contas.find((item) => item.id === assinatura.conta_id);
            const impacto = total ? (assinatura.valor / total) * 100 : 0;
            const ocupado = pendenteId === assinatura.id;

            return (
              <Card key={assinatura.id} className={assinatura.ativo ? undefined : 'opacity-60'}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-xl">{assinatura.nome_servico}</CardTitle>
                      <CardDescription>
                        {categoria?.nome} · {conta?.nome}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={assinatura.ativo ? 'success' : 'neutral'}>
                        {assinatura.ativo ? 'Ativo' : 'Pausado'}
                      </Badge>
                      <button
                        type="button"
                        aria-label={`Editar ${assinatura.nome_servico}`}
                        onClick={() => setEditando(assinatura)}
                        className="rounded-lg border border-gold-500/20 p-1.5 text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${assinatura.nome_servico}`}
                        onClick={() => setRemovendo(assinatura)}
                        className="rounded-lg border border-rose-500/25 p-1.5 text-rose-300 transition hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between rounded-xl border border-onyx-50/5 bg-onyx-950/35 px-3 py-3">
                    <span className="text-sm text-onyx-400">Valor mensal</span>
                    <span className="text-lg font-semibold text-onyx-50">{currencyBRL(assinatura.valor)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-onyx-300">
                    <span>Vencimento</span>
                    <span>Dia {assinatura.dia_vencimento}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm text-onyx-300">
                      <span>Impacto no total</span>
                      <span>{impacto.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-onyx-50/5">
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
                      onClick={() => lancar(assinatura)}
                      disabled={!assinatura.ativo || ocupado}
                    >
                      {ocupado ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Lançar mês
                    </Button>
                    <Button
                      variant="subtle"
                      className="justify-center gap-2"
                      onClick={() => alternar(assinatura)}
                      disabled={ocupado}
                    >
                      <Power className="h-4 w-4" />
                      {assinatura.ativo ? 'Pausar' : 'Reativar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icone={<CreditCard className="h-6 w-6" />}
          titulo="Nenhuma assinatura cadastrada"
          descricao="Cadastre os gastos fixos e recorrentes para acompanhar quanto já está comprometido todo mês."
          acao={
            <Button className="gap-2" onClick={() => setCriando(true)}>
              <Plus className="h-4 w-4" />
              Cadastrar assinatura
            </Button>
          }
        />
      )}

      <AssinaturaDialog
        aberto={criando || Boolean(editando)}
        assinatura={editando}
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
            <DialogTitle>Remover assinatura</DialogTitle>
            <DialogDescription>
              <strong className="text-onyx-100">{removendo?.nome_servico}</strong> sai da lista. Os
              lançamentos já feitos continuam no extrato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="subtle" onClick={() => setRemovendo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendenteId === removendo?.id}
              onClick={() => removendo && remover(removendo)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssinaturaDialog({
  aberto,
  assinatura,
  dados,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  assinatura: Subscription | null;
  dados: DadosFinanceiros;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [pendente, setPendente] = useState(false);
  const categoriasDespesa = dados.categorias.filter((item) => item.tipo === 'DESPESA');

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const corpo = {
      conta_id: String(form.get('conta_id')),
      categoria_id: String(form.get('categoria_id')),
      nome_servico: String(form.get('nome_servico')),
      valor: Number(String(form.get('valor')).replace(',', '.')),
      dia_vencimento: Number(form.get('dia_vencimento')),
    };

    setPendente(true);
    const resposta = assinatura
      ? await chamarApi(`/api/financas/assinaturas/${assinatura.id}`, {
          method: 'PATCH',
          body: JSON.stringify(corpo),
        })
      : await chamarApi('/api/financas/assinaturas', { method: 'POST', body: JSON.stringify(corpo) });
    setPendente(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(assinatura ? 'Assinatura atualizada.' : 'Assinatura cadastrada.');
    onFechar();
    onSalvo();
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assinatura ? `Editar ${assinatura.nome_servico}` : 'Nova assinatura'}</DialogTitle>
          <DialogDescription>Gastos fixos que se repetem todo mês.</DialogDescription>
        </DialogHeader>

        <form key={assinatura?.id ?? 'nova'} onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="as-nome">Serviço</Label>
            <Input
              id="as-nome"
              name="nome_servico"
              required
              maxLength={80}
              defaultValue={assinatura?.nome_servico}
              placeholder="Ex.: Netflix"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="as-valor">Valor mensal (R$)</Label>
              <Input
                id="as-valor"
                name="valor"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={assinatura?.valor}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-dia">Dia do vencimento</Label>
              <Input
                id="as-dia"
                name="dia_vencimento"
                type="number"
                min="1"
                max="31"
                required
                defaultValue={assinatura?.dia_vencimento ?? 10}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="as-conta">Conta</Label>
              <Select id="as-conta" name="conta_id" required defaultValue={assinatura?.conta_id}>
                {dados.contas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-categoria">Categoria</Label>
              <Select id="as-categoria" name="categoria_id" required defaultValue={assinatura?.categoria_id}>
                {categoriasDespesa.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="subtle" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente} className="gap-2">
              {pendente ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {assinatura ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
