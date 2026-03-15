'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useAssetCustody, CustodyEntry } from '@/hooks/useAssetCustody';
import { RedemptionDialog } from '@/app/components/redemption/RedemptionDialog';
import {
  Send,
  Copy,
  CheckCircle2,
  Loader2,
  Warehouse,
  MapPin,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [selectedNode, setSelectedNode] = useState<CustodyEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const custody = useAssetCustody(holding?.tokenId);

  // Reset node selection when drawer closes or holding changes
  useEffect(() => {
    if (!isOpen) setSelectedNode(null);
  }, [isOpen]);

  useEffect(() => {
    setSelectedNode(null);
  }, [holding?.tokenId]);

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

  // The holding passed to redemption — augmented with the selected custodian
  // wallet plus the node hash used for route lookup.
  const holdingForRedemption: UserHolding = selectedNode
    ? {
        ...holding,
        originNode: selectedNode.nodeAddress,
        originCustodianAddress: selectedNode.nodeAddress,
        originNodeHash: selectedNode.nodeHash,
      }
    : holding;

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
          </div>

          {/* Custody Breakdown + Node Selection */}
          <EvaScanLine variant="gold" />
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Warehouse className="w-3.5 h-3.5 text-foreground/40" />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-foreground/40 font-bold">
                Custody &amp; Location
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
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-foreground/5 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Node rows — selectable for redemption */}
                {custody.nodes.map((entry) => {
                  // Use nodeHash as unique identifier - nodeAddress (owner wallet)
                  // is the same for all nodes, so we need nodeHash to differentiate
                  const uniqueKey = entry.nodeHash || entry.nodeLocation;
                  const isSelected =
                    selectedNode?.nodeHash === entry.nodeHash ||
                    (entry.nodeHash === undefined &&
                      selectedNode?.nodeLocation === entry.nodeLocation);
                  return (
                    <button
                      key={uniqueKey}
                      onClick={() => setSelectedNode(isSelected ? null : entry)}
                      className={cn(
                        'w-full flex items-center justify-between py-2 px-3 rounded border transition-all text-left',
                        isSelected
                          ? 'border-gold/50 bg-gold/[0.06]'
                          : 'border-border/20 bg-foreground/[0.02] hover:border-border/40',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin
                          className={cn(
                            'w-3.5 h-3.5 flex-shrink-0',
                            isSelected ? 'text-gold' : 'text-foreground/40',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-foreground/80 truncate">
                            {entry.nodeLocation}
                          </p>
                          <p className="font-mono text-[10px] text-foreground/30 truncate">
                            {`${entry.nodeAddress.slice(0, 6)}...${entry.nodeAddress.slice(-4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={cn(
                            'font-mono text-xs font-bold',
                            isSelected ? 'text-gold' : 'text-foreground/60',
                          )}
                        >
                          {entry.amount.toString()} units
                        </span>
                        <ChevronRight
                          className={cn(
                            'w-3 h-3 transition-transform',
                            isSelected
                              ? 'text-gold rotate-90'
                              : 'text-foreground/20',
                          )}
                        />
                      </div>
                    </button>
                  );
                })}

                {/* No custodian info */}
                {!custody.hasAnyCustodian && (
                  <div className="flex items-center gap-2 py-2 px-3 rounded border border-border/20 bg-foreground/[0.02]">
                    <Info className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0" />
                    <span className="font-mono text-xs text-foreground/40">
                      No node custodian recorded — redemption unavailable
                    </span>
                  </div>
                )}

                {/* Selection hint */}
                {custody.hasAnyCustodian && (
                  <p className="font-mono text-[10px] text-foreground/30 tracking-wide pt-1">
                    {selectedNode
                      ? `Redeeming from: ${selectedNode.nodeLocation}`
                      : 'Select a node to redeem from'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Attributes / Metadata */}
          {holding.attributes && holding.attributes.length > 0 && (
            <>
              <EvaScanLine variant="mixed" />
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

          {/* Redeem button */}
          <div className="px-6 py-6 mt-auto border-t border-border/20">
            <TrapButton
              variant="gold"
              size="lg"
              className="w-full"
              disabled={
                custody.isLoading || !custody.hasAnyCustodian || !selectedNode
              }
              onClick={() => setIsRedemptionOpen(true)}
            >
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {selectedNode
                  ? `Redeem from ${selectedNode.nodeLocation.split(',')[0]}`
                  : 'Redeem for Delivery'}
              </span>
            </TrapButton>
            {!custody.hasAnyCustodian && !custody.isLoading && (
              <p className="font-mono text-[10px] text-center text-foreground/30 mt-2 tracking-wide">
                No custodian recorded — redemption unavailable
              </p>
            )}
            {custody.hasAnyCustodian && !selectedNode && (
              <p className="font-mono text-[10px] text-center text-foreground/30 mt-2 tracking-wide">
                Select a custody node above to redeem
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Redemption Dialog */}
      <RedemptionDialog
        isOpen={isRedemptionOpen}
        onClose={() => setIsRedemptionOpen(false)}
        holding={holdingForRedemption}
        onSuccess={() => {
          setIsRedemptionOpen(false);
          onClose();
          onRedemptionSuccess();
        }}
      />
    </>
  );
}
