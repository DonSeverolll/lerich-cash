'use client';

import { useState } from 'react';
import { Database, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import type { AppSettings, StoreDriver } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const rotuloDriver: Record<StoreDriver, string> = {
  firestore: 'Cloud Firestore',
  arquivo: 'Arquivo local',
  memoria: 'Somente memória',
};

export function AdminSettingsView({
  initialSettings,
  driver,
}: {
  initialSettings: AppSettings;
  driver: StoreDriver;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as { settings?: AppSettings; error?: string };

      if (!response.ok || !data.settings) {
        toast.error(data.error ?? 'Não foi possível salvar.');
        return;
      }

      setSettings(data.settings);
      toast.success('Configurações salvas.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do sistema</CardTitle>
          <CardDescription>Valem para todos os clientes da plataforma</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nomeMarca">Nome da marca</Label>
                <Input
                  id="nomeMarca"
                  value={settings.nomeMarca}
                  onChange={(event) => setSettings({ ...settings, nomeMarca: event.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moeda">Moeda padrão</Label>
                <Select
                  id="moeda"
                  value={settings.moeda}
                  onChange={(event) => setSettings({ ...settings, moeda: event.target.value })}
                >
                  <option value="BRL">Real (BRL)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limiteContas">Limite de contas por cliente</Label>
              <Input
                id="limiteContas"
                type="number"
                min={1}
                max={100}
                value={settings.limiteContasPorCliente}
                onChange={(event) =>
                  setSettings({ ...settings, limiteContasPorCliente: Number(event.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aviso">Aviso de manutenção</Label>
              <Input
                id="aviso"
                value={settings.avisoManutencao}
                onChange={(event) => setSettings({ ...settings, avisoManutencao: event.target.value })}
                placeholder="Exibido no topo do painel dos clientes (opcional)"
                maxLength={240}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-500/15 bg-black/35 p-4">
              <input
                type="checkbox"
                checked={settings.permitirCadastroPublico}
                onChange={(event) =>
                  setSettings({ ...settings, permitirCadastroPublico: event.target.checked })
                }
                className="mt-0.5 h-4 w-4 accent-gold-500"
              />
              <span>
                <span className="block text-sm font-medium text-onyx-100">Permitir cadastro público</span>
                <span className="mt-0.5 block text-xs text-onyx-500">
                  Quando desligado, apenas o administrador cria novas contas — recomendado.
                </span>
              </span>
            </label>

            <div className="flex justify-end">
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar configurações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Como o acesso é protegido hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm text-onyx-300">
            <Item icon={<ShieldCheck className="h-4 w-4" />} title="Senhas com PBKDF2-SHA256">
              210.000 iterações e salt aleatório por usuário. Nenhuma senha é armazenada em texto puro.
            </Item>
            <Item icon={<ShieldCheck className="h-4 w-4" />} title="Sessão assinada (HMAC-SHA256)">
              Cookie httpOnly com validade de 8 horas, validado no middleware antes de qualquer rota.
            </Item>
            <Item icon={<ShieldCheck className="h-4 w-4" />} title="Bloqueio por tentativas">
              5 falhas consecutivas suspendem o login daquele usuário/IP por 5 minutos.
            </Item>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persistência</CardTitle>
            <CardDescription>Onde os dados de acesso estão guardados agora</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm text-onyx-300">
            <div className="flex items-center justify-between rounded-xl border border-gold-500/20 bg-gold-500/5 px-3.5 py-3">
              <span className="flex items-center gap-2 text-onyx-200">
                <Database className="h-4 w-4 text-gold-400" />
                Driver em uso
              </span>
              <Badge tone={driver === 'firestore' ? 'success' : 'warning'}>{rotuloDriver[driver]}</Badge>
            </div>

            <Item icon={<Database className="h-4 w-4" />} title="Cloud Firestore">
              Recomendado em produção. Definindo as variáveis do Firebase, o sistema passa a usá-lo
              automaticamente e os cadastros sobrevivem a novos deploys.
            </Item>
            <Item icon={<Database className="h-4 w-4" />} title="Arquivo local .data/store.json">
              Alternativa sem configuração, para desenvolvimento e instância única. Não persiste em
              hospedagem serverless.
            </Item>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Item({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-3.5">
      <p className="flex items-center gap-2 font-medium text-onyx-100">
        <span className="text-gold-400">{icon}</span>
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-onyx-500">{children}</p>
    </div>
  );
}
