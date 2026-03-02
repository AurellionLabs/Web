'use client';

import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

/**
 * MEVProtectionIndicator
 *
 * Shows whether MEV commit-reveal protection is currently required on this market.
 * Reads a simple boolean from the CLOB V2 repository / hook context.
 *
 * When `requiresCommitReveal` is true → amber indicator (commit-reveal mandatory)
 * When false / not applicable → subtle grey (direct order placement)
 * When null (loading) → nothing rendered
 */
export interface MEVProtectionIndicatorProps {
  /** Whether commit-reveal is required on this market */
  requiresCommitReveal: boolean | null;
  /** Minimum reveal delay in blocks */
  minRevealDelay?: number;
  /** Compact inline badge mode */
  compact?: boolean;
  className?: string;
}

export function MEVProtectionIndicator({
  requiresCommitReveal,
  minRevealDelay,
  compact = false,
  className,
}: MEVProtectionIndicatorProps) {
  if (requiresCommitReveal === null) return null;

  const enabled = requiresCommitReveal;

  const bg = enabled ? 'bg-amber-500/10' : 'bg-foreground/5';
  const text = enabled ? 'text-amber-400' : 'text-foreground/30';
  const bar = enabled ? 'bg-amber-500' : 'bg-foreground/20';
  const border = enabled ? 'border-amber-500/25' : 'border-border/20';
  const Icon = enabled ? EyeOff : Eye;
  const label = enabled ? 'MEV PROTECTED' : 'DIRECT ORDER';
  const sublabel = enabled
    ? minRevealDelay != null
      ? `Reveal after ${minRevealDelay} block${minRevealDelay !== 1 ? 's' : ''}`
      : 'Commit-reveal required'
    : undefined;

  if (compact) {
    return (
      <div
        className={cn('inline-block', className)}
        style={{
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        }}
        title={sublabel}
      >
        <div className={cn('relative flex items-center gap-2 px-3 py-1.5', bg)}>
          <div className={cn('w-[3px] h-3', bar)} />
          <Icon className={cn('w-3 h-3', text)} />
          <span
            className={cn(
              'font-mono text-[10px] tracking-[0.12em] uppercase font-bold',
              text,
            )}
          >
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 border',
        bg,
        border,
        className,
      )}
      style={{
        clipPath:
          'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
      }}
    >
      <div className={cn('w-[3px] h-8 flex-shrink-0', bar)} />
      <Icon className={cn('w-4 h-4 flex-shrink-0', text)} />
      <div className="min-w-0">
        <p
          className={cn(
            'font-mono text-[10px] tracking-[0.15em] uppercase font-bold',
            text,
          )}
        >
          {label}
        </p>
        {sublabel && (
          <p className="font-mono text-[9px] tracking-[0.1em] text-foreground/40 truncate">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
