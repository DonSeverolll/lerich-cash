'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpToLine, CheckCircle2, FileText, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import type { Account, Category, ImportPreviewItem } from '@/types';

import { chamarApi } from '@/lib/api-client';
import { parseBankStatement } from '@/lib/ofx-parser';
import { currencyBRL, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ImportView({ contas, categorias }: { contas: Account[]; categorias: Category[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [gravando, setGravando] = useState(false);
  const [items, setItems] = useState<ImportPreviewItem[]>([]);
  const [aprovados, setAprovados] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [arquivo, setArquivo] = useState<string | null>(null);

  async function handleFile(file: File) {
    const nome = file.name.toLowerCase();
    if (!nome.endsWith('.ofx') && !nome.endsWith('.csv')) {
      toast.error('Formato não suportado. Envie um arquivo .ofx ou .csv.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Arquivo acima de 5 MB. Divida o extrato em períodos menores.');
      return;
    }

    setLoading(true);
    try {
      const parsed = await parseBankStatement(file);

      if (!parsed.length) {
        toast.error('Nenhum lançamento reconhecido. Confira o formato do arquivo.');
        return;
      }

      setItems(parsed);
      setAprovados(new Set(parsed.map((item) => item.id)));
      setArquivo(file.name);
      toast.success(`${parsed.length} lançamento(s) lido(s) de ${file.name}.`);
    } catch {
      toast.error('Não foi possível ler o arquivo.');
    } finally {
      setLoading(false);
    }
  }

  function atualizar(id: string, patch: Partial<ImportPreviewItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function descartar(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setAprovados((current) => {
      const proximo = new Set(current);
      proximo.delete(id);
      return proximo;
    });
  }

  function alternarAprovacao(id: string) {
    setAprovados((current) => {
      const proximo = new Set(current);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  const selecionados = items.filter((item) => aprovados.has(item.id));

  /** Grava em lote os lançamentos conferidos. */
  async function confirmar() {
    const semVinculo = selecionados.filter((item) => !item.conta_id || !item.categoria_id);
    if (semVinculo.length) {
      toast.error(`${semVinculo.length} lançamento(s) ainda sem conta ou categoria.`);
      return;
    }

    setGravando(true);
    const resposta = await chamarApi<{ total: number }>('/api/financas/importar', {
      method: 'POST',
      body: JSON.stringify({ itens: selecionados }),
    });
    setGravando(false);

    if (!resposta.ok) {
      toast.error(resposta.erro);
      return;
    }

    toast.success(`${resposta.dados.total} lançamento(s) importado(s).`);
    setItems([]);
    setAprovados(new Set());
    setArquivo(null);
    router.refresh();
  }
  const totalReceitas = selecionados.filter((i) => i.tipo === 'RECEITA').reduce((s, i) => s + i.valor, 0);
  const totalDespesas = selecionados.filter((i) => i.tipo === 'DESPESA').reduce((s, i) => s + i.valor, 0);
  const semCategoria = selecionados.filter((item) => !item.categoria_id).length;

  if (!contas.length) {
    return (
      <EmptyState
        icone={<ArrowUpToLine className="h-6 w-6" />}
        titulo="Cadastre uma conta primeiro"
        descricao="Os lançamentos importados precisam ser atribuídos a uma conta."
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
        <CardHeader>
          <CardTitle>Importar extrato bancário</CardTitle>
          <CardDescription>
            Arquivos OFX ou CSV (data, descrição, valor) com leitura automática — até 5 MB
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragging ? 'border-gold-400 bg-gold-500/10' : 'border-gold-500/20 bg-onyx-950/40'
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
              <ArrowUpToLine className="h-7 w-7" />
            </div>
            <p className="text-lg font-medium text-onyx-50">
              {loading ? 'Lendo arquivo…' : 'Arraste e solte seu extrato aqui'}
            </p>
            <p className="mt-2 text-sm text-onyx-500">ou</p>
            <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={loading}>
              Selecionar arquivo
            </Button>
            <Input
              ref={inputRef}
              type="file"
              accept=".ofx,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = '';
              }}
            />
            {arquivo ? <p className="mt-4 text-xs text-onyx-500">Último arquivo: {arquivo}</p> : null}
          </div>
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Pré-visualização e conciliação</CardTitle>
              <CardDescription>
                {selecionados.length} de {items.length} selecionado(s) — revise antes de confirmar
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">Entradas {currencyBRL(totalReceitas)}</Badge>
              <Badge tone="danger">Saídas {currencyBRL(totalDespesas)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {semCategoria > 0 ? (
              <p className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {semCategoria} lançamento(s) selecionado(s) ainda sem categoria.
              </p>
            ) : null}

            {items.map((item) => {
              const aprovado = aprovados.has(item.id);
              const receita = item.tipo === 'RECEITA';

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 rounded-xl border px-3 py-3 transition lg:flex-row lg:items-center lg:justify-between ${
                    aprovado ? 'border-gold-500/25 bg-onyx-950/40' : 'border-onyx-50/5 bg-onyx-950/20 opacity-70'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-onyx-50/8 bg-onyx-950/50 text-onyx-400">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-onyx-50">{item.descricao}</p>
                      <p className="truncate text-xs text-onyx-500">
                        {formatDate(item.data_transacao)} • origem {item.origem}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`min-w-[7rem] font-medium ${receita ? 'text-gold-200' : 'text-rose-300'}`}>
                      {receita ? '+' : '-'}
                      {currencyBRL(item.valor)}
                    </span>

                    <Select
                      aria-label="Conta de destino"
                      className="w-40"
                      value={item.conta_id ?? ''}
                      onChange={(event) => atualizar(item.id, { conta_id: event.target.value || undefined })}
                    >
                      <option value="">Conta…</option>
                      {contas.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.nome}
                        </option>
                      ))}
                    </Select>

                    <Select
                      aria-label="Categoria"
                      className="w-44"
                      value={item.categoria_id ?? ''}
                      onChange={(event) => atualizar(item.id, { categoria_id: event.target.value || undefined })}
                    >
                      <option value="">Categoria…</option>
                      {categorias
                        .filter((category) => category.tipo === item.tipo)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.nome}
                          </option>
                        ))}
                    </Select>

                    <button
                      type="button"
                      aria-label={aprovado ? 'Remover da seleção' : 'Incluir na seleção'}
                      onClick={() => alternarAprovacao(item.id)}
                      className={`rounded-xl border p-2 transition ${
                        aprovado
                          ? 'border-gold-500/40 bg-gold-500/15 text-gold-200'
                          : 'border-onyx-50/10 text-onyx-500 hover:text-gold-200'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Descartar lançamento"
                      onClick={() => descartar(item.id)}
                      className="rounded-xl border border-rose-500/25 p-2 text-rose-300 transition hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-3 border-t border-onyx-50/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-onyx-400">
                Saldo líquido da importação:{' '}
                <span className={totalReceitas - totalDespesas >= 0 ? 'text-gold-200' : 'text-rose-300'}>
                  {currencyBRL(totalReceitas - totalDespesas)}
                </span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setItems([]);
                    setAprovados(new Set());
                    setArquivo(null);
                  }}
                >
                  Limpar
                </Button>
                <Button disabled={!selecionados.length || gravando} onClick={confirmar}>
                  {gravando ? 'Gravando…' : 'Confirmar importação'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
