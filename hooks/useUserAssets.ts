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
    getAssetAttributes,
    getNodeTokenBalance,
  } = useDiamond();

  const [assets, setAssets] = useState<AssetWithAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log context state on each render for debugging
  console.log('[useUserAssets] Hook called with:', {
    filterClass,
    isConnected,
    diamondInitialized,
    address: address ? address.slice(0, 10) + '...' : 'none',
  });

  /**
   * Fetch user assets from Diamond contract (same source as Node Dashboard)
   */
  const fetchUserAssets = useCallback(async () => {
    console.log('[useUserAssets] fetchUserAssets called', {
      isConnected,
      diamondInitialized,
      address,
    });

    if (!isConnected || !address) {
      console.log(
        '[useUserAssets] Not connected or no address, skipping fetch',
      );
      setAssets([]);
      setIsLoading(false);
      return;
    }

    if (!diamondInitialized) {
      console.log('[useUserAssets] Diamond not initialized yet, waiting...');
      return;
    }

    console.log('[useUserAssets] Starting fetch for address:', address);

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get ALL nodes owned by this wallet from Diamond contract
      console.log('[useUserAssets] Getting owned nodes from Diamond...');
      const ownedNodeIds = await getOwnedNodes();
      console.log(
        '[useUserAssets] Found owned nodes:',
        ownedNodeIds.length,
        ownedNodeIds,
      );

      if (ownedNodeIds.length === 0) {
        console.log('[useUserAssets] No owned nodes found');
        setAssets([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch assets for each node from getNodeAssets (metadata)
      // Then get ACTUAL tradable balance from getNodeTokenBalance for each
      const allAssets: AssetWithAttributes[] = [];

      for (const nodeId of ownedNodeIds) {
        console.log('[useUserAssets] Fetching assets for node:', nodeId);
        try {
          // Get asset metadata from getNodeAssets
          const nodeAssets = await getNodeAssets(nodeId);
          console.log(
            '[useUserAssets] Found',
            nodeAssets.length,
            'assets for node',
            nodeId,
          );

          // For each asset, get its ACTUAL tradable balance from nodeTokenBalances
          for (const asset of nodeAssets) {
            try {
              // Query the real tradable balance (what the CLOB sell will use)
              const actualBalance = await getNodeTokenBalance(nodeId, asset.id);
              console.log(
                '[useUserAssets] Asset',
                asset.id,
                'capacity:',
                asset.capacity,
                'actualBalance:',
                actualBalance.toString(),
              );

              // Create asset entry with actual balance
              const assetEntry: AssetWithAttributes = {
                ...asset,
                actualBalance: actualBalance.toString(),
                nodeHash: nodeId,
              };

              allAssets.push(assetEntry);
            } catch (balanceError) {
              console.warn(
                '[useUserAssets] Error getting balance for asset',
                asset.id,
                balanceError,
              );
              // Still add the asset but with capacity as fallback
              allAssets.push({
                ...asset,
                actualBalance: asset.capacity || '0',
                nodeHash: nodeId,
              });
            }
          }
        } catch (nodeError) {
          console.error(
            '[useUserAssets] Error fetching assets for node',
            nodeId,
            nodeError,
          );
        }
      }

      console.log(
        '[useUserAssets] Total assets from all nodes:',
        allAssets.length,
      );

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

      console.log(
        '[useUserAssets] Assets with attributes loaded:',
        assetsWithAttributes.length,
      );
      setAssets(assetsWithAttributes);
    } catch (err) {
      console.error('[useUserAssets] Error fetching user assets:', err);
      setError('Failed to fetch your assets');
    } finally {
      setIsLoading(false);
    }
  }, [
    address,
    isConnected,
    diamondInitialized,
    getOwnedNodes,
    getNodeAssets,
    getAssetAttributes,
    getNodeTokenBalance,
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
      });
    }

    console.log(
      '[useUserAssets] Sellable assets:',
      result.length,
      result.map((a) => ({ id: a.id, balance: a.balance })),
    );
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
