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
 * For a given tokenId, queries on-chain getCustodyInfo and maps results
 * to individual nodes. Since getCustodyInfo takes (tokenId, custodian address)
 * and multiple nodes may share the same owner wallet, we query once per unique
 * owner then distribute the custody amount across their nodes based on each
 * node's capacity proportion for this asset.
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

      // Deduplicate by owner wallet — query once per unique owner
      const uniqueOwners = [...new Set(nodes.map((n) => n.owner))];
      const ownerCustodyMap = new Map<string, bigint>();

      await Promise.all(
        uniqueOwners.map(async (owner) => {
          const amount = await service.getCustodyInfo(tokenId, owner);
          ownerCustodyMap.set(owner, amount);
        }),
      );

      // For each node that has this asset, calculate its share of the owner's custody
      // based on the node's capacity proportion
      const nodesWithAsset = nodes.filter((node) =>
        node.assets.some((a) => a.tokenId === tokenId),
      );

      if (nodesWithAsset.length === 0) {
        setEntries([]);
        return;
      }

      // Group nodes by owner to distribute custody proportionally
      const ownerNodeGroups = new Map<string, typeof nodesWithAsset>();
      for (const node of nodesWithAsset) {
        const group = ownerNodeGroups.get(node.owner) || [];
        group.push(node);
        ownerNodeGroups.set(node.owner, group);
      }

      const results: CustodyEntry[] = [];

      for (const [owner, ownerNodes] of ownerNodeGroups) {
        const totalCustody = ownerCustodyMap.get(owner) || 0n;
        if (totalCustody === 0n) continue;

        // Calculate total capacity across this owner's nodes for this asset
        const totalCapacity = ownerNodes.reduce((sum, node) => {
          const asset = node.assets.find((a) => a.tokenId === tokenId);
          return sum + BigInt(asset?.capacity || 0);
        }, 0n);

        if (totalCapacity === 0n) {
          // Can't distribute proportionally — split evenly
          const share = totalCustody / BigInt(ownerNodes.length);
          for (const node of ownerNodes) {
            results.push({
              nodeAddress: node.owner,
              nodeLocation: node.location?.addressName || node.owner,
              nodeHash: node.address,
              amount: share,
            });
          }
        } else {
          // Distribute proportionally by capacity
          for (const node of ownerNodes) {
            const asset = node.assets.find((a) => a.tokenId === tokenId);
            const nodeCapacity = BigInt(asset?.capacity || 0);
            const share = (totalCustody * nodeCapacity) / totalCapacity;
            if (share > 0n) {
              results.push({
                nodeAddress: node.owner,
                nodeLocation: node.location?.addressName || node.owner,
                nodeHash: node.address,
                amount: share,
              });
            }
          }
        }
      }

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
