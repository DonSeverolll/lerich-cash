'use client';

import { useState } from 'react';
import { KeyRound, LoaderCircle, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import type { SessionUser, UserPlan } from '@/types';

import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileViewProps {
  session: SessionUser;
  email: string;
  plano: UserPlan;
  criadoEm: string | null;
  ultimoAcesso: string | null;
}

export function ProfileView({ session, email, plano, criadoEm, ultimoAcesso }: ProfileViewProps) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nova !== confirmacao) {
      toast.error('A confirmação não coincide com a nova senha.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atual, nova }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? 'Não foi possível alterar a senha.');
        return;
      }

      toast.success('Senha atualizada.');
      setAtual('');
      setNova('');
      setConfirmacao('');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
          <CardDescription>Informações do seu acesso ao Lerich Finance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center gap-4 rounded-2xl border border-gold-500/15 bg-onyx-950/40 p-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-gold-300 to-gold-600 text-lg font-semibold text-acento">
              {session.nome.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-onyx-50">{session.nome}</p>
              <p className="truncate text-sm text-onyx-500">@{session.username}</p>
            </div>
          </div>

          <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={email || '—'} />
          <InfoRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Perfil"
            value={session.role === 'ADMIN' ? 'Administrador' : 'Cliente'}
          />
          <InfoRow icon={<UserRound className="h-4 w-4" />} label="Plano" value={plano} />
          <InfoRow
            icon={<UserRound className="h-4 w-4" />}
            label="Cliente desde"
            value={criadoEm ? formatDate(criadoEm) : '—'}
          />
          <InfoRow
            icon={<UserRound className="h-4 w-4" />}
            label="Último acesso"
            value={ultimoAcesso ? formatDate(ultimoAcesso) : 'Primeiro acesso'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>Use no mínimo 8 caracteres, com letras e números</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="atual">Senha atual</Label>
              <Input
                id="atual"
                type="password"
                autoComplete="current-password"
                required
                value={atual}
                onChange={(event) => setAtual(event.target.value)}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nova">Nova senha</Label>
                <Input
                  id="nova"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={nova}
                  onChange={(event) => setNova(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirmar</Label>
                <Input
                  id="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Badge tone="gold">Auditado</Badge>
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Salvar nova senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-onyx-50/5 bg-onyx-950/30 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-onyx-400">
        <span className="text-gold-500/80">{icon}</span>
        {label}
      </span>
      <span className="truncate text-sm text-onyx-100">{value}</span>
    </div>
  );
}
