'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/app/components/ui/sheet';
import {
  EvaStatusBadge,
  EvaDataRow,
  EvaScanLine,
  TrapButton,
  GreekKeyStrip,
  HexCluster,
  EvaSystemReadout,
} from '@/app/components/eva/eva-components';
import { UserHolding } from '@/hooks/useUserHoldings';
import { RedemptionDialog } from '@/app/components/redemption/RedemptionDialog';
import { Send, Copy, CheckCircle2 } from 'lucide-react';

interface AssetDetailDrawerProps {
  holding: UserHolding | null;
  isOpen: boolean;
  onClose: () => void;
  onRedemptionSuccess: () => void;
}

export function AssetDetailDrawer({
  holding,
  isOpen,
  onClose,
  onRedemptionSuccess,
}: AssetDetailDrawerProps) {
  const [isRedemptionOpen, setIsRedemptionOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!holding) return null;

  const handleCopyTokenId = async () => {
    await navigator.clipboard.writeText(holding.tokenId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-background border-l border-border/40 p-0 overflow-y-auto"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <EvaSystemReadout
              lines={['AST.DTL', 'HOLDING', 'VIEW']}
              position="right"
            />
            <SheetHeader className="text-left">
              <SheetTitle className="font-mono text-lg tracking-[0.08em] uppercase text-foreground/90">
                {holding.name || 'Asset Details'}
              </SheetTitle>
              <SheetDescription className="font-mono text-xs tracking-[0.12em] uppercase text-foreground/40">
                {holding.assetClass || 'Tokenized Asset'}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-3">
              <GreekKeyStrip color="crimson" />
            </div>
          </div>

          {/* Status + Balance hero */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <EvaStatusBadge
                status="active"
                label={holding.className || 'ACTIVE'}
              />
              <HexCluster size="sm" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-gold tabular-nums">
                {holding.balance.toString()}
              </span>
              <span className="font-mono text-sm text-foreground/30 uppercase tracking-wider">
                units
              </span>
            </div>
          </div>

          <EvaScanLine variant="mixed" />

          {/* Detail rows */}
          <div className="px-6 py-4 space-y-0">
            {/* Token ID — full, with copy */}
            <div className="flex items-center justify-between py-2.5 border-b border-border/10">
              <span className="font-mono text-sm text-foreground/50">
                Token ID
              </span>
              <div className="flex items-center gap-2 max-w-[200px]">
                <span className="font-mono text-sm font-bold text-gold truncate">
                  {holding.tokenId}
                </span>
                <button
                  onClick={handleCopyTokenId}
                  className="flex-shrink-0 p-1 hover:bg-gold/10 rounded transition-colors"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-foreground/30" />
                  )}
                </button>
              </div>
            </div>

            {holding.className && (
              <EvaDataRow
                label="Class"
                value={holding.className}
                valueColor="muted"
              />
            )}

            {holding.assetClass && (
              <EvaDataRow
                label="Asset Type"
                value={holding.assetClass}
                valueColor="muted"
              />
            )}

            <EvaDataRow
              label="Balance"
              value={`${holding.balance.toString()} units`}
              valueColor="gold"
            />

            {holding.originNode && (
              <EvaDataRow
                label="Origin Node"
                value={
                  holding.originNode.length > 16
                    ? `${holding.originNode.slice(0, 8)}...${holding.originNode.slice(-6)}`
                    : holding.originNode
                }
                valueColor="muted"
              />
            )}
          </div>

          {/* Attributes / Metadata */}
          {holding.attributes && holding.attributes.length > 0 && (
            <>
              <EvaScanLine variant="gold" />
              <div className="px-6 py-4">
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-foreground/40 font-bold block mb-3">
                  Metadata
                </span>
                <div className="space-y-0">
                  {holding.attributes.map((attr) => (
                    <EvaDataRow
                      key={attr.name}
                      label={attr.name}
                      value={attr.values.join(', ')}
                      valueColor="muted"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Redeem button — pinned at bottom */}
          <div className="px-6 py-6 mt-auto border-t border-border/20">
            <TrapButton
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => setIsRedemptionOpen(true)}
            >
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Redeem for Delivery
              </span>
            </TrapButton>
          </div>
        </SheetContent>
      </Sheet>

      {/* Redemption Dialog — opens on top of the drawer */}
      <RedemptionDialog
        isOpen={isRedemptionOpen}
        onClose={() => setIsRedemptionOpen(false)}
        holding={holding}
        onSuccess={() => {
          setIsRedemptionOpen(false);
          onClose();
          onRedemptionSuccess();
        }}
      />
    </>
  );
}

export default AssetDetailDrawer;
