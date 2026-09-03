import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-onyx-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-acento-de to-acento-para text-acento shadow-gold hover:from-acento-de/85 hover:to-acento-para/85',
        outline: 'border border-gold-500/30 bg-onyx-950/40 text-gold-100 hover:border-gold-500/60 hover:bg-gold-500/10',
        ghost: 'text-onyx-200 hover:bg-onyx-50/5 hover:text-gold-100',
        subtle: 'border border-onyx-50/10 bg-onyx-50/5 text-onyx-100 hover:bg-onyx-50/10',
        destructive: 'border border-rose-500/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
