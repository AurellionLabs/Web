/**
 * @file Hook for managing token settlement destination selection.
 * @description Delegates all contract calls to SettlementService.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { getSettlementService } from '@/infrastructure/services/settlement-service';

type SettlementState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; pendingOrders: string[] };

export interface UseSettlementDestinationReturn {
  pendingOrders: string[];
  isLoading: boolean;
  error: string | null;
  selectDestination: (
    orderId: string,
    nodeId: string | null,
    burn: boolean,
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSettlementDestination(): UseSettlementDestinationReturn {
  const { address, isConnected } = useWallet();
  const [state, setState] = useState<SettlementState>({ status: 'idle' });

  const pendingOrders = state.status === 'success' ? state.pendingOrders : [];
  const isLoading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;

  const fetchPending = useCallback(async () => {
    if (!address || !isConnected) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const service = getSettlementService();
      const orderIds = await service.getPendingOrders(address);
      setState({ status: 'success', pendingOrders: orderIds });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load pending settlements';
      setState({ status: 'error', error: message });
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const selectDestination = useCallback(
    async (orderId: string, nodeId: string | null, burn: boolean) => {
      const service = getSettlementService();
      await service.selectDestination(orderId, nodeId, burn);
    },
    [],
  );

  return useMemo(
    () => ({
      pendingOrders,
      isLoading,
      error,
      selectDestination,
      refetch: fetchPending,
    }),
    [pendingOrders, isLoading, error, selectDestination, fetchPending],
  );
}
