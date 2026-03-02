'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
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
import { useAssetCustody } from '@/hooks/useAssetCustody';
import { RedemptionDialog } from '@/app/components/redemption/RedemptionDialog';
import { Send, Copy, CheckCircle2, Loader2, Warehouse } from 'lucide-react';

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
  const { address } = useAccount();
  const [isRedemptionOpen, setIsRedemptionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const custody = useAssetCustody(
    holding?.tokenId,
    address,
    holding?.balance ?? 0n,
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  if (!holding) return null;

  const handleCopyTokenId = async () => {
    try {
      await navigator.clipboard.writeText(holding.tokenId);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = holding.tokenId;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
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
                  aria-label="Copy token ID"
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

          {/* Custody Breakdown */}
          <EvaScanLine variant="mixed" />
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Warehouse className="w-3.5 h-3.5 text-foreground/40" />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-foreground/40 font-bold">
                Custody Breakdown
              </span>
              {custody.isLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-foreground/30 ml-auto" />
              )}
            </div>

            {custody.error ? (
              <p className="font-mono text-xs text-red-400/70">
                {custody.error}
              </p>
            ) : custody.isLoading ? (
              <div className="space-y-0">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-8 bg-foreground/5 rounded animate-pulse mb-1"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {/* In-wallet */}
                <EvaDataRow
                  label="In Wallet"
                  value={`${custody.inWallet.toString()} units`}
                  valueColor={custody.inWallet > 0n ? 'gold' : 'muted'}
                />
                {/* Per-node custody */}
                {custody.nodes.map((entry) => (
                  <EvaDataRow
                    key={entry.nodeAddress}
                    label={
                      entry.nodeLocation.length > 22
                        ? `${entry.nodeLocation.slice(0, 10)}...${entry.nodeLocation.slice(-8)}`
                        : entry.nodeLocation
                    }
                    value={`${entry.amount.toString()} units`}
                    valueColor="muted"
                  />
                ))}
                {custody.nodes.length === 0 && custody.inWallet === 0n && (
                  <p className="font-mono text-xs text-foreground/30">
                    No custody data available
                  </p>
                )}
              </div>
            )}
          </div>

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
