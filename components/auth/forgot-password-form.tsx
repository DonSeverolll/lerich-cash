'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, Mail, Send } from 'lucide-react';

import { BrandLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Etapa = 'identificar' | 'confirmar' | 'enviado';

interface Confirmacao {
  emailMascarado: string;
  nome: string;
  ticket: string;
}

export function ForgotPasswordForm() {
  const [etapa, setEtapa] = useState<Etapa>('identificar');
  const [identifier, setIdentifier] = useState('');
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [provedorConfigurado, setProvedorConfigurado] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscarConta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = (await response.json()) as Partial<Confirmacao> & { error?: string };

      if (!response.ok || !data.ticket || !data.emailMascarado) {
        setError(data.error ?? 'Não foi possível localizar a conta.');
        return;
      }

      setConfirmacao({
        emailMascarado: data.emailMascarado,
        nome: data.nome ?? '',
        ticket: data.ticket,
      });
      setEtapa('confirmar');
    } catch {
      setError('Falha de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  async function enviarLink() {
    if (!confirmacao) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: confirmacao.ticket }),
      });
      const data = (await response.json()) as { ok?: boolean; provedorConfigurado?: boolean; error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível enviar o e-mail.');
        return;
      }

      setProvedorConfigurado(data.provedorConfigurado !== false);
      setEtapa('enviado');
    } catch {
      setError('Falha de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  function recomecar() {
    setEtapa('identificar');
    setConfirmacao(null);
    setError(null);
  }

  return (
    <Card className="animate-fade-up border-gold-500/20 bg-onyx-950/70 backdrop-blur">
      <CardContent className="p-7">
        <div className="mb-7 lg:hidden">
          <BrandLockup width={190} />
        </div>

        {etapa === 'identificar' ? (
          <>
            <h2 className="text-2xl font-semibold text-onyx-50">Esqueci minha senha</h2>
            <p className="mt-1 text-sm text-onyx-400">
              Informe seu usuário ou e-mail. Vamos confirmar a conta antes de enviar o link.
            </p>

            <form onSubmit={buscarConta} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier">Usuário ou e-mail</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="seu.usuario"
                />
              </div>

              {error ? <Erro mensagem={error} /> : null}

              <Button type="submit" disabled={pending} className="w-full gap-2">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {pending ? 'Procurando…' : 'Continuar'}
              </Button>
            </form>
          </>
        ) : null}

        {etapa === 'confirmar' && confirmacao ? (
          <>
            <h2 className="text-2xl font-semibold text-onyx-50">
              {confirmacao.nome ? `É você, ${confirmacao.nome}?` : 'Confirme sua conta'}
            </h2>
            <p className="mt-1 text-sm text-onyx-400">
              Vamos enviar o link de recuperação para o e-mail cadastrado. Confira se o começo do
              endereço bate com o seu.
            </p>

            <div className="mt-6 rounded-2xl border border-gold-500/25 bg-gold-500/5 px-4 py-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold-500/80">E-mail cadastrado</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-wide text-gold-100">
                {confirmacao.emailMascarado}
              </p>
              <p className="mt-2 text-xs text-onyx-500">
                Exibimos apenas parte do endereço por segurança.
              </p>
            </div>

            {error ? <div className="mt-5"><Erro mensagem={error} /></div> : null}

            <div className="mt-6 space-y-3">
              <Button onClick={enviarLink} disabled={pending} className="w-full gap-2">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {pending ? 'Enviando…' : 'Sim, enviar o link'}
              </Button>
              <Button variant="subtle" onClick={recomecar} disabled={pending} className="w-full">
                Não é meu e-mail
              </Button>
            </div>
          </>
        ) : null}

        {etapa === 'enviado' && confirmacao ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-onyx-50">Link enviado</h2>
            <p className="mt-2 text-sm leading-relaxed text-onyx-400">
              Enviamos as instruções para{' '}
              <strong className="text-gold-100">{confirmacao.emailMascarado}</strong>. O link vale por 1
              hora e só pode ser usado uma vez.
            </p>
            <p className="mt-3 text-sm text-onyx-500">
              Não chegou? Confira a caixa de spam antes de pedir outro.
            </p>

            {!provedorConfigurado ? (
              <p className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100">
                Ambiente sem provedor de e-mail configurado: o link foi gravado no log do servidor em
                vez de enviado. Defina <code>RESEND_API_KEY</code> para o envio real.
              </p>
            ) : null}

            <div className="mt-6">
              <Button variant="subtle" onClick={recomecar} className="w-full">
                Enviar para outra conta
              </Button>
            </div>
          </>
        ) : null}

        <div className="gold-rule my-6" />
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-onyx-400 transition hover:text-gold-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o acesso
        </Link>
      </CardContent>
    </Card>
  );
}

function Erro({ mensagem }: { mensagem: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {mensagem}
    </p>
  );
}
