'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNodes } from '@/app/providers/nodes.provider';
import { getSettlementService } from '@/infrastructure/services/settlement-service';

export interface CustodyEntry {
  nodeAddress: string;
  nodeLocation: string;
  nodeHash: string;
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
 * For a given tokenId, queries per-node custody amounts from the Diamond.
 * Uses getNodeCustodyInfo(tokenId, nodeHash) which tracks how much of a
 * token is physically custodied at each specific node — not just per-wallet.
 *
 * Falls back to wallet-level getCustodyInfo if per-node data isn't available
 * (e.g. tokens minted before the per-node tracking was added).
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

      // Query per-node custody for each node that has this asset
      const results = await Promise.all(
        nodes
          .filter((node) => node.assets.some((a) => a.tokenId === tokenId))
          .map(async (node) => {
            let amount = 0n;
            try {
              // Try per-node custody first (new mapping)
              amount = await service.getNodeCustodyInfo(tokenId, node.address);
            } catch {
              // Fallback: per-wallet custody (pre-upgrade tokens)
              try {
                amount = await service.getCustodyInfo(tokenId, node.owner);
              } catch {
                amount = 0n;
              }
            }
            return {
              nodeAddress: node.owner,
              nodeLocation: node.location?.addressName || node.owner,
              nodeHash: node.address,
              amount,
            };
          }),
      );

      setEntries(results.filter((e) => e.amount > 0n));
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
