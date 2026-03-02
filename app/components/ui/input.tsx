import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative group">
        <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors" />
        <input
          type={type}
          className={cn(
            'flex h-10 w-full border border-border/40 bg-background/80 px-4 py-2 text-base font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground/25 focus-visible:outline-none focus-visible:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors',
            className,
          )}
          ref={ref}
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          }}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
