'use client';

import { useState } from 'react';
import { MapPin, Truck, Loader2, Package } from 'lucide-react';
import { GlowButton } from '@/app/components/ui/glow-button';
import { cn } from '@/lib/utils';
import { P2POffer } from '@/domain/p2p';
import { formatUnits } from 'ethers';

// =============================================================================
// Types
// =============================================================================

export interface DeliveryFormData {
  /** User-entered delivery address */
  deliveryAddress: string;
  /** Derived sender node address from the offer */
  senderNodeAddress: string;
}

export interface DeliveryDetailsDialogProps {
  /** The P2P offer being accepted */
  offer: P2POffer;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms — receives delivery details */
  onConfirm: (details: DeliveryFormData) => Promise<void>;
  /** Resolved asset name for display */
  assetName?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DeliveryDetailsDialog({
  offer,
  open,
  onOpenChange,
  onConfirm,
  assetName,
}: DeliveryDetailsDialogProps) {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const senderNode =
    offer.nodes && offer.nodes.length > 0 ? offer.nodes[0] : '';

  const formatPrice = (price: bigint) => {
    return parseFloat(formatUnits(price, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        deliveryAddress,
        senderNodeAddress: senderNode,
      });
      // Success — dialog will be closed by parent
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to accept offer. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isSubmitting && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-amber-500/20 bg-gray-900 shadow-2xl shadow-amber-500/5">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Confirm &amp; Schedule Delivery
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your delivery address to complete the purchase
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Order summary */}
          <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Package className="w-4 h-4 text-amber-400" />
              Order Summary
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Asset</span>
                <p className="font-medium text-foreground">
                  {assetName || `Token #${offer.tokenId}`}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Quantity</span>
                <p className="font-medium text-foreground">
                  {offer.quantity.toString()}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Price</span>
                <p className="font-medium text-amber-400">
                  ${formatPrice(offer.price)}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Fee</span>
                <p className="font-medium text-gray-300">
                  ${formatPrice(offer.txFee)}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              Delivery Address
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter delivery address"
              className={cn(
                'w-full px-4 py-3 rounded-lg text-sm',
                'bg-gray-800 border border-gray-700',
                'text-foreground placeholder:text-gray-500',
                'focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20',
                'transition-colors',
              )}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              This is where your goods will be delivered
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className={cn(
              'flex-1 px-4 py-3 rounded-lg text-sm font-medium',
              'bg-gray-800 text-gray-300 border border-gray-700',
              'hover:bg-gray-700 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="Cancel"
          >
            Cancel
          </button>
          <GlowButton
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!deliveryAddress.trim() || isSubmitting}
            loading={isSubmitting}
            aria-label="Accept & Schedule Delivery"
          >
            Accept &amp; Schedule Delivery
          </GlowButton>
        </div>
      </div>
    </div>
  );
}

export default DeliveryDetailsDialog;
