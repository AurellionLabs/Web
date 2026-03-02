'use client';

import { TrapButton } from '@/app/components/eva/eva-components';
import { AlertTriangle } from 'lucide-react';

interface PendingSettlementBannerProps {
  count: number;
  onAction: () => void;
}

export function PendingSettlementBanner({
  count,
  onAction,
}: PendingSettlementBannerProps) {
  if (count === 0) return null;

  return (
    <div
      className="relative border border-amber-500/40 bg-amber-500/[0.06] p-4"
      style={{
        clipPath:
          'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      }}
    >
      <div className="absolute left-0 top-0 bottom-3 w-[3px] bg-amber-500/50" />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-mono text-sm font-bold text-amber-300 tracking-wide">
              {count} Pending Settlement Decision{count > 1 ? 's' : ''}
            </p>
            <p className="font-mono text-[10px] text-amber-400/60 tracking-[0.1em] uppercase mt-0.5">
              Choose where to send your settled tokens
            </p>
          </div>
        </div>
        <TrapButton variant="gold" size="sm" onClick={onAction}>
          Resolve Now
        </TrapButton>
      </div>
    </div>
  );
}
