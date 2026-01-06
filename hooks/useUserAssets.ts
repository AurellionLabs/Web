'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';
import { SellableAsset } from '@/app/components/trading/trade-panel';
import { TokenizedAsset } from '@/domain/node/node';

/**
 * Hook to fetch user's owned assets with balances
 *
 * Uses the Diamond contract (same as Node Dashboard) to get accurate inventory.
 * Fetches inventory from ALL nodes owned by the wallet.
 * No node selection required - automatically aggregates from all owned nodes.
 *
 * @param filterClass - Optional asset class to filter by
 * @returns User's sellable assets with balances and metadata
 */
export function useUserAssets(filterClass?: string) {
  const { address, isConnected } = useWallet();
  const {
    initialized: diamondInitialized,
    getOwnedNodes,
    getNodeAssets,
  } = useDiamond();

  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
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

      // Step 2: Fetch assets for each owned node from Diamond contract
      const allAssets: TokenizedAsset[] = [];

      for (const nodeId of ownedNodeIds) {
        console.log('[useUserAssets] Fetching assets for node:', nodeId);
        try {
          const nodeAssets = await getNodeAssets(nodeId);
          console.log(
            '[useUserAssets] Found',
            nodeAssets.length,
            'assets for node',
            nodeId,
          );
          allAssets.push(...nodeAssets);
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
      setAssets(allAssets);
    } catch (err) {
      console.error('[useUserAssets] Error fetching user assets:', err);
      setError('Failed to fetch your assets');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, diamondInitialized, getOwnedNodes, getNodeAssets]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchUserAssets();
  }, [fetchUserAssets]);

  /**
   * Convert TokenizedAsset to SellableAsset format
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

      // Only include assets with capacity > 0
      const capacity = BigInt(asset.capacity || '0');
      if (capacity <= 0n) {
        continue;
      }

      result.push({
        id: asset.id,
        tokenId: asset.id,
        name: asset.name || 'Unknown Asset',
        class: asset.class || 'Unknown',
        balance: asset.capacity || '0',
        price: asset.price
          ? (Number(asset.price) / 1e18).toFixed(2)
          : undefined,
        // Note: Attributes are not included in TokenizedAsset from DiamondNodeRepository
        // They would need to be fetched separately via getAssetAttributes if needed
      });
    }

    console.log('[useUserAssets] Sellable assets:', result.length);
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
