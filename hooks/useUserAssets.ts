'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import { NEXT_PUBLIC_INDEXER_URL } from '@/chain-constants';
import { SellableAsset } from '@/app/components/trading/trade-panel';

/**
 * GraphQL query to get user's token balances
 */
const GET_USER_BALANCES = `
  query GetUserBalances($user: String!) {
    userBalancess(where: { user: $user }, limit: 100) {
      items {
        id
        user
        tokenId
        balance
        asset
        lastUpdated
      }
    }
  }
`;

/**
 * GraphQL query to get asset metadata by token IDs
 */
const GET_ASSETS_BY_TOKEN_IDS = `
  query GetAssetsByTokenIds($tokenIds: [BigInt!]!) {
    assetss(where: { tokenId_in: $tokenIds }, limit: 100) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
      }
    }
  }
`;

/**
 * GraphQL query to get node asset prices
 */
const GET_NODE_ASSET_PRICES = `
  query GetNodeAssetPrices($tokenIds: [BigInt!]!) {
    nodeAssetss(where: { tokenId_in: $tokenIds }, limit: 100) {
      items {
        tokenId
        price
        node
      }
    }
  }
`;

interface UserBalanceResponse {
  userBalancess: {
    items: Array<{
      id: string;
      user: string;
      tokenId: string;
      balance: string;
      asset: string;
      lastUpdated: string;
    }>;
  };
}

interface AssetMetadataResponse {
  assetss: {
    items: Array<{
      id: string;
      hash: string;
      tokenId: string;
      name: string;
      assetClass: string;
      className: string;
    }>;
  };
}

interface NodeAssetPriceResponse {
  nodeAssetss: {
    items: Array<{
      tokenId: string;
      price: string;
      node: string;
    }>;
  };
}

/**
 * Hook to fetch user's owned assets with balances
 *
 * @param filterClass - Optional asset class to filter by
 * @returns User's sellable assets with balances and metadata
 */
export function useUserAssets(filterClass?: string) {
  const { address, isConnected } = useWallet();
  const [balances, setBalances] = useState<
    UserBalanceResponse['userBalancess']['items']
  >([]);
  const [metadata, setMetadata] = useState<
    Map<string, AssetMetadataResponse['assetss']['items'][0]>
  >(new Map());
  const [prices, setPrices] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user balances and related metadata
   */
  const fetchUserAssets = useCallback(async () => {
    if (!isConnected || !address) {
      setBalances([]);
      setMetadata(new Map());
      setPrices(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch user's token balances
      console.log('[useUserAssets] Fetching balances for:', address);
      const balanceResponse = await graphqlRequest<UserBalanceResponse>(
        NEXT_PUBLIC_INDEXER_URL,
        GET_USER_BALANCES,
        { user: address.toLowerCase() },
      );

      const userBalances = balanceResponse.userBalancess?.items || [];
      console.log('[useUserAssets] Found balances:', userBalances.length);

      // Filter out zero balances
      const nonZeroBalances = userBalances.filter(
        (b) => BigInt(b.balance) > 0n,
      );

      if (nonZeroBalances.length === 0) {
        setBalances([]);
        setMetadata(new Map());
        setPrices(new Map());
        setIsLoading(false);
        return;
      }

      setBalances(nonZeroBalances);

      // Step 2: Fetch asset metadata for these token IDs
      const tokenIds = nonZeroBalances.map((b) => b.tokenId);
      console.log('[useUserAssets] Fetching metadata for tokenIds:', tokenIds);

      const [metadataResponse, priceResponse] = await Promise.all([
        graphqlRequest<AssetMetadataResponse>(
          NEXT_PUBLIC_INDEXER_URL,
          GET_ASSETS_BY_TOKEN_IDS,
          { tokenIds },
        ),
        graphqlRequest<NodeAssetPriceResponse>(
          NEXT_PUBLIC_INDEXER_URL,
          GET_NODE_ASSET_PRICES,
          { tokenIds },
        ),
      ]);

      // Build metadata map
      const metaMap = new Map<
        string,
        AssetMetadataResponse['assetss']['items'][0]
      >();
      (metadataResponse.assetss?.items || []).forEach((asset) => {
        metaMap.set(asset.tokenId, asset);
      });
      setMetadata(metaMap);

      // Build price map (use first price found for each tokenId)
      const priceMap = new Map<string, string>();
      (priceResponse.nodeAssetss?.items || []).forEach((nodeAsset) => {
        if (!priceMap.has(nodeAsset.tokenId)) {
          priceMap.set(nodeAsset.tokenId, nodeAsset.price);
        }
      });
      setPrices(priceMap);

      console.log(
        '[useUserAssets] Loaded metadata for',
        metaMap.size,
        'assets',
      );
    } catch (err) {
      console.error('[useUserAssets] Error fetching user assets:', err);
      setError('Failed to fetch your assets');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchUserAssets();
  }, [fetchUserAssets]);

  /**
   * Convert balances + metadata to SellableAsset format
   */
  const sellableAssets = useMemo((): SellableAsset[] => {
    const result: SellableAsset[] = [];

    for (const balance of balances) {
      const meta = metadata.get(balance.tokenId);

      // Skip if no metadata found
      if (!meta) {
        continue;
      }

      // Apply class filter if specified
      if (
        filterClass &&
        meta.assetClass?.toLowerCase() !== filterClass.toLowerCase()
      ) {
        continue;
      }

      const price = prices.get(balance.tokenId);

      result.push({
        id: balance.id,
        tokenId: balance.tokenId,
        name: meta.name || 'Unknown Asset',
        class: meta.assetClass || meta.className || 'Unknown',
        balance: balance.balance,
        price: price ? (Number(price) / 1e18).toFixed(2) : undefined,
      });
    }

    return result;
  }, [balances, metadata, prices, filterClass]);

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
