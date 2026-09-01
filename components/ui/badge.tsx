import * as React from 'react';

import { cn } from '@/lib/utils';

const tones = {
  gold: 'border-gold-500/30 bg-gold-500/10 text-gold-200',
  neutral: 'border-white/10 bg-white/5 text-onyx-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string;
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
