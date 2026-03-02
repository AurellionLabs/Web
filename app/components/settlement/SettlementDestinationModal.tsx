'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  TrapButton,
  EvaStatusBadge,
  EvaScanLine,
} from '@/app/components/eva/eva-components';
import { useNodes } from '@/app/providers/nodes.provider';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';
import { AlertTriangle, Flame, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';

interface SettlementDestinationModalProps {
  isOpen: boolean;
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type DestinationChoice = 'node' | 'new-node' | 'burn';

export function SettlementDestinationModal({
  isOpen,
  orderId,
  onClose,
  onSuccess,
}: SettlementDestinationModalProps) {
  const router = useRouter();
  const { nodes } = useNodes();
  const { selectDestination } = useSettlementDestination();

  const [choice, setChoice] = useState<DestinationChoice>('node');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [burnConfirmed, setBurnConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit =
    (choice === 'node' && selectedNodeId !== null) ||
    (choice === 'burn' && burnConfirmed);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (choice === 'burn') {
        await selectDestination(orderId, null, true);
      } else if (choice === 'node' && selectedNodeId) {
        await selectDestination(orderId, selectedNodeId, false);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settlement Destination</DialogTitle>
          <DialogDescription>
            Choose where to send your settled tokens
          </DialogDescription>
        </DialogHeader>

        <EvaScanLine variant="mixed" />

        {/* Order info */}
        <div className="font-mono text-xs text-foreground/40">
          <span>Order: {orderId.slice(0, 10)}...</span>
        </div>

        {/* Options */}
        <div className="space-y-3 mt-2">
          {/* Option 1: Send to existing node */}
          <label
            className={`block cursor-pointer border p-3 transition-colors ${
              choice === 'node'
                ? 'border-gold/60 bg-gold/[0.05]'
                : 'border-glass-border hover:border-foreground/20'
            }`}
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="destination"
                checked={choice === 'node'}
                onChange={() => {
                  setChoice('node');
                  setBurnConfirmed(false);
                }}
                className="accent-gold"
              />
              <MapPin className="w-4 h-4 text-gold" />
              <div>
                <span className="font-mono text-sm font-bold text-foreground/90">
                  Send to Node
                </span>
                <span className="block font-mono text-[10px] text-foreground/40">
                  Transfer tokens to a node you own
                </span>
              </div>
            </div>

            {choice === 'node' && (
              <div className="mt-3 ml-7 space-y-2">
                {nodes.length === 0 ? (
                  <p className="font-mono text-xs text-foreground/30">
                    No nodes registered.{' '}
                    <Link
                      href="/node/register"
                      className="text-gold underline hover:text-gold/80"
                    >
                      Register one first
                    </Link>
                  </p>
                ) : (
                  nodes.map((node) => (
                    <label
                      key={node.address}
                      className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${
                        selectedNodeId === node.address
                          ? 'border-gold/50 bg-gold/[0.08]'
                          : 'border-glass-border hover:border-foreground/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nodeSelect"
                        checked={selectedNodeId === node.address}
                        onChange={() => setSelectedNodeId(node.address)}
                        className="accent-gold"
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-foreground/80 block truncate">
                          {node.location?.addressName ||
                            node.address.slice(0, 16) + '...'}
                        </span>
                        <span className="font-mono text-[10px] text-foreground/30 block truncate">
                          {node.address.slice(0, 10)}...
                          {node.address.slice(-6)}
                        </span>
                      </div>
                      <EvaStatusBadge
                        status={node.status === 'Active' ? 'active' : 'created'}
                        label={node.status}
                      />
                    </label>
                  ))
                )}
              </div>
            )}
          </label>

          {/* Option 2: Create new node (informational) */}
          <label
            className={`block cursor-pointer border p-3 transition-colors ${
              choice === 'new-node'
                ? 'border-gold/60 bg-gold/[0.05]'
                : 'border-glass-border hover:border-foreground/20'
            }`}
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="destination"
                checked={choice === 'new-node'}
                onChange={() => {
                  setChoice('new-node');
                  setBurnConfirmed(false);
                  setSelectedNodeId(null);
                }}
                className="accent-gold"
              />
              <Plus className="w-4 h-4 text-gold" />
              <div>
                <span className="font-mono text-sm font-bold text-foreground/90">
                  Create New Node
                </span>
                <span className="block font-mono text-[10px] text-foreground/40">
                  Register a new node first, then assign tokens
                </span>
              </div>
            </div>

            {choice === 'new-node' && (
              <div className="mt-3 ml-7">
                <p className="font-mono text-xs text-foreground/50">
                  Register a node first at{' '}
                  <Link
                    href="/node/register"
                    className="text-gold underline hover:text-gold/80"
                  >
                    /node/register
                  </Link>
                  , then come back to assign your tokens.
                </p>
              </div>
            )}
          </label>

          {/* Option 3: Burn (process commodity) */}
          <label
            className={`block cursor-pointer border p-3 transition-colors ${
              choice === 'burn'
                ? 'border-crimson/60 bg-crimson/[0.05]'
                : 'border-glass-border hover:border-foreground/20'
            }`}
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="destination"
                checked={choice === 'burn'}
                onChange={() => {
                  setChoice('burn');
                  setSelectedNodeId(null);
                }}
                className="accent-crimson"
              />
              <Flame className="w-4 h-4 text-crimson" />
              <div>
                <span className="font-mono text-sm font-bold text-foreground/90">
                  Burn (Process Commodity)
                </span>
                <span className="block font-mono text-[10px] text-foreground/40">
                  Permanently burn tokens — this is irreversible
                </span>
              </div>
            </div>

            {choice === 'burn' && (
              <div className="mt-3 ml-7">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={burnConfirmed}
                    onChange={(e) => setBurnConfirmed(e.target.checked)}
                    className="mt-0.5 accent-crimson"
                  />
                  <span className="font-mono text-xs text-crimson/80">
                    I confirm I want to permanently burn the settled tokens.
                    This action cannot be undone.
                  </span>
                </label>
              </div>
            )}
          </label>
        </div>

        {/* Error display */}
        {submitError && (
          <div className="flex items-center gap-2 p-2 bg-crimson/10 border border-crimson/30 mt-2">
            <AlertTriangle className="w-4 h-4 text-crimson flex-shrink-0" />
            <span className="font-mono text-xs text-crimson">
              {submitError}
            </span>
          </div>
        )}

        <DialogFooter className="mt-4">
          <TrapButton
            variant="gold"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </TrapButton>
          {choice === 'new-node' ? (
            <TrapButton
              variant="gold"
              size="sm"
              onClick={() => router.push('/node/register')}
            >
              Go to Registration
            </TrapButton>
          ) : (
            <TrapButton
              variant={choice === 'burn' ? 'crimson' : 'gold'}
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? 'Confirming...'
                : choice === 'burn'
                  ? 'Burn Tokens'
                  : 'Confirm Destination'}
            </TrapButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
