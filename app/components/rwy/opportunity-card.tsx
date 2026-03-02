'use client';

import {
  RWYOpportunityWithDynamicData,
  RWYStatusLabels,
  RWYOpportunityStatus,
  formatTimeRemaining,
} from '@/domain/rwy';
import {
  EvaPanel,
  EvaStatusBadge,
  EvaProgress,
  TrapButton,
} from '@/app/components/eva/eva-components';
import { Clock, Users, TrendingUp, Coins, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface OpportunityCardProps {
  opportunity: RWYOpportunityWithDynamicData;
  showActions?: boolean;
}

/** Map RWY status to EvaStatusBadge status */
function mapToEvaStatus(
  status: RWYOpportunityStatus,
): 'active' | 'pending' | 'processing' | 'completed' | 'created' {
  switch (status) {
    case RWYOpportunityStatus.FUNDING:
      return 'active';
    case RWYOpportunityStatus.FUNDED:
      return 'pending';
    case RWYOpportunityStatus.IN_TRANSIT:
    case RWYOpportunityStatus.PROCESSING:
    case RWYOpportunityStatus.SELLING:
    case RWYOpportunityStatus.DISTRIBUTING:
      return 'processing';
    case RWYOpportunityStatus.COMPLETED:
      return 'completed';
    case RWYOpportunityStatus.CANCELLED:
      return 'pending';
    default:
      return 'created';
  }
}

export function OpportunityCard({
  opportunity,
  showActions = true,
}: OpportunityCardProps) {
  const statusLabel = RWYStatusLabels[opportunity.status];
  const isActive = opportunity.status === RWYOpportunityStatus.FUNDING;
  const evaStatus = mapToEvaStatus(opportunity.status);

  return (
    <EvaPanel
      label={opportunity.name}
      sublabel={opportunity.description}
      status={isActive ? 'active' : 'pending'}
      className="group hover:border-gold/20 transition-all duration-300"
    >
      {/* Status Badge */}
      <div className="flex justify-end mb-4 -mt-1">
        <EvaStatusBadge status={evaStatus} label={statusLabel} />
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-5">
        <div className="flex justify-between font-mono text-xs tracking-[0.1em]">
          <span className="text-foreground/40 uppercase">Funding Progress</span>
          <span className="font-bold text-gold">
            {opportunity.formattedProgress}
          </span>
        </div>
        <EvaProgress
          value={opportunity.fundingProgress}
          max={100}
          color="gold"
          segments={20}
        />
        <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] text-foreground/35 uppercase">
          <span>{opportunity.formattedTVL} raised</span>
          <span>{opportunity.formattedGoal} goal</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div
          className="flex items-center gap-2 p-2 bg-background/60 border border-border/20"
          style={{
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}
        >
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/40">
              Yield
            </p>
            <p className="font-mono text-sm font-bold text-emerald-400">
              {opportunity.formattedYield}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-2 bg-background/60 border border-border/20"
          style={{
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}
        >
          <Clock className="h-4 w-4 text-gold" />
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/40">
              Time Left
            </p>
            <p className="font-mono text-sm font-bold text-gold">
              {isActive
                ? formatTimeRemaining(opportunity.timeToFundingDeadline)
                : 'N/A'}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-2 bg-background/60 border border-border/20"
          style={{
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}
        >
          <Users className="h-4 w-4 text-foreground/50" />
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/40">
              Stakers
            </p>
            <p className="font-mono text-sm font-bold text-foreground/80">
              {opportunity.stakerCount}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-2 bg-background/60 border border-border/20"
          style={{
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}
        >
          <Coins className="h-4 w-4 text-gold" />
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/40">
              Est. APY
            </p>
            <p className="font-mono text-sm font-bold text-gold">
              {opportunity.estimatedAPY.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Input/Output Info */}
      <div
        className="flex items-center justify-between font-mono text-sm p-3 bg-background/60 border border-border/20 mb-5"
        style={{
          clipPath:
            'polygon(6px 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0 50%)',
        }}
      >
        <div className="text-center">
          <p className="text-[9px] tracking-[0.15em] uppercase text-foreground/40">
            Input
          </p>
          <p className="font-bold text-foreground/80">
            {opportunity.inputTokenName || 'Commodity'}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-gold/50" />
        <div className="text-center">
          <p className="text-[9px] tracking-[0.15em] uppercase text-foreground/40">
            Output
          </p>
          <p className="font-bold text-foreground/80">
            {opportunity.outputTokenName || 'Processed'}
          </p>
        </div>
      </div>

      {showActions && (
        <Link href={`/customer/rwy/${opportunity.id}`} className="block">
          <TrapButton
            variant={isActive ? 'gold' : 'emerald'}
            className="w-full text-center"
            size="default"
          >
            {isActive ? 'Stake Now' : 'View Details'}
            <ArrowRight className="ml-2 h-4 w-4 inline-block" />
          </TrapButton>
        </Link>
      )}
    </EvaPanel>
  );
}

/**
 * Skeleton loader for opportunity card
 */
export function OpportunityCardSkeleton() {
  return (
    <div
      className="animate-pulse bg-card/60 border border-border/20"
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
      }}
    >
      <div className="p-5 border-b border-border/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-foreground/8 w-3/4" />
            <div className="h-4 bg-foreground/8 w-full" />
          </div>
          <div className="h-6 w-20 bg-foreground/8" />
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-foreground/8 w-24" />
            <div className="h-4 bg-foreground/8 w-12" />
          </div>
          <div className="flex gap-[2px]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-2 flex-1 bg-foreground/8" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-foreground/8" />
          ))}
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="h-10 bg-foreground/8" />
      </div>
    </div>
  );
}
