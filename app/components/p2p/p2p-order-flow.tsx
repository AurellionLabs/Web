'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Clock,
  Truck,
  Package,
  Loader2,
  Pen,
  ArrowRight,
} from 'lucide-react';
import { GlowButton } from '@/app/components/ui/glow-button';
import { cn } from '@/lib/utils';
import { OrderWithAsset, P2POrderDetail } from '@/app/types/shared';
import { OrderStatus } from '@/domain/orders/order';

// =============================================================================
// Types
// =============================================================================

export interface P2POrderFlowProps {
  order: OrderWithAsset;
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
  /** Function to fetch live signature states from the contract */
  fetchSignatureState?: (
    orderId: string,
    journeyId: string,
  ) => Promise<{ buyerSigned: boolean; driverDeliverySigned: boolean }>;
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
      return 'Both parties have signed. Complete the handoff to settle the order.';
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
  onSignDelivery,
  onCompleteHandoff,
  onScheduleDelivery,
  fetchSignatureState,
  isActionLoading = false,
}: P2POrderFlowProps) {
  const [buyerSigned, setBuyerSigned] = useState(false);
  const [driverSigned, setDriverSigned] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Tracks whether we're waiting for the other party after a successful sign
  const [waitingForDriver, setWaitingForDriver] = useState(false);

  const journeyId =
    order.journeyIds && order.journeyIds.length > 0
      ? order.journeyIds[0]
      : null;

  // Fetch live signature state when order is in transit
  const loadSignatures = useCallback(
    async (preserveOptimistic = false) => {
      if (!fetchSignatureState || !journeyId) return;
      const journeyStatus = order.journeyStatus ?? null;
      const needsSigCheck =
        journeyStatus === 1 || order.currentStatus === OrderStatus.PROCESSING;
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

  const currentStep = getCurrentStepIndex(order, buyerSigned, driverSigned);
  const statusMessage = waitingForDriver
    ? 'Your delivery signature has been recorded. Waiting for driver to sign.'
    : getStatusMessage(currentStep, buyerSigned, driverSigned);

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

  const handleCompleteHandoff = async () => {
    if (!onCompleteHandoff || !journeyId) return;
    setActionError(null);
    try {
      const result = await onCompleteHandoff(order.id, journeyId);

      if (result === 'driver_not_signed') {
        // Not an error — driver hasn't signed yet
        setWaitingForDriver(true);
        setDriverSigned(false);
      }
      // 'settled' → the provider already updated the order state
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to complete handoff',
      );
    }
  };

  // Determine which action to show
  const showScheduleButton =
    currentStep === 0 &&
    onScheduleDelivery &&
    order.currentStatus !== OrderStatus.SETTLED;
  const showSignButton =
    currentStep === 2 &&
    !buyerSigned &&
    !waitingForDriver &&
    order.currentStatus !== OrderStatus.SETTLED;
  const showHandoffButton =
    currentStep === 3 &&
    buyerSigned &&
    driverSigned &&
    !waitingForDriver &&
    order.currentStatus !== OrderStatus.SETTLED;

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
                      'bg-gray-800 border border-gray-600 text-gray-500',
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
                    !isComplete && !isCurrent && 'text-gray-500',
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
      <div className="text-sm text-gray-300 bg-gray-900/50 rounded-md px-3 py-2">
        {sigLoading ? (
          <span className="flex items-center gap-2 text-gray-400">
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
                : 'bg-gray-800 text-gray-400',
            )}
          >
            Customer: {buyerSigned ? 'Signed' : 'Pending'}
          </span>
          <span
            className={cn(
              'px-2 py-1 rounded-full',
              driverSigned
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 text-gray-400',
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
        <GlowButton
          onClick={() => onScheduleDelivery!(order.id)}
          loading={isActionLoading}
          disabled={isActionLoading}
          variant="primary"
          size="sm"
          leftIcon={<Truck className="w-4 h-4" />}
        >
          Schedule Delivery
        </GlowButton>
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

      {showHandoffButton && (
        <GlowButton
          onClick={handleCompleteHandoff}
          loading={isActionLoading}
          disabled={isActionLoading}
          variant="primary"
          size="sm"
          leftIcon={<ArrowRight className="w-4 h-4" />}
        >
          Complete Handoff
        </GlowButton>
      )}

      {/* Error display */}
      {actionError && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded-md px-3 py-2">
          {actionError}
        </div>
      )}
    </div>
  );
}

export default P2POrderFlow;
