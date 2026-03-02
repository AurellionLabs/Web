'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNodes } from '@/app/providers/nodes.provider';
import { getSettlementService } from '@/infrastructure/services/settlement-service';

export interface CustodyEntry {
  nodeAddress: string;
  nodeLocation: string;
  amount: bigint;
}

export interface AssetCustodyResult {
  inWallet: bigint;
  nodes: CustodyEntry[];
  totalBalance: bigint;
  isLoading: boolean;
  error: string | null;
}

/**
 * For a given tokenId + wallet balance, returns how much is held
 * in-wallet vs custodied across each of the user's nodes.
 * All contract calls delegated to SettlementService.
 */
export function useAssetCustody(
  tokenId: string | undefined,
  walletAddress: string | undefined,
  walletBalance: bigint,
): AssetCustodyResult {
  const { nodes } = useNodes();
  const [result, setResult] = useState<
    Omit<AssetCustodyResult, 'isLoading' | 'error'>
  >({
    inWallet: walletBalance,
    nodes: [],
    totalBalance: walletBalance,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustody = useCallback(async () => {
    if (!tokenId || !walletAddress || nodes.length === 0) {
      setResult({
        inWallet: walletBalance,
        nodes: [],
        totalBalance: walletBalance,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const service = getSettlementService();
      const breakdown = await service.getCustodyBreakdown(
        tokenId,
        walletBalance,
        nodes.map((n) => ({
          address: n.address,
          location: n.location?.addressName || n.address,
        })),
      );
      setResult(breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch custody');
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, walletAddress, walletBalance, nodes]);

  useEffect(() => {
    fetchCustody();
  }, [fetchCustody]);

  return {
    ...result,
    isLoading,
    error,
  };
}
