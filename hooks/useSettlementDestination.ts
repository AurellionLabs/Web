'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

const AUSYS_SETTLEMENT_ABI = [
  'function selectTokenDestination(bytes32 orderId, bytes32 nodeId, bool burn) external',
  'function getPendingTokenDestinations(address buyer) external view returns (bytes32[])',
];

const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

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
      const repositoryContext = RepositoryContext.getInstance();
      const provider = repositoryContext.getProvider();

      const contract = new ethers.Contract(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        AUSYS_SETTLEMENT_ABI,
        provider,
      );

      const orderIds: string[] =
        await contract.getPendingTokenDestinations(address);

      setState({
        status: 'success',
        pendingOrders: orderIds.filter((id) => id !== ZERO_BYTES32),
      });
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
      if (!window.ethereum) {
        throw new Error('No wallet connected');
      }

      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        AUSYS_SETTLEMENT_ABI,
        signer,
      );

      const effectiveNodeId = burn ? ZERO_BYTES32 : nodeId;
      if (!effectiveNodeId) {
        throw new Error('Node ID is required when not burning');
      }

      const tx = await contract.selectTokenDestination(
        orderId,
        effectiveNodeId,
        burn,
      );
      await tx.wait();
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
