// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/useUserHoldings.test.ts
 * @description Vitest unit tests for useUserHoldings hook
 *
 * Covers:
 *  - Initialization and idle state
 *  - Guards against fetching when wallet not connected
 *  - Error handling for failed GraphQL requests
 *  - getHoldingByTokenId helper function
 *  - refetch function
 *
 * Note: Full contract call testing requires integration-level mocking
 * that is covered by e2e tests. Unit tests focus on hook logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

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
  NEXT_PUBLIC_INDEXER_URL: 'https://indexer.example.com/graphql',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x1234567890123456789012345678901234567890',
}));

// Mock RepositoryContext to prevent real contract calls
vi.mock('@/infrastructure/contexts/repository-context', () => ({
  RepositoryContext: {
    getInstance: () => ({
      getProvider: () => ({}),
    }),
  },
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

  describe('wallet connection guards', () => {
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

      // Should handle gracefully and return empty holdings
      expect(result.current.holdings).toEqual([]);
    });
  });

  describe('getHoldingByTokenId', () => {
    it('should return undefined for empty holdings', () => {
      const { result } = renderHook(() => useUserHoldings());

      const holding = result.current.getHoldingByTokenId('1');
      expect(holding).toBeUndefined();
    });
  });

  describe('refetch', () => {
    it('should have refetch that can be called even when idle', async () => {
      mockUseWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0AB12',
        isConnected: true,
      });

      mockUseDiamond.mockReturnValue({
        balanceOfBatch: vi.fn(),
        initialized: true,
      });

      const { result } = renderHook(() => useUserHoldings());

      // refetch should be callable without throwing
      await expect(result.current.refetch()).resolves.not.toThrow();
    });
  });
});
