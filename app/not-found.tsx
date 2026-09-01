import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-gold-500/80">Erro 404</p>
      <h1 className="mt-3 font-display text-5xl font-semibold text-gold-gradient">Página não encontrada</h1>
      <p className="mt-4 max-w-md text-onyx-400">
        O endereço acessado não existe ou foi movido. Volte ao painel para continuar.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
