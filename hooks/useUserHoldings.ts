'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';
import {
  GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS,
  type MintedAssetEventsResponse,
} from '@/infrastructure/shared/graph-queries';

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
 * Hook for fetching user's ERC1155 token holdings from Diamond AssetsFacet
 *
 * This hook:
 * 1. Queries the indexer for all known tokenIds
 * 2. Uses DiamondProvider's balanceOfBatch for efficient balance queries
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
  const { balanceOfBatch, initialized: diamondInitialized } = useDiamond();
  const [state, setState] = useState<HoldingsState>({ status: 'idle' });

  // Derived state
  const holdings = state.status === 'success' ? state.holdings : [];
  const isLoading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;

  /**
   * Fetch user holdings
   */
  const fetchHoldings = useCallback(async () => {
    if (!address || !isConnected || !diamondInitialized) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });

    try {
      // Step 1: Get all known tokenIds from the indexer via raw events
      // We only need unique tokenIds, not per-node entries
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
          getCurrentIndexerUrl(),
          GET_ALL_SUPPORTED_ASSETS,
          { limit: PAGE, after },
        )) as AssetsResponse;

        const items =
          assetsResponse.diamondSupportedAssetAddedEventss?.items || [];
        if (items.length === 0) break;

        for (const item of items) {
          // Only use token_id for deduplication since we query the same contract
          // Multiple nodes can have the same asset, but user balance is per tokenId
          tokenIdSet.add(item.token_id);
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

      const uniqueTokenIds = Array.from(tokenIdSet);

      if (uniqueTokenIds.length === 0) {
        setState({ status: 'success', holdings: [] });
        return;
      }

      // Step 2: Query balances using DiamondProvider's batch method
      const tokenIds = uniqueTokenIds.map((id) => BigInt(id));
      const balances = await balanceOfBatch(address, tokenIds);

      // Step 3: Filter to only holdings with balance > 0
      const heldTokenIds: string[] = [];
      const heldBalances: bigint[] = [];
      for (let i = 0; i < uniqueTokenIds.length; i++) {
        if (balances[i] > 0n) {
          heldTokenIds.push(uniqueTokenIds[i]);
          heldBalances.push(balances[i]);
        }
      }

      // Step 4: Enrich with asset name/class from MintedAsset events
      const assetMetaMap = new Map<
        string,
        { name: string; assetClass: string }
      >();
      if (heldTokenIds.length > 0) {
        try {
          const mintedResp = await graphqlRequest<MintedAssetEventsResponse>(
            getCurrentIndexerUrl(),
            GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS,
            { tokenIds: heldTokenIds, limit: 500 },
          );
          const mintedItems = mintedResp.diamondMintedAssetEventss?.items || [];
          for (const item of mintedItems) {
            // First event per tokenId wins (latest is first due to desc order)
            if (!assetMetaMap.has(item.token_id)) {
              assetMetaMap.set(item.token_id, {
                name: item.name || '',
                assetClass: item.asset_class || '',
              });
            }
          }
        } catch (metaErr) {
          // Non-fatal — holdings still usable without names
          console.warn(
            '[useUserHoldings] Failed to fetch asset metadata:',
            metaErr,
          );
        }
      }

      const userHoldings: UserHolding[] = heldTokenIds.map((tid, i) => {
        const meta = assetMetaMap.get(tid);
        return {
          tokenId: tid,
          balance: heldBalances[i],
          name: meta?.name || '',
          assetClass: meta?.assetClass || '',
          className: meta?.assetClass || '',
          originNode: '',
        };
      });
      setState({ status: 'success', holdings: userHoldings });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load holdings';
      console.error('[useUserHoldings] Error fetching holdings:', err);
      setState({ status: 'error', error: message });
    }
  }, [address, isConnected, diamondInitialized, balanceOfBatch]);

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
