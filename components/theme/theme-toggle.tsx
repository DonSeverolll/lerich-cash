'use client';

import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTema } from '@/components/theme/theme-provider';

/**
 * Botão de acessibilidade para alternar entre o modo noturno (padrão) e o
 * modo claro. O rótulo diz o que vai acontecer, não o estado atual — é o que
 * um leitor de tela precisa anunciar.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { tema, alternar, trocando } = useTema();
  const indoParaClaro = tema === 'escuro';

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={trocando}
      aria-label={indoParaClaro ? 'Mudar para o modo claro' : 'Mudar para o modo noturno'}
      title={indoParaClaro ? 'Modo claro' : 'Modo noturno'}
      className={cn(
        'group inline-flex h-10 items-center gap-2 rounded-xl border border-gold-500/25 bg-onyx-950/40 px-3 text-sm text-onyx-200 transition',
        'hover:border-gold-500/60 hover:text-gold-100 disabled:opacity-60',
        className,
      )}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Sun
          className={cn(
            'absolute h-4 w-4 transition-all duration-300',
            indoParaClaro ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0',
          )}
        />
        <Moon
          className={cn(
            'absolute h-4 w-4 transition-all duration-300',
            indoParaClaro ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
          )}
        />
      </span>
      <span className="hidden sm:inline">{indoParaClaro ? 'Claro' : 'Noturno'}</span>
    </button>
  );
}
