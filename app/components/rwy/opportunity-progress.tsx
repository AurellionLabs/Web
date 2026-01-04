'use client';

import { RWYOpportunityStatus, RWYStatusLabels } from '@/domain/rwy';
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
      <div className="flex items-center justify-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <span className="text-red-500 font-medium">Opportunity Cancelled</span>
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
                    'absolute h-0.5 w-full -translate-x-1/2',
                    isCompleted ? 'bg-emerald-500' : 'bg-muted',
                  )}
                  style={{
                    width: 'calc(100% - 2rem)',
                    left: 'calc(-50% + 1rem)',
                  }}
                />
              )}

              {/* Step Circle */}
              <div className="relative flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                ) : isCurrent ? (
                  <div className="relative">
                    <Circle className="h-8 w-8 text-primary fill-primary/20" />
                    <Loader2 className="absolute inset-0 h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <Circle className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center',
                  isCompleted && 'text-emerald-500',
                  isCurrent && 'text-primary',
                  isPending && 'text-muted-foreground',
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
      <div className="flex items-center gap-2 text-red-500">
        <Circle className="h-3 w-3 fill-red-500" />
        <span className="text-xs font-medium">Cancelled</span>
      </div>
    );
  }

  const currentStepIndex = PROGRESS_STEPS.findIndex(
    (step) => step.status === currentStatus,
  );
  const progress = ((currentStepIndex + 1) / PROGRESS_STEPS.length) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{RWYStatusLabels[currentStatus]}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
