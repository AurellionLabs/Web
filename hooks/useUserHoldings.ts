'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
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
const GET_ALL_ASSETS = `
  query GetAllAssets($limit: Int!) {
    assetss(limit: $limit, orderBy: "tokenId", orderDirection: "asc") {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
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
      // Step 1: Get all known assets from the indexer
      const assetsResponse = await graphqlRequest<{
        assetss: {
          items: Array<{
            id: string;
            hash: string;
            tokenId: string;
            name: string;
            assetClass: string;
            className: string;
            account: string;
          }>;
        };
      }>(NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL, GET_ALL_ASSETS, { limit: 1000 });

      const knownAssets = assetsResponse.assetss?.items || [];

      if (knownAssets.length === 0) {
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
      // Use balanceOfBatch for efficiency
      const tokenIds = knownAssets.map((a: { tokenId: string }) =>
        BigInt(a.tokenId),
      );
      const accounts = tokenIds.map(() => address);

      let balances: bigint[];
      try {
        balances = await auraAssetContract.balanceOfBatch(accounts, tokenIds);
      } catch (batchError) {
        // Fallback to individual queries if batch fails
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
      for (let i = 0; i < knownAssets.length; i++) {
        const balance = balances[i];
        if (balance > 0n) {
          const asset = knownAssets[i];
          userHoldings.push({
            tokenId: asset.tokenId,
            balance: balance,
            name: asset.name,
            assetClass: asset.assetClass,
            className: asset.className,
            originNode: asset.account, // The node that minted the asset
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
