'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
  NEXT_PUBLIC_INDEXER_URL,
} from '@/chain-constants';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

/**
 * Represents a user's holding of a tokenized asset
 */
export interface UserHolding {
  tokenId: string;
  balance: bigint;
  name: string;
  assetClass: string;
  className: string;
  // Optional metadata from indexer
  attributes?: Array<{
    name: string;
    values: string[];
    description: string;
  }>;
  // Node where the physical asset is stored (for redemption)
  originNode?: string;
}

/**
 * State type for the hook
 */
type HoldingsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; holdings: UserHolding[] };

/**
 * Return type for the useUserHoldings hook
 */
export interface UseUserHoldingsReturn {
  /** User's token holdings */
  holdings: UserHolding[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch holdings */
  refetch: () => Promise<void>;
  /** Get a specific holding by tokenId */
  getHoldingByTokenId: (tokenId: string) => UserHolding | undefined;
}

// ERC1155 ABI for balance queries
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
];

// GraphQL query to get all known assets from the indexer
const GET_ALL_SUPPORTED_ASSETS = `
  query GetAllSupportedAssets($limit: Int!, $after: String) {
    diamondSupportedAssetAddedEventss(limit: $limit, after: $after) {
      items {
        id
        node_hash
        token
        token_id
        price
        capacity
        block_timestamp
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Hook for fetching user's ERC1155 token holdings from AuraAsset contract
 *
 * This hook:
 * 1. Queries the indexer for all known tokenIds
 * 2. Queries the ERC1155 contract for user's balance of each tokenId
 * 3. Returns holdings with balance > 0 along with asset metadata
 *
 * Used in the customer dashboard to show owned assets and enable redemption
 *
 * @example
 * ```tsx
 * const { holdings, isLoading, error, refetch } = useUserHoldings();
 *
 * // Display holdings
 * holdings.map(h => (
 *   <div key={h.tokenId}>
 *     {h.name} - Balance: {h.balance.toString()}
 *     <button onClick={() => handleRedeem(h.tokenId)}>Redeem</button>
 *   </div>
 * ))
 * ```
 */
export function useUserHoldings(): UseUserHoldingsReturn {
  const { address, isConnected } = useWallet();
  const [state, setState] = useState<HoldingsState>({ status: 'idle' });

  // Derived state
  const holdings = state.status === 'success' ? state.holdings : [];
  const isLoading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;

  /**
   * Fetch user holdings
   */
  const fetchHoldings = useCallback(async () => {
    if (!address || !isConnected) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });

    try {
      // Step 1: Get all known tokenIds from the indexer via raw events
      const PAGE = 500;
      const tokenIdSet = new Set<string>();
      let after: string | undefined = undefined;
      let hasNextPage = true;
      const MAX_ITERATIONS = 50;
      let iterations = 0;

      while (hasNextPage && iterations < MAX_ITERATIONS) {
        type AssetsResponse = {
          diamondSupportedAssetAddedEventss: {
            items: Array<{
              id: string;
              node_hash: string;
              token: string;
              token_id: string;
              price: string;
              capacity: string;
              block_timestamp: string;
            }>;
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        };
        const assetsResponse = (await graphqlRequest<AssetsResponse>(
          NEXT_PUBLIC_INDEXER_URL,
          GET_ALL_SUPPORTED_ASSETS,
          { limit: PAGE, after },
        )) as AssetsResponse;

        const items =
          assetsResponse.diamondSupportedAssetAddedEventss?.items || [];
        if (items.length === 0) break;

        for (const item of items) {
          const key = `${item.token}-${item.token_id}`;
          tokenIdSet.add(key);
        }

        hasNextPage =
          assetsResponse.diamondSupportedAssetAddedEventss?.pageInfo
            ?.hasNextPage || false;
        after =
          assetsResponse.diamondSupportedAssetAddedEventss?.pageInfo
            ?.endCursor ?? undefined;
        iterations++;

        if (items.length < PAGE) break;
      }

      const uniqueAssets = Array.from(tokenIdSet).map((key) => {
        const [token, tokenId] = key.split('-');
        return { token, tokenId };
      });

      if (uniqueAssets.length === 0) {
        setState({ status: 'success', holdings: [] });
        return;
      }

      // Step 2: Get provider from repository context
      const repositoryContext = RepositoryContext.getInstance();
      const provider = repositoryContext.getProvider();

      // Step 3: Create contract instance
      const auraAssetContract = new ethers.Contract(
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        ERC1155_ABI,
        provider,
      );

      // Step 4: Query balances for all known tokenIds
      const tokenIds = uniqueAssets.map((a) => BigInt(a.tokenId));
      const accounts = tokenIds.map(() => address);

      let balances: bigint[];
      try {
        balances = await auraAssetContract.balanceOfBatch(accounts, tokenIds);
      } catch (batchError) {
        console.warn(
          '[useUserHoldings] Batch query failed, falling back to individual queries',
          batchError,
        );
        balances = await Promise.all(
          tokenIds.map((tokenId: bigint) =>
            auraAssetContract.balanceOf(address, tokenId),
          ),
        );
      }

      // Step 5: Filter to only holdings with balance > 0
      const userHoldings: UserHolding[] = [];
      for (let i = 0; i < uniqueAssets.length; i++) {
        const balance = balances[i];
        if (balance > 0n) {
          const asset = uniqueAssets[i];
          userHoldings.push({
            tokenId: asset.tokenId,
            balance: balance,
            name: '',
            assetClass: '',
            className: '',
            originNode: '',
          });
        }
      }

      console.log(
        `[useUserHoldings] Found ${userHoldings.length} holdings for ${address}`,
      );
      setState({ status: 'success', holdings: userHoldings });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load holdings';
      console.error('[useUserHoldings] Error fetching holdings:', err);
      setState({ status: 'error', error: message });
    }
  }, [address, isConnected]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  /**
   * Get a specific holding by tokenId
   */
  const getHoldingByTokenId = useCallback(
    (tokenId: string) => {
      return holdings.find((h) => h.tokenId === tokenId);
    },
    [holdings],
  );

  return useMemo(
    () => ({
      holdings,
      isLoading,
      error,
      refetch: fetchHoldings,
      getHoldingByTokenId,
    }),
    [holdings, isLoading, error, fetchHoldings, getHoldingByTokenId],
  );
}

export default useUserHoldings;
