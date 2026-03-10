'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Truck, Package, Network } from 'lucide-react';
import { TrapButton } from '@/app/components/eva/eva-components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
  /** Selected pickup node reference (bytes32 node hash) */
  pickupNodeRef?: string;
  /** Pickup metadata derived from the selected node */
  pickupStartName?: string;
  pickupStartLocation?: { lat: string; lng: string };
  /** Delivery coordinates (lat/lng) from Google Places */
  deliveryCoords?: { lat: number; lng: number };
}

export interface PickupNodeOption {
  pickupNodeRef: string;
  senderNodeAddress: string;
  label: string;
  startName: string;
  startLocation: {
    lat: string;
    lng: string;
  };
  inventoryLabel?: string;
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
  /** Optional pre-filled delivery address */
  initialDeliveryAddress?: string;
  /** If true, delivery address is fixed and not editable */
  lockDeliveryAddress?: boolean;
  /** Optional node options for strict pickup-node selection */
  pickupNodeOptions?: PickupNodeOption[];
  /** Optional custom header title */
  title?: string;
  /** Optional custom header subtitle */
  subtitle?: string;
  /** Optional confirm button label */
  confirmLabel?: string;
  /** Optional pending button label */
  pendingLabel?: string;
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
  initialDeliveryAddress,
  lockDeliveryAddress = false,
  pickupNodeOptions,
  title,
  subtitle,
  confirmLabel,
  pendingLabel,
}: DeliveryDetailsDialogProps) {
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialDeliveryAddress || '',
  );
  const [deliveryCoords, setDeliveryCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPickupNodeRef, setSelectedPickupNodeRef] =
    useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Places autocomplete
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const fallbackNodeOptions = useMemo<PickupNodeOption[]>(
    () =>
      (offer.nodes || []).map((node) => {
        const nodeRef = String(node || '').trim();
        return {
          pickupNodeRef: nodeRef,
          senderNodeAddress: nodeRef,
          label: `${nodeRef.slice(0, 6)}...${nodeRef.slice(-4)}`,
          startName: '',
          startLocation: { lat: '', lng: '' },
        };
      }),
    [offer.nodes],
  );

  const effectiveNodeOptions = useMemo<PickupNodeOption[]>(
    () =>
      pickupNodeOptions && pickupNodeOptions.length > 0
        ? pickupNodeOptions
        : fallbackNodeOptions,
    [pickupNodeOptions, fallbackNodeOptions],
  );

  useEffect(() => {
    if (!open) return;
    setDeliveryAddress(initialDeliveryAddress || '');
    setDeliveryCoords(null);
    setError(null);
    setSelectedPickupNodeRef(effectiveNodeOptions[0]?.pickupNodeRef || '');
  }, [open, initialDeliveryAddress, effectiveNodeOptions]);

  const selectedNode =
    effectiveNodeOptions.find(
      (option) => option.pickupNodeRef === selectedPickupNodeRef,
    ) || effectiveNodeOptions[0];
  const hasMultipleNodes = effectiveNodeOptions.length > 0;

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
    if (!deliveryAddress.trim()) {
      setError('Delivery address is required.');
      return;
    }
    if (!lockDeliveryAddress && !deliveryCoords) {
      setError(
        'Please choose a suggested delivery address so coordinates are captured.',
      );
      return;
    }
    if (pickupNodeOptions && !selectedNode) {
      setError('Please select which node will fulfill this order.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm({
        deliveryAddress,
        senderNodeAddress: selectedNode?.senderNodeAddress || '',
        pickupNodeRef: selectedNode?.pickupNodeRef || undefined,
        pickupStartName: selectedNode?.startName || undefined,
        pickupStartLocation: selectedNode?.startLocation || undefined,
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

  const resolvedTitle = title || 'Confirm & Schedule Delivery';
  const resolvedSubtitle =
    subtitle || 'Enter your delivery address to complete the purchase';
  const resolvedConfirmLabel = confirmLabel || 'Accept & Schedule Delivery';
  const resolvedPendingLabel = pendingLabel || 'Scheduling...';

  const isConfirmDisabled =
    isSubmitting ||
    !deliveryAddress.trim() ||
    (!lockDeliveryAddress && !deliveryCoords);

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
                {resolvedTitle}
              </h2>
              <p className="text-sm text-white/80">
                {resolvedSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Order summary */}
          <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Package className="w-4 h-4 text-amber-400" />
              Order Summary
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-white/70">Asset</span>
                <p className="font-medium text-white">
                  {assetName || `Token #${offer.tokenId}`}
                </p>
              </div>
              <div>
                <span className="text-white/70">Quantity</span>
                <p className="font-medium text-white">
                  {offer.quantity.toString()}
                </p>
              </div>
              <div>
                <span className="text-white/70">Price</span>
                <p className="font-medium text-amber-400">
                  ${formatPrice(offer.price)}
                </p>
              </div>
              <div>
                <span className="text-white/70">Fee</span>
                <p className="font-medium text-white">
                  ${formatPrice(offer.txFee)}
                </p>
              </div>
              <div>
                <span className="text-white/70">Delivery Bounty</span>
                <p className="font-medium text-white">$0.50</p>
              </div>
            </div>
          </div>

          {/* Node selector - show when wallet has multiple nodes */}
          {hasMultipleNodes && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-amber-400" />
                Fulfillment Node
              </label>
              <Select
                value={selectedPickupNodeRef}
                onValueChange={(value) => setSelectedPickupNodeRef(value)}
              >
                <SelectTrigger className="w-full font-mono text-sm">
                  <SelectValue placeholder="Select a node" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-800">
                  {effectiveNodeOptions.map((nodeOption) => (
                    <SelectItem
                      key={nodeOption.pickupNodeRef}
                      value={nodeOption.pickupNodeRef}
                      className="font-mono text-sm text-white/80 focus:bg-amber-500/10 focus:text-amber-400"
                    >
                      {nodeOption.label}
                      {nodeOption.inventoryLabel
                        ? ` (${nodeOption.inventoryLabel})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-white/70">
                Choose which node will fulfill this order
              </p>
            </div>
          )}

          {/* Delivery address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              Delivery Address
            </label>
            {lockDeliveryAddress ? (
              <div
                className={cn(
                  'w-full px-4 py-3 rounded-lg text-sm',
                  'bg-neutral-900 border border-neutral-800',
                  'text-white',
                )}
              >
                {deliveryAddress || 'No delivery address set'}
              </div>
            ) : mapsLoaded ? (
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
                    'text-white placeholder:text-white/70',
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
                  'text-white placeholder:text-white/70',
                  'focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20',
                  'transition-colors',
                )}
                disabled={isSubmitting}
              />
            )}
            <p className="text-xs text-white/70">
              {lockDeliveryAddress
                ? 'Delivery destination already set on the buy offer'
                : mapsLoaded
                  ? 'This is where your goods will be delivered'
                  : 'Address suggestions are unavailable. Reload until search is available so coordinates can be captured.'}
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
              'shrink-0 px-5 py-3 rounded-lg text-sm font-medium',
              'bg-neutral-900 text-white border border-neutral-800',
              'hover:bg-neutral-800 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="Cancel"
          >
            Cancel
          </button>
          <TrapButton
            variant="gold"
            className="flex-1 min-w-0"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {isSubmitting ? resolvedPendingLabel : resolvedConfirmLabel}
            </span>
          </TrapButton>
        </div>
      </div>
    </div>
  );
}

export default DeliveryDetailsDialog;
