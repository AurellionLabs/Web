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
 * Fetches actual node token balances (not just capacity metadata).
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
    getNodeInventory,
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

      // Step 2: Fetch ACTUAL inventory balances for each node
      // This is the real tradable balance, not just metadata capacity
      const allAssets: AssetWithAttributes[] = [];

      for (const nodeId of ownedNodeIds) {
        console.log('[useUserAssets] Fetching inventory for node:', nodeId);
        try {
          // Get actual node inventory (tokenIds + balances)
          const inventory = await getNodeInventory(nodeId);
          console.log(
            '[useUserAssets] Node inventory:',
            nodeId,
            'tokenIds:',
            inventory.tokenIds.map((t) => t.toString()),
            'balances:',
            inventory.balances.map((b) => b.toString()),
          );

          // Also get asset metadata for enrichment
          const nodeAssets = await getNodeAssets(nodeId);
          console.log(
            '[useUserAssets] Node asset metadata:',
            nodeAssets.length,
            'assets',
          );

          // Create a map of tokenId -> metadata for quick lookup
          const metadataMap = new Map<string, TokenizedAsset>();
          for (const asset of nodeAssets) {
            metadataMap.set(asset.id, asset);
          }

          // For each token in inventory with balance > 0, create an asset entry
          for (let i = 0; i < inventory.tokenIds.length; i++) {
            const tokenId = inventory.tokenIds[i].toString();
            const balance = inventory.balances[i];

            if (balance <= 0n) {
              continue; // Skip zero-balance tokens
            }

            // Get metadata if available
            const metadata = metadataMap.get(tokenId);

            const assetEntry: AssetWithAttributes = {
              id: tokenId,
              amount: balance.toString(),
              name: metadata?.name || `Token #${tokenId.slice(0, 8)}...`,
              class: metadata?.class || 'Unknown',
              fileHash: metadata?.fileHash || '',
              status: 'Active',
              nodeAddress: nodeId,
              nodeLocation: metadata?.nodeLocation || {
                addressName: '',
                location: { lat: '0', lng: '0' },
              },
              price: metadata?.price || '0',
              capacity: metadata?.capacity || '0',
              actualBalance: balance.toString(),
              nodeHash: nodeId,
            };

            allAssets.push(assetEntry);
            console.log(
              '[useUserAssets] Added asset:',
              tokenId,
              'balance:',
              balance.toString(),
              'name:',
              assetEntry.name,
            );
          }
        } catch (nodeError) {
          console.error(
            '[useUserAssets] Error fetching inventory for node',
            nodeId,
            nodeError,
          );
        }
      }

      console.log(
        '[useUserAssets] Total assets with balances from all nodes:',
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
    getNodeInventory,
  ]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchUserAssets();
  }, [fetchUserAssets]);

  /**
   * Convert TokenizedAsset to SellableAsset format
   * Uses actualBalance (real node inventory) instead of capacity (metadata)
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

      // Use actualBalance (real tradable inventory) instead of capacity
      const balance = BigInt(asset.actualBalance || asset.amount || '0');
      if (balance <= 0n) {
        continue; // Skip assets with no tradable balance
      }

      result.push({
        id: asset.id,
        tokenId: asset.id,
        name: asset.name || 'Unknown Asset',
        class: asset.class || 'Unknown',
        balance: balance.toString(), // Use actual balance, not capacity
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
