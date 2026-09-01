'use client';

import { useRef, useState } from 'react';
import { ArrowUpToLine, CheckCircle2, FileText } from 'lucide-react';

import { parseBankStatement } from '@/lib/ofx-parser';
import { currencyBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function ImportView() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File) {
    const parsed = await parseBankStatement(file);
    setItems(parsed);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar extrato bancário</CardTitle>
          <CardDescription>Arquivos OFX ou CSV com leitura automática de valor, data e descrição</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${isDragging ? 'border-emerald-400 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-950/60'}`}
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
              <ArrowUpToLine className="h-7 w-7" />
            </div>
            <p className="text-lg font-medium text-white">Arraste e solte seu extrato aqui</p>
            <p className="mt-2 text-sm text-zinc-400">ou</p>
            <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
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
              }}
            />
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização e conciliação</CardTitle>
            <CardDescription>Revise cada lançamento antes de aprovar a inserção em lote</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.descricao}</p>
                    <p className="text-xs text-zinc-400">{new Date(item.data_transacao).toLocaleDateString('pt-BR')} • {item.origem}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-medium ${item.tipo === 'RECEITA' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {item.tipo === 'RECEITA' ? '+' : '-'}
                    {currencyBRL(item.valor)}
                  </span>
                  <select className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-2 py-2 text-sm text-zinc-100 outline-none">
                    <option>Categoria</option>
                    <option>Alimentação</option>
                    <option>Salário</option>
                    <option>Casa</option>
                  </select>
                  <button className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
