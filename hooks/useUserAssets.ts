'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import { NEXT_PUBLIC_INDEXER_URL } from '@/chain-constants';
import { SellableAsset } from '@/app/components/trading/trade-panel';

/**
 * GraphQL query to get user's ERC1155 token balances (from transfers)
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
 * GraphQL query to get node's inventory (for nodes selling their assets)
 * This returns assets the node has minted and can sell
 */
const GET_NODE_INVENTORY = `
  query GetNodeInventory($node: String!) {
    nodeAssetss(where: { node: $node }, limit: 100) {
      items {
        id
        node
        tokenId
        capacity
        price
        token
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

interface NodeInventoryResponse {
  nodeAssetss: {
    items: Array<{
      id: string;
      node: string;
      tokenId: string;
      capacity: string;
      price: string;
      token: string;
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

interface BalanceItem {
  id: string;
  tokenId: string;
  balance: string;
  price?: string;
}

/**
 * Hook to fetch user's owned assets with balances
 *
 * For nodes: Uses nodeAssets inventory (capacity)
 * For customers: Uses userBalances (ERC1155 token holdings)
 *
 * @param filterClass - Optional asset class to filter by
 * @returns User's sellable assets with balances and metadata
 */
export function useUserAssets(filterClass?: string) {
  const { address, isConnected } = useWallet();
  const { selectedNodeAddress } = useSelectedNode();

  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [metadata, setMetadata] = useState<
    Map<string, AssetMetadataResponse['assetss']['items'][0]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user balances and related metadata
   * Checks both node inventory (if user is a node) and ERC1155 balances
   */
  const fetchUserAssets = useCallback(async () => {
    if (!isConnected || !address) {
      setBalances([]);
      setMetadata(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allBalances: BalanceItem[] = [];

      // Step 1a: If user has a selected node, fetch node inventory
      if (selectedNodeAddress) {
        console.log(
          '[useUserAssets] Fetching node inventory for:',
          selectedNodeAddress,
        );
        const nodeResponse = await graphqlRequest<NodeInventoryResponse>(
          NEXT_PUBLIC_INDEXER_URL,
          GET_NODE_INVENTORY,
          { node: selectedNodeAddress.toLowerCase() },
        );

        const nodeAssets = nodeResponse.nodeAssetss?.items || [];
        console.log('[useUserAssets] Found node assets:', nodeAssets.length);

        // Convert node assets to balance items (capacity = balance for nodes)
        nodeAssets.forEach((na) => {
          if (BigInt(na.capacity) > 0n) {
            allBalances.push({
              id: na.id,
              tokenId: na.tokenId,
              balance: na.capacity,
              price: na.price,
            });
          }
        });
      }

      // Step 1b: Also fetch user's ERC1155 token balances (in case they received tokens)
      console.log('[useUserAssets] Fetching ERC1155 balances for:', address);
      const balanceResponse = await graphqlRequest<UserBalanceResponse>(
        NEXT_PUBLIC_INDEXER_URL,
        GET_USER_BALANCES,
        { user: address.toLowerCase() },
      );

      const userBalances = balanceResponse.userBalancess?.items || [];
      console.log('[useUserAssets] Found user balances:', userBalances.length);

      // Add user balances (avoiding duplicates with node inventory)
      const existingTokenIds = new Set(allBalances.map((b) => b.tokenId));
      userBalances.forEach((ub) => {
        if (BigInt(ub.balance) > 0n && !existingTokenIds.has(ub.tokenId)) {
          allBalances.push({
            id: ub.id,
            tokenId: ub.tokenId,
            balance: ub.balance,
          });
        }
      });

      if (allBalances.length === 0) {
        setBalances([]);
        setMetadata(new Map());
        setIsLoading(false);
        return;
      }

      setBalances(allBalances);

      // Step 2: Fetch asset metadata for all token IDs
      const tokenIds = allBalances.map((b) => b.tokenId);
      console.log(
        '[useUserAssets] Fetching metadata for',
        tokenIds.length,
        'tokenIds',
      );

      const metadataResponse = await graphqlRequest<AssetMetadataResponse>(
        NEXT_PUBLIC_INDEXER_URL,
        GET_ASSETS_BY_TOKEN_IDS,
        { tokenIds },
      );

      // Build metadata map
      const metaMap = new Map<
        string,
        AssetMetadataResponse['assetss']['items'][0]
      >();
      (metadataResponse.assetss?.items || []).forEach((asset) => {
        metaMap.set(asset.tokenId, asset);
      });
      setMetadata(metaMap);

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
  }, [address, isConnected, selectedNodeAddress]);

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

      result.push({
        id: balance.id,
        tokenId: balance.tokenId,
        name: meta.name || 'Unknown Asset',
        class: meta.assetClass || meta.className || 'Unknown',
        balance: balance.balance,
        price: balance.price
          ? (Number(balance.price) / 1e18).toFixed(2)
          : undefined,
      });
    }

    return result;
  }, [balances, metadata, filterClass]);

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
