import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';

/** Estado vazio padrão: ícone, explicação curta e a ação que resolve. */
export function EmptyState({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
          {icone}
        </span>
        <h3 className="mt-1 text-lg font-semibold text-onyx-50">{titulo}</h3>
        <p className="max-w-sm text-sm leading-relaxed text-onyx-400">{descricao}</p>
        {acao ? <div className="mt-3">{acao}</div> : null}
      </CardContent>
    </Card>
  );
}
