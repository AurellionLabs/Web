'use client';

import { cn } from '@/lib/utils';
import { CircuitBreaker, CircuitBreakerStatus } from '@/domain/clob/clob';
import { AlertTriangle, ShieldOff, Shield } from 'lucide-react';

/**
 * CircuitBreakerIndicator
 *
 * Displays the live circuit breaker status for a market in the EVA UI style.
 * Three states:
 *  - ACTIVE   → green shield, trading normal
 *  - COOLDOWN → amber warning, cooling down after a trip
 *  - TRIPPED  → red, trading halted
 *
 * If `circuitBreaker` is null (not loaded yet) or `isEnabled` is false, renders nothing.
 */
export interface CircuitBreakerIndicatorProps {
  circuitBreaker: CircuitBreaker | null;
  /** Override for compact inline mode (default: false) */
  compact?: boolean;
  className?: string;
}

interface StatusConfig {
  bg: string;
  text: string;
  bar: string;
  border: string;
  icon: React.ElementType;
  label: string;
  sublabel?: string;
}

function getConfig(
  status: CircuitBreakerStatus,
  tripTimestamp: number,
): StatusConfig {
  const cooldownRemaining =
    status === CircuitBreakerStatus.COOLDOWN
      ? Math.max(
          0,
          Math.ceil((tripTimestamp * 1000 + 3600_000 - Date.now()) / 60_000),
        )
      : null;

  switch (status) {
    case CircuitBreakerStatus.TRIPPED:
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        bar: 'bg-red-500',
        border: 'border-red-500/30',
        icon: ShieldOff,
        label: 'CIRCUIT TRIPPED',
        sublabel: 'Trading halted',
      };
    case CircuitBreakerStatus.COOLDOWN:
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        bar: 'bg-amber-500',
        border: 'border-amber-500/30',
        icon: AlertTriangle,
        label: 'COOLDOWN',
        sublabel:
          cooldownRemaining != null
            ? `~${cooldownRemaining}m remaining`
            : undefined,
      };
    case CircuitBreakerStatus.ACTIVE:
    default:
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        bar: 'bg-emerald-500',
        border: 'border-emerald-500/20',
        icon: Shield,
        label: 'CB ACTIVE',
        sublabel: undefined,
      };
  }
}

export function CircuitBreakerIndicator({
  circuitBreaker,
  compact = false,
  className,
}: CircuitBreakerIndicatorProps) {
  if (!circuitBreaker || !circuitBreaker.isEnabled) return null;

  const cfg = getConfig(circuitBreaker.status, circuitBreaker.tripTimestamp);
  const Icon = cfg.icon;

  if (compact) {
    // Inline badge mode — same clip-path as EvaStatusBadge
    return (
      <div
        className={cn('inline-block', className)}
        style={{
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        }}
        title={cfg.sublabel}
      >
        <div
          className={cn('relative flex items-center gap-2 px-3 py-1.5', cfg.bg)}
        >
          <div className={cn('w-[3px] h-3', cfg.bar)} />
          <Icon className={cn('w-3 h-3', cfg.text)} />
          <span
            className={cn(
              'font-mono text-[10px] tracking-[0.12em] uppercase font-bold',
              cfg.text,
            )}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    );
  }

  // Expanded panel mode
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 border',
        cfg.bg,
        cfg.border,
        className,
      )}
      style={{
        clipPath:
          'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
      }}
    >
      <div className={cn('w-[3px] h-8 flex-shrink-0', cfg.bar)} />
      <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.text)} />
      <div className="min-w-0">
        <p
          className={cn(
            'font-mono text-[10px] tracking-[0.15em] uppercase font-bold',
            cfg.text,
          )}
        >
          {cfg.label}
        </p>
        {cfg.sublabel && (
          <p className="font-mono text-[9px] tracking-[0.1em] text-foreground/40 truncate">
            {cfg.sublabel}
          </p>
        )}
      </div>
      {circuitBreaker.priceChangeThreshold > 0 && (
        <p className="font-mono text-[9px] tracking-[0.1em] text-foreground/30 ml-auto flex-shrink-0">
          ±{(circuitBreaker.priceChangeThreshold / 100).toFixed(1)}%
        </p>
      )}
    </div>
  );
}
