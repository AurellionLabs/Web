'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Check,
  Clock,
  Truck,
  Package,
  Loader2,
  Pen,
  PackageCheck,
} from 'lucide-react';
import { GlowButton } from '@/app/components/ui/glow-button';
import { TrapButton } from '@/app/components/eva/eva-components';
import { cn } from '@/lib/utils';
import { OrderWithAsset, P2POrderDetail } from '@/app/types/shared';
import { OrderStatus } from '@/domain/orders/order';
import { SettlementDestinationModal } from '@/app/components/settlement/SettlementDestinationModal';

// =============================================================================
// Types
// =============================================================================

export interface P2POrderFlowProps {
  order: OrderWithAsset;
  /** Called immediately when the order settles — used to show the
   *  token destination modal (node vs burn) without waiting for navigation. */
  onSettled?: (orderId: string) => void;
  /** Callback to sign for delivery (packageSign, then auto-attempts handOff).
   *  Returns 'settled', 'driver_not_signed', or 'signed'. */
  onSignDelivery?: (
    orderId: string,
    journeyId: string,
  ) => Promise<'settled' | 'driver_not_signed' | 'signed' | void>;
  /** Callback to attempt handoff. Returns 'settled' or 'driver_not_signed'. */
  onCompleteHandoff?: (
    orderId: string,
    journeyId: string,
  ) => Promise<'settled' | 'driver_not_signed' | void>;
  /** Callback to schedule delivery for orders stuck without a journey */
  onScheduleDelivery?: (orderId: string) => void;
  /** Callback for sender/node to sign for pickup (at journey-pending step).
   *  Returns 'started' if handOn succeeded (journey in transit),
   *  'waiting_for_driver' if driver hasn't signed yet,
   *  or 'signed' if only the sender's signature was recorded. */
  onSignPickup?: (
    orderId: string,
    journeyId: string,
  ) => Promise<'started' | 'waiting_for_driver' | 'signed'>;
  /** Function to fetch live signature states from the contract */
  fetchSignatureState?: (
    orderId: string,
    journeyId: string,
  ) => Promise<{
    buyerSigned: boolean;
    driverDeliverySigned: boolean;
    senderPickupSigned?: boolean;
    driverPickupSigned?: boolean;
  }>;
  /** Whether an action is currently in progress */
  isActionLoading?: boolean;
}

/** Steps in the P2P order lifecycle */
type P2PStep =
  | 'accepted'
  | 'journey-pending'
  | 'in-transit'
  | 'awaiting-confirmation'
  | 'settled';

interface StepConfig {
  id: P2PStep;
  label: string;
  icon: React.ElementType;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    id: 'accepted',
    label: 'Accepted',
    icon: Check,
    description: 'Offer has been accepted',
  },
  {
    id: 'journey-pending',
    label: 'Journey',
    icon: Clock,
    description: 'Journey created, awaiting pickup',
  },
  {
    id: 'in-transit',
    label: 'In Transit',
    icon: Truck,
    description: 'Package is on its way',
  },
  {
    id: 'awaiting-confirmation',
    label: 'Delivery',
    icon: Pen,
    description: 'Signatures needed for handoff',
  },
  {
    id: 'settled',
    label: 'Settled',
    icon: Package,
    description: 'Order complete',
  },
];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine the current step index based on order state.
 */
function getCurrentStepIndex(
  order: OrderWithAsset,
  buyerSigned: boolean,
  driverSigned: boolean,
): number {
  // Settled
  if (order.currentStatus === OrderStatus.SETTLED) return 4;

  const journeyStatus = order.journeyStatus ?? null;
  const hasJourney = order.journeyIds && order.journeyIds.length > 0;

  // Both signed → awaiting confirmation / ready for handoff
  if (buyerSigned && driverSigned) return 3;

  // Journey in transit (status 1) or one side has signed
  if (journeyStatus === 1 || buyerSigned || driverSigned) return 2;

  // Journey created (status 0) but not in transit yet
  if (hasJourney || journeyStatus === 0) return 1;

  // Accepted but no journey created yet
  return 0;
}

/**
 * Get the status message for the user at the current step.
 */
function getStatusMessage(
  stepIndex: number,
  buyerSigned: boolean,
  driverSigned: boolean,
): string {
  switch (stepIndex) {
    case 0:
      return 'No delivery journey yet. Schedule delivery to move this order forward.';
    case 1:
      return 'Journey created. Waiting for sender and driver to sign for pickup.';
    case 2:
      if (!buyerSigned && !driverSigned) {
        return 'Package is in transit. Sign for delivery when it arrives.';
      }
      if (buyerSigned && !driverSigned) {
        return 'You have signed for delivery. Waiting for driver to confirm.';
      }
      if (!buyerSigned && driverSigned) {
        return 'Driver has arrived. Sign for delivery to proceed.';
      }
      return 'Both signatures received. Ready to complete handoff.';
    case 3:
      return 'Both parties have signed. Settling the order automatically...';
    case 4:
      return 'Order is settled. Tokens and payment have been distributed.';
    default:
      return '';
  }
}

// =============================================================================
// Component
// =============================================================================

export function P2POrderFlow({
  order,
  onSettled,
  onSignDelivery,
  onCompleteHandoff,
  onScheduleDelivery,
  onSignPickup,
  fetchSignatureState,
  isActionLoading = false,
}: P2POrderFlowProps) {
  const [buyerSigned, setBuyerSigned] = useState(false);
  const [driverSigned, setDriverSigned] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Tracks whether we're waiting for the other party after a successful sign
  const [waitingForDriver, setWaitingForDriver] = useState(false);
  // Tracks whether we've signed for pickup and are waiting for the other party
  const [pickupSigned, setPickupSigned] = useState(false);
  // Pickup signature states from EmitSig events
  const [senderPickupSigned, setSenderPickupSigned] = useState(false);
  const [driverPickupSigned, setDriverPickupSigned] = useState(false);
  // Local settled flag — set when handOff succeeds, so we don't wait for
  // the order prop to update from the indexer before showing step 4
  const [localSettled, setLocalSettled] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  const journeyId =
    order.journeyIds && order.journeyIds.length > 0
      ? order.journeyIds[0]
      : null;

  // Fetch live signature state for both pickup and delivery phases
  const loadSignatures = useCallback(
    async (preserveOptimistic = false) => {
      if (!fetchSignatureState || !journeyId) return;
      const journeyStatus = order.journeyStatus ?? null;
      // Check sigs for both Pending (0) and InTransit (1) phases
      const needsSigCheck =
        journeyStatus === 0 ||
        journeyStatus === 1 ||
        order.currentStatus === OrderStatus.PROCESSING;
      if (!needsSigCheck) return;

      try {
        setSigLoading(true);
        const state = await fetchSignatureState(order.id, journeyId);

        // When preserving optimistic state, only UPGRADE (false→true), never downgrade
        if (preserveOptimistic) {
          setBuyerSigned((prev) => prev || state.buyerSigned);
          setDriverSigned((prev) => prev || state.driverDeliverySigned);
        } else {
          setBuyerSigned(state.buyerSigned);
          setDriverSigned(state.driverDeliverySigned);
        }

        // Update pickup signature state if provided
        if (state.senderPickupSigned !== undefined) {
          setSenderPickupSigned(state.senderPickupSigned);
        }
        if (state.driverPickupSigned !== undefined) {
          setDriverPickupSigned(state.driverPickupSigned);
        }
      } catch (err) {
        console.warn('[P2POrderFlow] Failed to fetch signatures:', err);
      } finally {
        setSigLoading(false);
      }
    },
    [
      fetchSignatureState,
      journeyId,
      order.id,
      order.journeyStatus,
      order.currentStatus,
    ],
  );

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  // Poll signature state while waiting, so the UI updates when the other
  // party signs without requiring a manual reload. Only poll when tab is visible.
  useEffect(() => {
    // Only poll when we're in a waiting state and the order isn't settled
    const needsPolling =
      (waitingForDriver ||
        (buyerSigned && !driverSigned) ||
        (!buyerSigned && driverSigned)) &&
      order.currentStatus !== OrderStatus.SETTLED &&
      !localSettled &&
      journeyId;

    if (!needsPolling) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        loadSignatures(true);
      }
    };

    // Initial tick
    tick();

    intervalId = setInterval(tick, 5000);

    // Also trigger immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadSignatures(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    waitingForDriver,
    buyerSigned,
    driverSigned,
    order.currentStatus,
    localSettled,
    journeyId,
    loadSignatures,
  ]);

  // Auto-attempt handOn when both pickup sigs are detected on-chain but
  // the journey is still pending (step 1). This covers the case where both
  // parties signed but the initial handOn failed or was never called.
  const autoHandOnAttemptedRef = useRef(false);
  useEffect(() => {
    // Indexer can lag and omit a pending-status update, leaving journeyStatus null
    // even though the on-chain journey is still Pending (0).
    const isJourneyPendingLike =
      order.journeyStatus === 0 || order.journeyStatus === null;

    if (
      senderPickupSigned &&
      driverPickupSigned &&
      !autoHandOnAttemptedRef.current &&
      onSignPickup &&
      journeyId &&
      isJourneyPendingLike &&
      order.currentStatus !== OrderStatus.SETTLED
    ) {
      autoHandOnAttemptedRef.current = true;
      // packageSign is idempotent, startJourney/handOn will succeed if both signed
      onSignPickup(order.id, journeyId)
        .then((result) => {
          if (result === 'started') {
          }
        })
        .catch((err) => {
          console.warn('[P2POrderFlow] Auto startJourney attempt failed:', err);
          // Allow retry on next signature state change
          autoHandOnAttemptedRef.current = false;
        });
    }
  }, [
    senderPickupSigned,
    driverPickupSigned,
    onSignPickup,
    journeyId,
    order.id,
    order.journeyStatus,
    order.currentStatus,
  ]);

  // Auto-attempt handOff when both delivery sigs are detected on-chain but
  // the order hasn't settled yet. This is the delivery-phase equivalent of
  // the pickup autoHandOn above.
  const autoHandOffAttemptedRef = useRef(false);
  useEffect(() => {
    if (
      buyerSigned &&
      driverSigned &&
      !autoHandOffAttemptedRef.current &&
      onCompleteHandoff &&
      journeyId &&
      order.currentStatus !== OrderStatus.SETTLED &&
      !localSettled
    ) {
      autoHandOffAttemptedRef.current = true;
      onCompleteHandoff(order.id, journeyId)
        .then((result) => {
          if (result === 'settled') {
            setLocalSettled(true);
            setWaitingForDriver(false);
            setIsSettlementModalOpen(true);
            onSettled?.(order.id);
          } else {
            // Driver sig may not be on-chain yet — allow retry
            autoHandOffAttemptedRef.current = false;
          }
        })
        .catch((err) => {
          console.warn('[P2POrderFlow] Auto handOff attempt failed:', err);
          autoHandOffAttemptedRef.current = false;
        });
    }
  }, [
    buyerSigned,
    driverSigned,
    onCompleteHandoff,
    onSettled,
    journeyId,
    order.id,
    order.currentStatus,
    localSettled,
  ]);

  const currentStep = localSettled
    ? 4
    : getCurrentStepIndex(order, buyerSigned, driverSigned);

  // Build status message with pickup awareness
  let statusMessage: string;
  if (waitingForDriver) {
    statusMessage =
      'Your delivery signature has been recorded. Waiting for driver to sign.';
  } else if (currentStep === 1) {
    // Journey pending — show pickup-aware message
    if (senderPickupSigned && driverPickupSigned) {
      statusMessage =
        'Both parties have signed for pickup. Journey starting...';
    } else if (driverPickupSigned && !senderPickupSigned) {
      statusMessage =
        'Driver has signed for pickup. Sign for pickup to start the journey.';
    } else if (senderPickupSigned && !driverPickupSigned) {
      statusMessage =
        'Your pickup signature is recorded. Waiting for driver to sign for pickup.';
    } else {
      statusMessage =
        'Journey created. Waiting for sender and driver to sign for pickup.';
    }
  } else {
    statusMessage = getStatusMessage(currentStep, buyerSigned, driverSigned);
  }

  // Action handlers
  const handleSignDelivery = async () => {
    if (!onSignDelivery || !journeyId) return;
    setActionError(null);
    setWaitingForDriver(false);
    try {
      const result = await onSignDelivery(order.id, journeyId);

      // Always set buyer as signed — the packageSign succeeded
      setBuyerSigned(true);

      if (result === 'settled') {
        // HandOff succeeded — both signed, order settled
        setDriverSigned(true);
        setWaitingForDriver(false);
        setLocalSettled(true);
        setIsSettlementModalOpen(true);
        onSettled?.(order.id);
      } else if (result === 'driver_not_signed') {
        // Driver hasn't signed yet — show waiting state
        setWaitingForDriver(true);
      } else {
        // 'signed' or void — re-check after a delay to let indexer catch up
        setWaitingForDriver(true);
        setTimeout(() => loadSignatures(true), 3000);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to sign for delivery',
      );
    }
  };

  // Handler for sender to sign for pickup
  const handleSignPickup = async () => {
    if (!onSignPickup || !journeyId) return;
    setActionError(null);
    try {
      const result = await onSignPickup(order.id, journeyId);
      setPickupSigned(true);

      if (result === 'started') {
        // Journey started — handOn succeeded, both parties signed
        // UI will update when orders refresh
        setPickupSigned(false); // Clear since we've progressed past pickup
      }
      // 'waiting_for_driver' or 'signed' — stay in pickupSigned state
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to sign for pickup',
      );
    }
  };

  // Determine which action to show
  const showScheduleButton =
    currentStep === 0 &&
    onScheduleDelivery &&
    order.currentStatus !== OrderStatus.SETTLED;

  // Only allow pickup signing if driver has already signed (i.e., a driver has
  // accepted the journey and confirmed pickup). Without this guard the sender
  // could sign before any driver is assigned.
  const showPickupButton =
    currentStep === 1 &&
    onSignPickup &&
    !pickupSigned &&
    !senderPickupSigned &&
    driverPickupSigned &&
    order.currentStatus !== OrderStatus.SETTLED;

  // Only allow delivery signing when the journey is actually in transit
  // (journeyStatus === 1). This prevents signing before the driver has
  // completed pickup and the journey has transitioned.
  const journeyIsInTransit = (order.journeyStatus ?? null) === 1;
  const showSignButton =
    currentStep === 2 &&
    onSignDelivery &&
    !buyerSigned &&
    !waitingForDriver &&
    journeyIsInTransit &&
    order.currentStatus !== OrderStatus.SETTLED;
  // HandOff is always auto-attempted after signing — no manual button needed

  return (
    <div className="space-y-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isComplete = idx < currentStep;
          const isCurrent = idx === currentStep;
          const StepIcon = step.icon;

          return (
            <div
              key={step.id}
              className="flex items-center flex-1 last:flex-none"
            >
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                    isComplete && 'bg-amber-500 text-black',
                    isCurrent &&
                      'bg-amber-500/20 border-2 border-amber-500 text-amber-500',
                    !isComplete &&
                      !isCurrent &&
                      'bg-gray-800 border border-gray-600 text-white/70',
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 text-center whitespace-nowrap',
                    isComplete && 'text-amber-400',
                    isCurrent && 'text-amber-300 font-medium',
                    !isComplete && !isCurrent && 'text-white/70',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mt-[-16px]',
                    idx < currentStep ? 'bg-amber-500' : 'bg-gray-700',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-sm text-white bg-gray-900/50 rounded-md px-3 py-2">
        {sigLoading ? (
          <span className="flex items-center gap-2 text-white/80">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking delivery status...
          </span>
        ) : (
          statusMessage
        )}
      </div>

      {/* Signature status badges */}
      {(currentStep === 2 || currentStep === 3) && !sigLoading && (
        <div className="flex gap-3 text-xs">
          <span
            className={cn(
              'px-2 py-1 rounded-full',
              buyerSigned
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 text-white/80',
            )}
          >
            Customer: {buyerSigned ? 'Signed' : 'Pending'}
          </span>
          <span
            className={cn(
              'px-2 py-1 rounded-full',
              driverSigned
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 text-white/80',
            )}
          >
            Driver: {driverSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      )}

      {/* Waiting for driver indicator */}
      {waitingForDriver && order.currentStatus !== OrderStatus.SETTLED && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="text-sm text-amber-300">
            Waiting for driver to sign for delivery
          </span>
        </div>
      )}

      {/* Action buttons */}
      {showScheduleButton && (
        <TrapButton
          variant="gold"
          onClick={() => onScheduleDelivery!(order.id)}
          disabled={isActionLoading}
          className="inline-flex items-center gap-2"
        >
          {isActionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Truck className="w-4 h-4" />
          )}
          Schedule Delivery
        </TrapButton>
      )}

      {showPickupButton && (
        <TrapButton
          variant="gold"
          size="sm"
          onClick={handleSignPickup}
          disabled={isActionLoading}
          className="inline-flex items-center gap-2"
        >
          {isActionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PackageCheck className="w-4 h-4" />
          )}
          Sign for Pickup
        </TrapButton>
      )}

      {/* Pickup signature status badges */}
      {currentStep === 1 &&
        !sigLoading &&
        (driverPickupSigned || senderPickupSigned || pickupSigned) && (
          <div className="flex gap-3 text-xs">
            <span
              className={cn(
                'px-2 py-1 rounded-full',
                senderPickupSigned || pickupSigned
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-white/80',
              )}
            >
              Sender:{' '}
              {senderPickupSigned || pickupSigned ? 'Signed' : 'Pending'}
            </span>
            <span
              className={cn(
                'px-2 py-1 rounded-full',
                driverPickupSigned
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-white/80',
              )}
            >
              Driver: {driverPickupSigned ? 'Signed' : 'Pending'}
            </span>
          </div>
        )}

      {pickupSigned && currentStep === 1 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="text-sm text-amber-300">
            {driverPickupSigned
              ? 'Both parties signed. Journey should start shortly...'
              : 'Pickup signature recorded. Waiting for driver to sign for pickup.'}
          </span>
        </div>
      )}

      {showSignButton && (
        <GlowButton
          onClick={handleSignDelivery}
          loading={isActionLoading}
          disabled={isActionLoading}
          variant="primary"
          size="sm"
          leftIcon={<Pen className="w-4 h-4" />}
        >
          Sign for Delivery
        </GlowButton>
      )}

      {/* HandOff is auto-attempted after each sign — no manual button */}

      {/* Error display */}
      {actionError && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded-md px-3 py-2">
          {actionError}
        </div>
      )}

      {/* Settlement destination modal — fires immediately when order settles */}
      <SettlementDestinationModal
        isOpen={isSettlementModalOpen}
        orderId={order.id}
        onClose={() => setIsSettlementModalOpen(false)}
        onSuccess={() => setIsSettlementModalOpen(false)}
      />
    </div>
  );
}

export default P2POrderFlow;
