import * as React from 'react';

import { cn } from '@/lib/utils';

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200', className)}>{children}</span>;
}
