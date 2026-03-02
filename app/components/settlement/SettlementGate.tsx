'use client';

import { useState, useEffect } from 'react';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';
import { SettlementDestinationModal } from './SettlementDestinationModal';

/**
 * SettlementGate — mounted in the app layout, not a specific page.
 *
 * On every page load it silently calls getPendingTokenDestinations(buyer).
 * If the chain has any unresolved settlements (e.g. order settled while buyer
 * was offline, or buyer navigated away before choosing), it opens the
 * SettlementDestinationModal automatically.
 *
 * This covers:
 * - Buyer offline when driver signs last
 * - Buyer signed first, driver signed later
 * - Buyer closed the tab mid-flow
 * - Pending decisions from previous sessions
 */
export function SettlementGate() {
  const { pendingOrders, isLoading, refetch } = useSettlementDestination();
  const [queue, setQueue] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Once loaded, seed the queue with any pending orders
  useEffect(() => {
    if (!isLoading && pendingOrders.length > 0) {
      setQueue(pendingOrders);
    }
  }, [isLoading, pendingOrders]);

  // Pop from queue when modal closes
  useEffect(() => {
    if (!isOpen && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrentOrder(next);
      setQueue(rest);
      setIsOpen(true);
    }
  }, [isOpen, queue]);

  const handleSuccess = () => {
    refetch(); // refresh pending list from chain
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentOrder(null);
    // Next pending order (if any) will be picked up by the queue effect
  };

  if (!currentOrder) return null;

  return (
    <SettlementDestinationModal
      isOpen={isOpen}
      orderId={currentOrder}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
}
