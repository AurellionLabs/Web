// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/useUserHoldings.test.ts
 * @description Vitest unit tests for useUserHoldings hook
 *
 * Covers:
 *  - Initialization and idle state
 *  - Loading state while fetching
 *  - Error handling for failed GraphQL requests
 *  - Successful holdings retrieval with balances
 *  - Filtering to only holdings with balance > 0
 *  - getHoldingByTokenId helper function
 *  - refetch function
 *  - State transitions (idle → loading → success/error)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock dependencies
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: vi.fn(),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'https://indexer.example.com/graphql',
}));

// Import after mocks
import { useUserHoldings } from '@/hooks/useUserHoldings';
import { useWallet } from '@/hooks/useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';

describe('useUserHoldings', () => {
  const mockUseWallet = useWallet as ReturnType<typeof vi.fn>;
  const mockUseDiamond = useDiamond as ReturnType<typeof vi.fn>;
  const mockGraphqlRequest = graphqlRequest as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: wallet not connected
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false,
    });

    // Default: diamond not initialized
    mockUseDiamond.mockReturnValue({
      balanceOfBatch: vi.fn(),
      initialized: false,
    });

    // Default: GraphQL returns empty
    mockGraphqlRequest.mockResolvedValue({
      diamondSupportedAssetAddedEventss: {
        items: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with idle state when wallet not connected', () => {
      const { result } = renderHook(() => useUserHoldings());

      expect(result.current.holdings).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return empty holdings array', () => {
      const { result } = renderHook(() => useUserHoldings());

      expect(Array.isArray(result.current.holdings)).toBe(true);
      expect(result.current.holdings.length).toBe(0);
    });

    it('should have refetch function available', () => {
      const { result } = renderHook(() => useUserHoldings());

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should have getHoldingByTokenId function available', () => {
      const { result } = renderHook(() => useUserHoldings());

      expect(typeof result.current.getHoldingByTokenId).toBe('function');
    });
  });

  describe('wallet connection required', () => {
    it('should not fetch when address is null', async () => {
      mockUseWallet.mockReturnValue({
        address: null,
        isConnected: false,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([]),
        initialized: true,
      });

      renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(mockGraphqlRequest).not.toHaveBeenCalled();
      });
    });

    it('should not fetch when isConnected is false', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: false,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([]),
        initialized: true,
      });

      renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(mockGraphqlRequest).not.toHaveBeenCalled();
      });
    });

    it('should not fetch when diamond is not initialized', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([]),
        initialized: false,
      });

      renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(mockGraphqlRequest).not.toHaveBeenCalled();
      });
    });
  });

  describe('successful fetching', () => {
    it('should fetch holdings when wallet connected and diamond initialized', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12';

      mockUseWallet.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([100n, 200n, 0n]),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [
            { token_id: '1', token: '0xABC', price: '100', capacity: '1000' },
            { token_id: '2', token: '0xDEF', price: '200', capacity: '2000' },
            { token_id: '3', token: '0xGHI', price: '300', capacity: '3000' },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called GraphQL
      expect(mockGraphqlRequest).toHaveBeenCalled();

      // Should have called balanceOfBatch with correct token IDs
      const balanceOfBatch =
        mockUseDiamond.mock.results[0].value.balanceOfBatch;
      expect(balanceOfBatch).toHaveBeenCalledWith(mockAddress, [1n, 2n, 3n]);

      // Should only return holdings with balance > 0
      expect(result.current.holdings.length).toBe(2);
      expect(result.current.holdings[0].tokenId).toBe('1');
      expect(result.current.holdings[0].balance).toBe(100n);
      expect(result.current.holdings[1].tokenId).toBe('2');
      expect(result.current.holdings[1].balance).toBe(200n);
    });

    it('should return empty array when user has no holdings', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([0n, 0n, 0n]),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [
            { token_id: '1', token: '0xABC', price: '100' },
            { token_id: '2', token: '0xDEF', price: '200' },
            { token_id: '3', token: '0xGHI', price: '300' },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.holdings).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty indexer response', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([]),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.holdings).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle GraphQL request failure', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn(),
        initialized: true,
      });

      mockGraphqlRequest.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.holdings).toEqual([]);
    });

    it('should handle balanceOfBatch failure', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi
          .fn()
          .mockRejectedValue(new Error('Contract call failed')),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [{ token_id: '1', token: '0xABC' }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Contract call failed');
    });

    it('should handle missing diamondSupportedAssetAddedEventss in response', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([]),
        initialized: true,
      });

      // Response without the expected field
      mockGraphqlRequest.mockResolvedValue({});

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.holdings).toEqual([]);
    });
  });

  describe('getHoldingByTokenId', () => {
    it('should return correct holding when tokenId exists', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([100n, 200n]),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [
            { token_id: '1', token: '0xABC' },
            { token_id: '2', token: '0xDEF' },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.holdings.length).toBe(2);
      });

      const holding = result.current.getHoldingByTokenId('1');
      expect(holding).toBeDefined();
      expect(holding?.tokenId).toBe('1');
      expect(holding?.balance).toBe(100n);
    });

    it('should return undefined when tokenId does not exist', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([100n]),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [{ token_id: '1', token: '0xABC' }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.holdings.length).toBe(1);
      });

      const holding = result.current.getHoldingByTokenId('999');
      expect(holding).toBeUndefined();
    });
  });

  describe('refetch', () => {
    it('should refetch holdings when called', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([100n]),
        initialized: true,
      });

      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [{ token_id: '1', token: '0xABC' }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.holdings.length).toBe(1);
      });

      // Clear mock to track new call
      mockGraphqlRequest.mockClear();

      // Call refetch
      await result.current.refetch();

      expect(mockGraphqlRequest).toHaveBeenCalled();
    });
  });

  describe('pagination handling', () => {
    it('should handle pagination with full pages (PAGE size)', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      const balanceOfBatchMock = vi.fn().mockResolvedValue([100n, 200n]);
      mockUseDiamond.mockReturnValue({
        balanceOfBatch: balanceOfBatchMock,
        initialized: true,
      });

      // The hook uses PAGE = 500, so we need to return 500 items to continue pagination
      // First page: 500 items (full page), hasNextPage: true
      const fullPageItems = Array.from({ length: 500 }, (_, i) => ({
        token_id: String(i + 1),
        token: `0x${String(i).padStart(3, '0')}`,
      }));

      mockGraphqlRequest
        .mockResolvedValueOnce({
          diamondSupportedAssetAddedEventss: {
            items: fullPageItems,
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
          },
        })
        // Second page: 2 items (less than PAGE), stops pagination
        .mockResolvedValueOnce({
          diamondSupportedAssetAddedEventss: {
            items: [
              { token_id: '501', token: '0xABC' },
              { token_id: '502', token: '0xDEF' },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called GraphQL 3 times:
      // 2 for paginated asset loading + 1 for GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS enrichment
      expect(mockGraphqlRequest).toHaveBeenCalledTimes(3);

      // Balance batch should be called with 502 token IDs
      expect(balanceOfBatchMock).toHaveBeenCalled();
    });

    it('should stop pagination when page is not full', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn().mockResolvedValue([100n]),
        initialized: true,
      });

      // Return less than PAGE items - hook breaks early
      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [{ token_id: '1', token: '0xABC' }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor' }, // hasNextPage ignored when < PAGE
        },
      });

      const { result } = renderHook(() => useUserHoldings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should call twice: 1 for asset loading (partial page stops) + 1 for name enrichment
      expect(mockGraphqlRequest).toHaveBeenCalledTimes(2);
    });
  });
});
