'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-gold-500/80">Algo saiu do trilho</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-gold-gradient">Erro inesperado</h1>
      <p className="mt-4 max-w-md text-onyx-400">
        Não conseguimos carregar esta seção. Tente novamente — se persistir, verifique os logs do servidor.
      </p>
      <Button className="mt-8 gap-2" onClick={reset}>
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </main>
  );
}
