'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';

import { BrandLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm({ token, nome }: { token: string; nome: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (senha !== confirmacao) {
      setError('A confirmação não coincide com a nova senha.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível redefinir a senha.');
        return;
      }

      toast.success('Senha redefinida. Entre com a nova senha.');
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Falha de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="animate-fade-up border-gold-500/20 bg-onyx-950/70 backdrop-blur">
      <CardContent className="p-7">
        <div className="mb-7 lg:hidden">
          <BrandLockup width={190} />
        </div>

        <h2 className="text-2xl font-semibold text-onyx-50">Nova senha</h2>
        <p className="mt-1 text-sm text-onyx-400">
          {nome ? `Olá, ${nome}. ` : ''}Escolha a senha que você vai usar a partir de agora.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                data-dica={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-onyx-400 transition hover:text-gold-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmacao">Confirmar nova senha</Label>
            <Input
              id="confirmacao"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full gap-2">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {pending ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>

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
