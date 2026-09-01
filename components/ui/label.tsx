import * as React from 'react';

import { cn } from '@/lib/utils';

const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<'label'>>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('block text-xs font-medium uppercase tracking-[0.14em] text-onyx-400', className)}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
