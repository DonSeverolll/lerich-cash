import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const tones = {
  gold: 'text-gold-300',
  success: 'text-emerald-300',
  danger: 'text-rose-300',
  neutral: 'text-onyx-200',
} as const;

export interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: keyof typeof tones;
  /** Variação percentual já formatada (ex.: "+12,4%"). */
  trend?: string;
  trendPositive?: boolean;
}

export function StatCard({ title, value, hint, icon, tone = 'neutral', trend, trendPositive = true }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-onyx-500">{title}</p>
          <p
            className={cn(
              'mt-2 whitespace-nowrap font-display font-semibold leading-tight text-onyx-50',
              // Valores longos (ex.: R$ 100.202,50) diminuem em vez de quebrar.
              value.length > 12 ? 'text-lg sm:text-xl' : 'text-2xl',
            )}
          >
            {value}
          </p>
          {trend ? (
            <p className={cn('mt-1 text-xs font-medium', trendPositive ? 'text-emerald-300' : 'text-rose-300')}>
              {trend}
            </p>
          ) : null}
          {hint ? <p className="mt-1 text-xs leading-snug text-onyx-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/20 bg-onyx-950/50',
              tones[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
