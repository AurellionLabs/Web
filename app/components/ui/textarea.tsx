import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <div className="relative group">
      <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors" />
      <textarea
        className={cn(
          'flex min-h-[80px] w-full border border-border/40 bg-background/80 px-4 py-3 font-mono text-base text-foreground/80 ring-offset-background placeholder:text-foreground/25 focus-visible:outline-none focus-visible:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors resize-none',
          className,
        )}
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
        ref={ref}
        {...props}
      />
    </div>
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
