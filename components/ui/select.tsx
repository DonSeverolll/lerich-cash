import * as React from 'react';

import { cn } from '@/lib/utils';

/** Select nativo estilizado — leve e acessível por padrão. */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full appearance-none rounded-xl border border-gold-500/20 bg-onyx-950/60 px-3 py-2 text-sm text-onyx-100 outline-none transition focus-visible:border-gold-500/60 focus-visible:ring-2 focus-visible:ring-gold-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
