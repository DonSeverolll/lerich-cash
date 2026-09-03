'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Eye, EyeOff, LoaderCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { BrandLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignupForm({ cadastroAberto }: { cadastroAberto: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { redirectTo?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível concluir o cadastro.');
        return;
      }

      toast.success('Conta criada. Bem-vindo ao Lerich Finance.');
      router.replace(data.redirectTo ?? '/dashboard');
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

        <h2 className="text-2xl font-semibold text-onyx-50">Criar minha conta</h2>
        <p className="mt-1 text-sm text-onyx-400">Leva menos de um minuto.</p>

        {!cadastroAberto ? (
          <div className="mt-6 rounded-xl border border-aviso-500/25 bg-aviso-500/10 px-4 py-3.5 text-sm text-aviso-100">
            O cadastro público está desativado no momento. Peça um acesso ao administrador.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                autoComplete="name"
                required
                minLength={2}
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                placeholder="Como você quer ser chamado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="voce@exemplo.com"
              />
              <p className="text-xs text-onyx-500">
                É para este endereço que enviamos a recuperação de senha.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                minLength={3}
                pattern="[a-zA-Z0-9._\-]+"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="seu.usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
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
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {pending ? 'Criando…' : 'Criar conta'}
            </Button>
          </form>
        )}

        <div className="gold-rule my-6" />
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-onyx-400 transition hover:text-gold-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Já tenho conta
        </Link>
      </CardContent>
    </Card>
  );
}
