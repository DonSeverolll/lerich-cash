'use client';

import { useMemo, useState } from 'react';
import { Download, Search, ShieldAlert } from 'lucide-react';

import type { AuditAction, AuditLog } from '@/types';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const meta: Record<AuditAction, { label: string; tone: BadgeTone }> = {
  LOGIN_OK: { label: 'Login', tone: 'success' },
  LOGIN_FALHA: { label: 'Login recusado', tone: 'danger' },
  LOGOUT: { label: 'Logout', tone: 'neutral' },
  USUARIO_CRIADO: { label: 'Usuário criado', tone: 'gold' },
  USUARIO_ATUALIZADO: { label: 'Usuário atualizado', tone: 'gold' },
  USUARIO_REMOVIDO: { label: 'Usuário removido', tone: 'danger' },
  SENHA_REDEFINIDA: { label: 'Senha redefinida', tone: 'warning' },
  CADASTRO_PUBLICO: { label: 'Cadastro público', tone: 'gold' },
  RESET_SOLICITADO: { label: 'Recuperação pedida', tone: 'warning' },
  RESET_CONCLUIDO: { label: 'Senha recuperada', tone: 'success' },
};

export function AdminAuditView({ logs }: { logs: AuditLog[] }) {
  const [busca, setBusca] = useState('');
  const [acao, setAcao] = useState<'TODAS' | AuditAction>('TODAS');

  const filtered = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return logs.filter((log) => {
      const matchTermo =
        !termo || log.actor.toLowerCase().includes(termo) || log.detalhe.toLowerCase().includes(termo);
      return matchTermo && (acao === 'TODAS' || log.action === acao);
    });
  }, [logs, busca, acao]);

  const falhas = logs.filter((log) => log.action === 'LOGIN_FALHA').length;

  function exportCsv() {
    const header = 'data;acao;autor;alvo;detalhe';
    const rows = filtered.map((log) =>
      [
        new Date(log.created_at).toLocaleString('pt-BR'),
        meta[log.action].label,
        log.actor,
        log.target ?? '',
        log.detalhe.replaceAll(';', ','),
      ].join(';'),
    );

    const blob = new Blob([`${header}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-lerich-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Trilha de auditoria</CardTitle>
            <CardDescription>
              {logs.length} evento(s) registrado(s) · {falhas} tentativa(s) de login recusada(s)
            </CardDescription>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-onyx-500" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por autor ou detalhe"
                className="pl-9"
                aria-label="Buscar eventos"
                data-dica="Buscar eventos"
              />
            </div>
            <Select
              aria-label="Filtrar por ação"
              data-dica="Filtrar por ação"
              className="md:w-56"
              value={acao}
              onChange={(event) => setAcao(event.target.value as 'TODAS' | AuditAction)}
            >
              <option value="TODAS">Todas as ações</option>
              {(Object.keys(meta) as AuditAction[]).map((action) => (
                <option key={action} value={action}>
                  {meta[action].label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gold-500/15 bg-onyx-950/40 text-xs uppercase tracking-wider text-onyx-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Data e hora</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                  <th className="px-5 py-3 font-medium">Autor</th>
                  <th className="px-5 py-3 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-onyx-50/5 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3.5 text-onyx-300">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={meta[log.action].tone}>{meta[log.action].label}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-onyx-100">{log.actor}</td>
                    <td className="px-5 py-3.5 text-onyx-400">{log.detalhe}</td>
                  </tr>
                ))}

                {!filtered.length ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <ShieldAlert className="mx-auto mb-3 h-6 w-6 text-onyx-600" />
                      <p className="text-sm text-onyx-500">Nenhum evento para os filtros selecionados.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
