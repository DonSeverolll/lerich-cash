'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, Crown, Database, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { AppUser, AuditLog, StoreDriver } from '@/types';

import { mockAccounts, mockSubscriptions, mockTransactions } from '@/lib/mock-data';
import { currencyBRL } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { chartTooltipStyle, compactTick, goldPalette } from '@/lib/chart-theme';

const growth = [
  { mes: 'Mar', clientes: 12, volume: 48000 },
  { mes: 'Abr', clientes: 18, volume: 61000 },
  { mes: 'Mai', clientes: 25, volume: 74500 },
  { mes: 'Jun', clientes: 31, volume: 88000 },
  { mes: 'Jul', clientes: 40, volume: 102300 },
  { mes: 'Ago', clientes: 52, volume: 128900 },
];

const auditLabels: Record<AuditLog['action'], string> = {
  LOGIN_OK: 'Login',
  LOGIN_FALHA: 'Login recusado',
  LOGOUT: 'Logout',
  USUARIO_CRIADO: 'Usuário criado',
  USUARIO_ATUALIZADO: 'Usuário atualizado',
  USUARIO_REMOVIDO: 'Usuário removido',
  SENHA_REDEFINIDA: 'Senha redefinida',
  CADASTRO_PUBLICO: 'Cadastro público',
  RESET_SOLICITADO: 'Recuperação pedida',
  RESET_CONCLUIDO: 'Senha recuperada',
};

interface AdminOverviewProps {
  users: AppUser[];
  audit: AuditLog[];
  driver: StoreDriver;
}

const avisoDriver: Record<StoreDriver, { texto: string; alerta: boolean }> = {
  firestore: {
    texto: 'Dados de acesso no Cloud Firestore — usuários criados aqui persistem entre deploys.',
    alerta: false,
  },
  arquivo: {
    texto:
      'Dados de acesso em arquivo local (.data/store.json). Funciona em uma única instância; em hospedagem serverless os cadastros somem no próximo deploy. Configure o Firebase para persistência real.',
    alerta: true,
  },
  memoria: {
    texto:
      'O armazenamento em arquivo não está disponível neste ambiente: os usuários criados agora vivem apenas em memória e serão perdidos ao reiniciar. Configure o Firebase para persistência real.',
    alerta: true,
  },
};

export function AdminOverview({ users, audit, driver }: AdminOverviewProps) {
  const aviso = avisoDriver[driver];
  const clientes = users.filter((user) => user.role === 'CLIENTE');
  const ativos = users.filter((user) => user.status === 'ATIVO');
  const admins = users.filter((user) => user.role === 'ADMIN');
  const premium = users.filter((user) => user.plano !== 'FREE');

  const volumeTransacionado = mockTransactions.reduce((sum, item) => sum + item.valor, 0);
  const custodia = mockAccounts.reduce((sum, item) => sum + item.saldo_inicial, 0);
  const recorrente = mockSubscriptions.reduce((sum, item) => sum + item.valor, 0);

  const planos = (['FREE', 'PRO', 'PREMIUM'] as const)
    .map((plano, index) => ({
      name: plano,
      value: users.filter((user) => user.plano === plano).length,
      color: goldPalette[index % goldPalette.length],
    }))
    .filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <div
        className={
          aviso.alerta
            ? 'flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100'
            : 'flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100'
        }
      >
        {aviso.alerta ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p>{aviso.texto}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Usuários" value={String(users.length)} hint={`${admins.length} administrador(es)`} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Clientes ativos" value={String(ativos.filter((u) => u.role === 'CLIENTE').length)} hint={`${clientes.length} no total`} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard title="Planos pagos" value={String(premium.length)} hint="PRO + PREMIUM" icon={<Crown className="h-5 w-5" />} tone="gold" />
        <StatCard title="Volume em custódia" value={currencyBRL(custodia)} hint={`${currencyBRL(volumeTransacionado)} movimentados`} icon={<Activity className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Crescimento da base</CardTitle>
              <CardDescription>Clientes ativos e volume transacionado</CardDescription>
            </div>
            <Badge tone="gold">+29% no mês</Badge>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.12)" vertical={false} />
                <XAxis dataKey="mes" stroke="#8a8a8a" tickLine={false} axisLine={false} />
                <YAxis stroke="#8a8a8a" tickLine={false} axisLine={false} width={52} tickFormatter={compactTick} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, name) =>
                    name === 'volume' ? currencyBRL(Number(value)) : `${Number(value)} clientes`
                  }
                />
                <Area type="monotone" dataKey="volume" stroke="#d4af37" strokeWidth={2} fill="url(#goldArea)" />
                <Area type="monotone" dataKey="clientes" stroke="#e9cb6d" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de planos</CardTitle>
            <CardDescription>Base atual por plano contratado</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-0">
            {planos.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planos} innerRadius={54} outerRadius={92} paddingAngle={4} dataKey="value" stroke="none">
                    {planos.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => `${Number(value)} usuário(s)`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-onyx-500">Sem dados de plano.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimos usuários</CardTitle>
              <CardDescription>Contas mais recentes da base</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/usuarios">Gerenciar</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[...users]
              .reverse()
              .slice(0, 5)
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/35 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-onyx-50">{user.nome}</p>
                    <p className="truncate text-xs text-onyx-500">@{user.username}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {user.role === 'ADMIN' ? (
                      <Badge tone="gold">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge tone="neutral">{user.plano}</Badge>
                    )}
                    <Badge tone={user.status === 'ATIVO' ? 'success' : 'danger'}>{user.status}</Badge>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Eventos recentes</CardTitle>
              <CardDescription>Trilha de auditoria</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/auditoria">Ver tudo</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {audit.length ? (
              audit.map((log) => (
                <div key={log.id} className="rounded-xl border border-white/5 bg-black/35 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-onyx-100">{auditLabels[log.action]}</p>
                    <span className="shrink-0 text-xs text-onyx-500">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-onyx-500">
                    {log.actor} — {log.detalhe}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-onyx-500">Nenhum evento registrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Receita recorrente monitorada</CardTitle>
          <CardDescription>Somatório das assinaturas cadastradas pelos clientes</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="font-display text-4xl text-gold-gradient">{currencyBRL(recorrente)}</p>
          <p className="mt-2 text-sm text-onyx-400">
            Projeção anual de {currencyBRL(recorrente * 12)} em despesas recorrentes acompanhadas pela
            plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
