'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';
import {
  SellableAsset,
  AssetAttribute,
} from '@/app/components/trading/trade-panel';
import { TokenizedAsset, TokenizedAssetAttribute } from '@/domain/node/node';

/**
 * Extended asset type that includes attributes and actual balance
 */
interface AssetWithAttributes extends TokenizedAsset {
  attributes?: AssetAttribute[];
  /** Actual tradable balance from node inventory (not capacity) */
  actualBalance?: string;
  /** The node hash this asset belongs to */
  nodeHash?: string;
}

/**
 * Hook to fetch user's owned assets with balances
 *
 * Uses the Diamond contract to get accurate inventory balances.
 * Gets asset list from getNodeAssets() (metadata) and actual tradable
 * balance from getNodeTokenBalance() for each asset.
 * No node selection required - automatically aggregates from all owned nodes.
 *
 * @param filterClass - Optional asset class to filter by
 * @returns User's sellable assets with actual tradable balances
 */
export function useUserAssets(filterClass?: string) {
  const { address, isConnected } = useWallet();
  const {
    initialized: diamondInitialized,
    getOwnedNodes,
    getNodeAssets,
    getNodeTokenBalance,
    getAssetAttributes,
  } = useDiamond();

  const [assets, setAssets] = useState<AssetWithAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log context state on each render for debugging

  /**
   * Fetch user assets from Diamond contract (same source as Node Dashboard)
   */
  const fetchUserAssets = useCallback(async () => {
    if (!isConnected || !address) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    if (!diamondInitialized) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get ALL nodes owned by this wallet from Diamond contract
      const ownedNodeIds = await getOwnedNodes();

      if (ownedNodeIds.length === 0) {
        setAssets([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch assets for ALL nodes in PARALLEL, then get balances in PARALLEL
      // This reduces RPC round-trips from O(nodes * assets) sequential calls to 2 batches
      const nodeAssetPromises = ownedNodeIds.map(
        async (nodeId): Promise<AssetWithAttributes[]> => {
          try {
            const nodeAssets = await getNodeAssets(nodeId);

            // Query node inventory directly so each asset reflects the
            // selected node's actual sellable balance.
            const assetsWithBalances = await Promise.all(
              nodeAssets.map(async (asset): Promise<AssetWithAttributes> => {
                try {
                  const actualBalance = await getNodeTokenBalance(
                    nodeId,
                    asset.id,
                  );
                  return {
                    ...asset,
                    actualBalance: actualBalance.toString(),
                    nodeHash: nodeId,
                  };
                } catch (balanceError) {
                  console.warn(
                    '[useUserAssets] Error getting balance for asset',
                    asset.id,
                    balanceError,
                  );
                  return {
                    ...asset,
                    actualBalance: asset.capacity || '0',
                    nodeHash: nodeId,
                  };
                }
              }),
            );

            return assetsWithBalances;
          } catch (nodeError) {
            console.error(
              '[useUserAssets] Error fetching assets for node',
              nodeId,
              nodeError,
            );
            return [];
          }
        },
      );

      // Wait for all nodes in parallel
      const nodeAssetResults = await Promise.all(nodeAssetPromises);
      const allAssets = nodeAssetResults.flat();

      // Step 3: Fetch attributes for each asset
      const assetsWithAttributes: AssetWithAttributes[] = await Promise.all(
        allAssets.map(async (asset) => {
          if (!asset.fileHash) {
            return asset;
          }

          try {
            const attrs = await getAssetAttributes(asset.fileHash);
            // Convert TokenizedAssetAttribute to AssetAttribute format
            const convertedAttrs: AssetAttribute[] = attrs.map(
              (attr: TokenizedAssetAttribute) => ({
                name: attr.name,
                value: attr.value || '',
              }),
            );
            return {
              ...asset,
              attributes:
                convertedAttrs.length > 0 ? convertedAttrs : undefined,
            };
          } catch (attrError) {
            console.warn(
              '[useUserAssets] Failed to fetch attributes for asset:',
              asset.id,
              attrError,
            );
            return asset;
          }
        }),
      );
      setAssets(assetsWithAttributes);
    } catch (err) {
      console.error('[useUserAssets] Error fetching user assets:', err);
      setError('Failed to fetch your assets');
    } finally {
      setIsLoading(false);
    }
  }, [
    isConnected,
    getOwnedNodes,
    getNodeAssets,
    getNodeTokenBalance,
    getAssetAttributes,
    diamondInitialized,
  ]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchUserAssets();
  }, [fetchUserAssets]);

  /**
   * Convert TokenizedAsset to SellableAsset format
   * Uses actualBalance (real node inventory) - this is what the CLOB will check
   * Falls back to capacity if actualBalance is not available
   */
  const sellableAssets = useMemo((): SellableAsset[] => {
    const result: SellableAsset[] = [];

    for (const asset of assets) {
      // Apply class filter if specified
      if (
        filterClass &&
        asset.class?.toLowerCase() !== filterClass.toLowerCase()
      ) {
        continue;
      }

      // Use actualBalance (real tradable inventory) - this matches what CLOB checks
      // Fall back to capacity if actualBalance is not set
      const actualBalance = BigInt(asset.actualBalance || '0');
      const capacity = BigInt(asset.capacity || '0');

      // Use actualBalance if available, otherwise fall back to capacity
      const displayBalance = actualBalance > 0n ? actualBalance : capacity;

      if (displayBalance <= 0n) {
        continue; // Skip assets with no balance
      }

      result.push({
        id: asset.id,
        tokenId: asset.id,
        name: asset.name || 'Unknown Asset',
        class: asset.class || 'Unknown',
        balance: displayBalance.toString(),
        price: asset.price
          ? (Number(asset.price) / 1e18).toFixed(2)
          : undefined,
        attributes: asset.attributes,
        nodeHash: asset.nodeHash, // Include the node this asset belongs to
      });
    }
    return result;
  }, [assets, filterClass]);

  return {
    sellableAssets,
    isLoading,
    error,
    refresh: fetchUserAssets,
    /** Total number of different assets owned */
    assetCount: sellableAssets.length,
    /** Whether user has any assets to sell */
    hasAssets: sellableAssets.length > 0,
  };
}

export default useUserAssets;
