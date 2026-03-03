'use client';

import { RWYOperatorStats, Address } from '@/domain/rwy';
import { useRWYOperatorStats } from '@/hooks/useRWYOpportunity';
import {
  EvaPanel,
  EvaStatusBadge,
  EvaProgress,
} from '@/app/components/eva/eva-components';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Shield,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { formatErc20Balance } from '@/lib/utils';

interface OperatorReputationProps {
  operatorAddress: Address;
  compact?: boolean;
}

function getReputationLevel(reputation: number): {
  level: string;
  color: string;
  icon: typeof Star;
} {
  if (reputation >= 100)
    return { level: 'Elite', color: 'text-gold', icon: Star };
  if (reputation >= 50)
    return { level: 'Trusted', color: 'text-emerald-400', icon: CheckCircle2 };
  if (reputation >= 20)
    return { level: 'Verified', color: 'text-gold/70', icon: Shield };
  if (reputation >= 5)
    return { level: 'New', color: 'text-foreground/50', icon: TrendingUp };
  return {
    level: 'Unrated',
    color: 'text-foreground/30',
    icon: AlertTriangle,
  };
}

export function OperatorReputation({
  operatorAddress,
  compact = false,
}: OperatorReputationProps) {
  const { stats, loading, error } = useRWYOperatorStats(operatorAddress);

  if (loading) {
    return compact ? (
      <Skeleton className="h-6 w-24" />
    ) : (
      <div
        className="bg-card/60 border border-border/20 p-5"
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        }}
      >
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !stats) {
    return compact ? (
      <EvaStatusBadge status="pending" label="Unknown Operator" />
    ) : (
      <EvaPanel label="Operator" status="warning" accent="crimson">
        <p className="font-mono text-sm tracking-[0.05em] text-gold">
          Unable to load operator information
        </p>
      </EvaPanel>
    );
  }

  const { level, color, icon: Icon } = getReputationLevel(stats.reputation);
  const reputationProgress = Math.min(100, (stats.reputation / 100) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <EvaStatusBadge
          status={stats.reputation >= 50 ? 'active' : 'pending'}
          label={level}
        />
        {stats.approved && (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        )}
      </div>
    );
  }

  return (
    <EvaPanel
      label="Operator Reputation"
      status={stats.approved ? 'active' : 'pending'}
    >
      {/* Approved Badge */}
      {stats.approved && (
        <div className="flex justify-end -mt-1 mb-3">
          <EvaStatusBadge status="active" label="Approved" />
        </div>
      )}

      {/* Reputation Level */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center bg-card/80"
            style={{
              clipPath:
                'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p
              className={`font-mono text-sm font-bold tracking-[0.1em] uppercase ${color}`}
            >
              {level} Operator
            </p>
            <p className="font-mono text-[10px] tracking-[0.1em] text-foreground/35">
              {stats.reputation} reputation points
            </p>
          </div>
        </div>
      </div>

      {/* Reputation Progress */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between font-mono text-[10px] tracking-[0.12em] uppercase text-foreground/40">
          <span>Reputation Score</span>
          <span className="font-bold text-gold">{stats.reputation}/100</span>
        </div>
        <EvaProgress
          value={reputationProgress}
          max={100}
          color="gold"
          segments={20}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div
          className="p-3 bg-background/60 border border-border/20 text-center"
          style={{
            clipPath:
              'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
          }}
        >
          <p className="font-mono text-2xl font-bold text-foreground/80">
            {stats.successfulOps}
          </p>
          <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-foreground/35">
            Successful Operations
          </p>
        </div>
        <div
          className="p-3 bg-background/60 border border-border/20 text-center"
          style={{
            clipPath:
              'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
          }}
        >
          <p className="font-mono text-2xl font-bold text-foreground/80">
            {stats.activeOpportunities}
          </p>
          <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-foreground/35">
            Active Opportunities
          </p>
        </div>
      </div>

      {/* Total Value Processed */}
      <div
        className="p-3 bg-gold/5 border border-gold/15 text-center mb-5"
        style={{
          clipPath:
            'polygon(6px 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0 50%)',
        }}
      >
        <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/40 mb-1">
          Total Value Processed
        </p>
        <p className="font-mono text-lg font-bold text-gold">
          {Number(
            formatErc20Balance(stats.totalValueProcessed, 18),
          ).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          })}
        </p>
      </div>

      {/* Operator Address */}
      <div className="pt-3 border-t border-border/15">
        <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/35">
          Operator Address
        </p>
        <p className="font-mono text-xs truncate text-foreground/50">
          {operatorAddress}
        </p>
      </div>
    </EvaPanel>
  );
}

/**
 * Inline reputation badge for lists
 */
export function OperatorReputationBadge({
  operatorAddress,
}: {
  operatorAddress: Address;
}) {
  const { stats, loading } = useRWYOperatorStats(operatorAddress);

  if (loading) {
    return <Skeleton className="h-5 w-16 inline-block" />;
  }

  if (!stats) {
    return null;
  }

  const { level, color, icon: Icon } = getReputationLevel(stats.reputation);

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] uppercase font-bold ${color}`}
    >
      <Icon className="h-3 w-3" />
      {level}
    </span>
  );
}
