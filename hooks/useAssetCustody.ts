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
  nodes: CustodyEntry[];
  totalCustodied: bigint;
  hasAnyCustodian: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * For a given tokenId, queries on-chain getCustodyInfo(tokenId, nodeAddress)
 * for each of the user's nodes. Token wallet location is irrelevant —
 * only the custodian record on AssetsFacet matters for redemption.
 */
export function useAssetCustody(
  tokenId: string | undefined,
): AssetCustodyResult {
  const { nodes } = useNodes();
  const [entries, setEntries] = useState<CustodyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustody = useCallback(async () => {
    if (!tokenId || nodes.length === 0) {
      setEntries([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const service = getSettlementService();
      const results = await Promise.all(
        nodes.map(async (node) => {
          // node.address is the bytes32 nodeHash — NOT a valid Ethereum address.
          // The custodian recorded in AssetsFacet is the node owner's wallet (node.owner).
          const custodian = node.owner;
          const amount = await service.getCustodyInfo(tokenId, custodian);
          return {
            nodeAddress: custodian,
            nodeLocation: node.location?.addressName || custodian,
            amount,
          };
        }),
      );

      // Exclude nodes with zero custody
      setEntries(results.filter((entry) => entry.amount > 0n));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch custody');
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, nodes]);

  useEffect(() => {
    fetchCustody();
  }, [fetchCustody]);

  const totalCustodied = entries.reduce((sum, e) => sum + e.amount, 0n);

  return {
    nodes: entries,
    totalCustodied,
    hasAnyCustodian: entries.length > 0,
    isLoading,
    error,
  };
}
