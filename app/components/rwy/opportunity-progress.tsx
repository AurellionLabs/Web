'use client';

import { RWYOpportunityStatus, RWYStatusLabels } from '@/domain/rwy';
import { EvaProgress } from '@/app/components/eva/eva-components';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpportunityProgressProps {
  currentStatus: RWYOpportunityStatus;
}

const PROGRESS_STEPS = [
  { status: RWYOpportunityStatus.FUNDING, label: 'Funding' },
  { status: RWYOpportunityStatus.FUNDED, label: 'Funded' },
  { status: RWYOpportunityStatus.IN_TRANSIT, label: 'In Transit' },
  { status: RWYOpportunityStatus.PROCESSING, label: 'Processing' },
  { status: RWYOpportunityStatus.SELLING, label: 'Selling' },
  { status: RWYOpportunityStatus.DISTRIBUTING, label: 'Distributing' },
  { status: RWYOpportunityStatus.COMPLETED, label: 'Completed' },
];

export function OpportunityProgress({
  currentStatus,
}: OpportunityProgressProps) {
  // Handle cancelled status separately
  if (currentStatus === RWYOpportunityStatus.CANCELLED) {
    return (
      <div
        className="flex items-center justify-center p-4 bg-crimson/10 border border-crimson/30"
        style={{
          clipPath:
            'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
        }}
      >
        <span className="font-mono text-sm font-bold tracking-[0.15em] uppercase text-crimson">
          Opportunity Cancelled
        </span>
      </div>
    );
  }

  const currentStepIndex = PROGRESS_STEPS.findIndex(
    (step) => step.status === currentStatus,
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {PROGRESS_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.status}
              className="flex flex-col items-center flex-1"
            >
              {/* Connector Line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute h-[2px] w-full -translate-x-1/2',
                    isCompleted ? 'bg-emerald-500' : 'bg-border/20',
                  )}
                  style={{
                    width: 'calc(100% - 2rem)',
                    left: 'calc(-50% + 1rem)',
                  }}
                />
              )}

              {/* Step Circle — sharp hexagonal feel */}
              <div className="relative flex items-center justify-center">
                {isCompleted ? (
                  <div
                    className="w-8 h-8 flex items-center justify-center bg-emerald-500/15"
                    style={{
                      clipPath:
                        'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                ) : isCurrent ? (
                  <div className="relative">
                    <div
                      className="w-8 h-8 flex items-center justify-center bg-gold/15"
                      style={{
                        clipPath:
                          'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      }}
                    >
                      <Loader2 className="h-5 w-5 text-gold animate-spin" />
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 flex items-center justify-center bg-foreground/5"
                    style={{
                      clipPath:
                        'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                  >
                    <Circle className="h-4 w-4 text-foreground/20" />
                  </div>
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  'mt-2 font-mono text-[10px] tracking-[0.12em] uppercase font-bold text-center',
                  isCompleted && 'text-emerald-400',
                  isCurrent && 'text-gold',
                  isPending && 'text-foreground/30',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact version for cards
 */
export function OpportunityProgressCompact({
  currentStatus,
}: OpportunityProgressProps) {
  if (currentStatus === RWYOpportunityStatus.CANCELLED) {
    return (
      <div className="flex items-center gap-2 text-crimson">
        <Circle className="h-3 w-3 fill-crimson" />
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase font-bold">
          Cancelled
        </span>
      </div>
    );
  }

  const currentStepIndex = PROGRESS_STEPS.findIndex(
    (step) => step.status === currentStatus,
  );
  const progress = ((currentStepIndex + 1) / PROGRESS_STEPS.length) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono text-[10px] tracking-[0.12em] uppercase">
        <span className="text-foreground/40">Progress</span>
        <span className="font-bold text-gold">
          {RWYStatusLabels[currentStatus]}
        </span>
      </div>
      <EvaProgress value={progress} max={100} color="emerald" segments={14} />
    </div>
  );
}
