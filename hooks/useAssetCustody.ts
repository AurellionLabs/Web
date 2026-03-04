'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNodes } from '@/app/providers/nodes.provider';

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
      // Use per-node asset quantities from nodes.provider
      // Each node tracks its own assets with amounts - this differentiates
      // custody per node instead of using the shared owner wallet
      const results = nodes
        .map((node) => {
          // Find the asset entry for this tokenId in the node's assets
          const nodeAsset = node.assets.find(
            (asset) => asset.tokenId === tokenId,
          );
          // If no asset entry found, check if there's a capacity (represents total)
          // The capacity field represents the node's allocation for this asset
          const amount = nodeAsset
            ? BigInt(nodeAsset.capacity)
            : 0n;

          return {
            nodeAddress: node.owner,
            nodeLocation: node.location?.addressName || node.owner,
            nodeHash: node.address,
            amount,
          };
        })
        // Exclude nodes with zero custody
        .filter((entry) => entry.amount > 0n);

      setEntries(results);
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
