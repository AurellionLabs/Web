'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
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
 * GraphQL query to get nodes owned by a wallet address
 */
const GET_NODES_BY_OWNER = `
  query GetNodesByOwner($ownerAddress: String!) {
    nodess(where: { owner: $ownerAddress }) {
      items {
        id
        owner
        status
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

/**
 * GraphQL query to get asset attributes by asset IDs (hashes)
 */
const GET_ASSET_ATTRIBUTES = `
  query GetAssetAttributes($assetIds: [String!]!) {
    assetAttributess(where: { assetId_in: $assetIds }, limit: 500) {
      items {
        id
        assetId
        name
        values
        description
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

interface NodesByOwnerResponse {
  nodess: {
    items: Array<{
      id: string;
      owner: string;
      status: string;
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

interface AssetAttributesResponse {
  assetAttributess: {
    items: Array<{
      id: string;
      assetId: string;
      name: string;
      values: string; // JSON array string like '["M"]'
      description: string;
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
 * Fetches inventory from ALL nodes owned by the wallet plus ERC1155 balances.
 * No node selection required - automatically aggregates from all owned nodes.
 *
 * @param filterClass - Optional asset class to filter by
 * @returns User's sellable assets with balances and metadata
 */
export function useUserAssets(filterClass?: string) {
  const { address, isConnected } = useWallet();

  // Log context state on each render for debugging
  console.log('[useUserAssets] Hook called with:', {
    filterClass,
    isConnected,
    address: address ? address.slice(0, 10) + '...' : 'none',
  });

  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [metadata, setMetadata] = useState<
    Map<string, AssetMetadataResponse['assetss']['items'][0]>
  >(new Map());
  const [attributes, setAttributes] = useState<
    Map<string, Array<{ name: string; value: string }>>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user balances and related metadata
   * Fetches inventory from ALL owned nodes (not just selected one) plus ERC1155 balances
   */
  const fetchUserAssets = useCallback(async () => {
    console.log('[useUserAssets] fetchUserAssets called', {
      isConnected,
      address,
    });

    if (!isConnected || !address) {
      console.log(
        '[useUserAssets] Not connected or no address, skipping fetch',
      );
      setBalances([]);
      setMetadata(new Map());
      setIsLoading(false);
      return;
    }

    console.log('[useUserAssets] Starting fetch for address:', address);

    setIsLoading(true);
    setError(null);

    try {
      const allBalances: BalanceItem[] = [];
      const processedNodeAddresses = new Set<string>();

      // Step 1: Get ALL nodes owned by this wallet and fetch their inventory
      console.log(
        '[useUserAssets] Checking for owned nodes by:',
        address.toLowerCase(),
      );
      const nodesResponse = await graphqlRequest<NodesByOwnerResponse>(
        NEXT_PUBLIC_INDEXER_URL,
        GET_NODES_BY_OWNER,
        { ownerAddress: address.toLowerCase() },
      );

      const ownedNodes = nodesResponse.nodess?.items || [];
      console.log(
        '[useUserAssets] Found owned nodes:',
        ownedNodes.length,
        ownedNodes.map((n) => n.id),
      );

      // Fetch inventory for each owned node
      for (const node of ownedNodes) {
        if (processedNodeAddresses.has(node.id.toLowerCase())) {
          continue; // Already processed this node
        }
        processedNodeAddresses.add(node.id.toLowerCase());

        console.log(
          '[useUserAssets] Fetching inventory for owned node:',
          node.id,
        );
        const nodeResponse = await graphqlRequest<NodeInventoryResponse>(
          NEXT_PUBLIC_INDEXER_URL,
          GET_NODE_INVENTORY,
          { node: node.id.toLowerCase() },
        );

        const nodeAssets = nodeResponse.nodeAssetss?.items || [];
        console.log(
          '[useUserAssets] Found owned node assets:',
          nodeAssets.length,
        );

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

      // Step 2: Also fetch user's ERC1155 token balances (in case they received tokens)
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

      // Step 3: Fetch asset metadata for all token IDs
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

      // Build metadata map (keyed by tokenId)
      const metaMap = new Map<
        string,
        AssetMetadataResponse['assetss']['items'][0]
      >();
      const assetIds: string[] = [];
      (metadataResponse.assetss?.items || []).forEach((asset) => {
        metaMap.set(asset.tokenId, asset);
        // Collect asset hashes for attribute lookup
        if (asset.hash) {
          assetIds.push(asset.hash);
        }
      });
      setMetadata(metaMap);

      console.log(
        '[useUserAssets] Loaded metadata for',
        metaMap.size,
        'assets',
      );

      // Step 4: Fetch attributes for all assets
      if (assetIds.length > 0) {
        console.log(
          '[useUserAssets] Fetching attributes for',
          assetIds.length,
          'assets',
        );
        const attributesResponse =
          await graphqlRequest<AssetAttributesResponse>(
            NEXT_PUBLIC_INDEXER_URL,
            GET_ASSET_ATTRIBUTES,
            { assetIds },
          );

        // Build attributes map (keyed by assetId/hash)
        const attrMap = new Map<
          string,
          Array<{ name: string; value: string }>
        >();
        (attributesResponse.assetAttributess?.items || []).forEach((attr) => {
          const existing = attrMap.get(attr.assetId) || [];
          // Parse the JSON values array and take first value
          let value = '';
          try {
            const parsed = JSON.parse(attr.values);
            value = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
          } catch {
            value = attr.values;
          }
          existing.push({ name: attr.name, value });
          attrMap.set(attr.assetId, existing);
        });
        setAttributes(attrMap);

        console.log(
          '[useUserAssets] Loaded attributes for',
          attrMap.size,
          'assets',
        );
      }
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
   * This aggregates assets from ALL nodes owned by the user
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

      // Get attributes for this asset (keyed by hash)
      const assetAttributes = meta.hash ? attributes.get(meta.hash) : undefined;

      result.push({
        id: balance.id,
        tokenId: balance.tokenId,
        name: meta.name || 'Unknown Asset',
        class: meta.assetClass || meta.className || 'Unknown',
        balance: balance.balance,
        price: balance.price
          ? (Number(balance.price) / 1e18).toFixed(2)
          : undefined,
        attributes: assetAttributes,
      });
    }

    console.log('[useUserAssets] Sellable assets:', result.length);
    return result;
  }, [balances, metadata, attributes, filterClass]);

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
