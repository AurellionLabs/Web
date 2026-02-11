'use client';

import { useState } from 'react';
import { MapPin, Truck, Package } from 'lucide-react';
import { GlowButton } from '@/app/components/ui/glow-button';
import { cn } from '@/lib/utils';
import { P2POffer } from '@/domain/p2p';
import { formatUnits } from 'ethers';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

// Keep libraries as a stable constant to prevent LoadScript reloads
const GOOGLE_LIBRARIES: 'places'[] = ['places'];

// =============================================================================
// Types
// =============================================================================

export interface DeliveryFormData {
  /** User-entered delivery address */
  deliveryAddress: string;
  /** Derived sender node address from the offer */
  senderNodeAddress: string;
  /** Delivery coordinates (lat/lng) from Google Places */
  deliveryCoords?: { lat: number; lng: number };
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
  const [deliveryCoords, setDeliveryCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Places autocomplete
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  // Use the first node as sender, or fall back to the seller address
  const senderNode =
    offer.nodes && offer.nodes.length > 0
      ? offer.nodes[0]
      : offer.seller || offer.creator;

  const formatPrice = (price: bigint) => {
    return parseFloat(formatUnits(price, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setDeliveryAddress(place.formatted_address || '');
        setDeliveryCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        deliveryAddress,
        senderNodeAddress: senderNode,
        deliveryCoords: deliveryCoords || undefined,
      });
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !isSubmitting && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-amber-500/20 bg-black shadow-2xl shadow-amber-500/5">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Confirm &amp; Schedule Delivery
              </h2>
              <p className="text-sm text-neutral-400">
                Enter your delivery address to complete the purchase
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Order summary */}
          <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Package className="w-4 h-4 text-amber-400" />
              Order Summary
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-500">Asset</span>
                <p className="font-medium text-white">
                  {assetName || `Token #${offer.tokenId}`}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Quantity</span>
                <p className="font-medium text-white">
                  {offer.quantity.toString()}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Price</span>
                <p className="font-medium text-amber-400">
                  ${formatPrice(offer.price)}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Fee</span>
                <p className="font-medium text-neutral-300">
                  ${formatPrice(offer.txFee)}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery address - Google Places Autocomplete */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              Delivery Address
            </label>
            {mapsLoaded ? (
              <Autocomplete
                onLoad={(autocompleteInstance) => {
                  setAutocomplete(autocompleteInstance);
                }}
                onPlaceChanged={handlePlaceSelect}
              >
                <input
                  type="text"
                  placeholder="Search for a delivery address..."
                  className={cn(
                    'w-full px-4 py-3 rounded-lg text-sm',
                    'bg-neutral-900 border border-neutral-800',
                    'text-white placeholder:text-neutral-500',
                    'focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20',
                    'transition-colors',
                  )}
                  disabled={isSubmitting}
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address"
                className={cn(
                  'w-full px-4 py-3 rounded-lg text-sm',
                  'bg-neutral-900 border border-neutral-800',
                  'text-white placeholder:text-neutral-500',
                  'focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20',
                  'transition-colors',
                )}
                disabled={isSubmitting}
              />
            )}
            <p className="text-xs text-neutral-500">
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
              'bg-neutral-900 text-neutral-300 border border-neutral-800',
              'hover:bg-neutral-800 transition-colors',
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
