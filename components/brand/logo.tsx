import type { CSSProperties } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

export const BRAND_NAME = 'Lerich Finance';

/**
 * Posição da pupila em cada arquivo, medida sobre a imagem original.
 * O símbolo é quadrado (328×328) e o lockup é largo (869×585), então o olho
 * cai em pontos diferentes — e o brilho precisa de tamanhos diferentes para
 * cobrir a mesma área física.
 */
const OLHO_MARCA = { '--eye-x': '80.1%', '--eye-y': '17.2%', '--eye-size': '30%' } as CSSProperties;
const OLHO_LOCKUP = { '--eye-x': '64.3%', '--eye-y': '12.1%', '--eye-size': '13%' } as CSSProperties;

/*
  Cada marca tem duas artes: a dourada, para o fundo escuro, e a prateada, para
  o fundo claro — no claro o dourado desbota e a palavra "LERICH", que é branca
  na arte original, desapareceria. As duas ficam no HTML e o CSS mostra a certa
  conforme `data-tema`; assim a troca é instantânea e a marca continua sendo um
  componente de servidor.
*/

export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('brand-logo', className)} style={{ width: size, height: size }}>
      <Image
        src="/mark-lerich-finance.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority
        className="brand-arte brand-arte--escuro select-none object-contain"
      />
      <Image
        src="/mark-lerich-finance-claro.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority
        className="brand-arte brand-arte--claro select-none object-contain"
      />
      <span className="brand-eye" style={OLHO_MARCA} aria-hidden />
    </span>
  );
}

/** Lockup completo: dragão + "LERICH FINANCE". */
export function BrandLockup({ width = 280, className }: { width?: number; className?: string }) {
  const height = Math.round((width * 585) / 869);

  return (
    <span className={cn('brand-logo', className)} style={{ width, height }}>
      <Image
        src="/logo-lerich-finance.png"
        alt={BRAND_NAME}
        width={width}
        height={height}
        priority
        className="brand-arte brand-arte--escuro select-none object-contain"
      />
      <Image
        src="/logo-lerich-finance-claro.png"
        alt=""
        aria-hidden
        width={width}
        height={height}
        priority
        className="brand-arte brand-arte--claro select-none object-contain"
      />
      <span className="brand-eye" style={OLHO_LOCKUP} aria-hidden />
    </span>
  );
}

/** Wordmark tipográfico, para quando só o texto cabe. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-lg font-semibold leading-tight tracking-wide', className)}>
      <span className="text-onyx-50">LERICH </span>
      <span className="text-gold-gradient">FINANCE</span>
    </span>
  );
}
