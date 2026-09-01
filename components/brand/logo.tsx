import Image from 'next/image';

import { cn } from '@/lib/utils';

export const BRAND_NAME = 'Lerich Finance';

/** Símbolo (dragão) isolado — usado em ícones, sidebar e avatares da marca. */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/mark-lerich-finance.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority
      className={cn('select-none object-contain', className)}
    />
  );
}

/** Lockup completo: dragão + "LERICH FINANCE". */
export function BrandLockup({ width = 280, className }: { width?: number; className?: string }) {
  return (
    <Image
      src="/logo-lerich-finance.png"
      alt={BRAND_NAME}
      width={width}
      height={Math.round((width * 585) / 869)}
      priority
      className={cn('select-none object-contain', className)}
    />
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
