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
 * Uses the same node-asset source as the node dashboard.
 * getNodeAssets() already returns the node-specific custody amount in
 * `asset.amount`, so this hook should not override it with node inventory.
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

      // Step 2: Fetch assets for ALL nodes in PARALLEL.
      const nodeAssetPromises = ownedNodeIds.map(
        async (nodeId): Promise<AssetWithAttributes[]> => {
          try {
            const nodeAssets = await getNodeAssets(nodeId);
            return nodeAssets.map(
              (asset): AssetWithAttributes => ({
                ...asset,
                actualBalance: asset.amount || '0',
                nodeHash: nodeId,
              }),
            );
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
    getAssetAttributes,
    diamondInitialized,
  ]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchUserAssets();
  }, [fetchUserAssets]);

  /**
   * Convert TokenizedAsset to SellableAsset format
   * Uses actualBalance from node-specific custody. This keeps the sell-offer
   * wizard aligned with the node dashboard.
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

      const actualBalance = BigInt(asset.actualBalance || '0');

      if (actualBalance <= 0n) {
        continue; // Skip assets with no balance
      }

      result.push({
        id: asset.id,
        tokenId: asset.id,
        name: asset.name || 'Unknown Asset',
        class: asset.class || 'Unknown',
        balance: actualBalance.toString(),
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
