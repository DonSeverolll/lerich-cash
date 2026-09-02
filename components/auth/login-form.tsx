'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { BrandLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `searchParams.get` devolve null; omitimos o campo nesse caso.
        body: JSON.stringify({ username, password, next: next ?? undefined }),
      });

      const data = (await response.json()) as { redirectTo?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível entrar.');
        return;
      }

      toast.success('Bem-vindo de volta.');
      router.replace(data.redirectTo ?? '/dashboard');
      router.refresh();
    } catch {
      setError('Falha de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="animate-fade-up border-gold-500/20 bg-black/70 backdrop-blur">
      <CardContent className="p-7">
        <div className="mb-7 lg:hidden">
          <BrandLockup width={190} />
        </div>

        <h2 className="text-2xl font-semibold text-onyx-50">Acesso ao painel</h2>
        <p className="mt-1 text-sm text-onyx-400">Entre com suas credenciais para continuar.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="seu.usuario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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

          <div className="space-y-3">
            <Button type="submit" disabled={pending} className="w-full gap-2">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {pending ? 'Verificando…' : 'Entrar'}
            </Button>

            <div className="flex justify-center">
              <Link
                href="/recuperar-senha"
                className="rounded-lg px-2 py-1 text-sm text-onyx-400 underline-offset-4 transition hover:text-gold-200 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/40" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-onyx-500">ou</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/40" />
        </div>

        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/cadastro">
            <UserPlus className="h-4 w-4" />
            Criar minha conta
          </Link>
        </Button>

        <p className="mt-6 text-xs leading-relaxed text-onyx-500">
          Cada acesso é registrado na auditoria. Após 5 tentativas incorretas o usuário é bloqueado
          temporariamente.
        </p>
      </CardContent>
    </Card>
  );
}
