// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// =============================================================================
// MODULE MOCKS (must be before imports of the mocked modules)
// =============================================================================

vi.mock('@/app/providers/nodes.provider', () => ({
  useNodes: vi.fn(),
}));

vi.mock('@/infrastructure/services/settlement-service', () => ({
  getSettlementService: vi.fn(),
}));

// =============================================================================
// IMPORTS AFTER MOCKS
// =============================================================================

import { useAssetCustody } from '@/hooks/useAssetCustody';
import { useNodes } from '@/app/providers/nodes.provider';
import { getSettlementService } from '@/infrastructure/services/settlement-service';

const mockUseNodes = vi.mocked(useNodes);
const mockGetSettlementService = vi.mocked(getSettlementService);

// =============================================================================
// TEST CONSTANTS
// =============================================================================

const TOKEN_ID = '42';
const NODE_OWNER_1 = '0xOwner1000000000000000000000000000000001';
const NODE_OWNER_2 = '0xOwner2000000000000000000000000000000002';

const makeNode = (owner: string, location?: string) => ({
  owner,
  location: location ? { addressName: location } : undefined,
});

// =============================================================================
// HELPERS
// =============================================================================

let mockService: { getCustodyInfo: ReturnType<typeof vi.fn> };

function setupMocks(nodes = [], serviceOverride?: Partial<typeof mockService>) {
  mockService = {
    getCustodyInfo: vi.fn().mockResolvedValue(0n),
    ...serviceOverride,
  };
  mockGetSettlementService.mockReturnValue(mockService as any);
  mockUseNodes.mockReturnValue({ nodes } as any);
}

// =============================================================================
// TESTS
// =============================================================================

describe('useAssetCustody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Idle / guard conditions
  // ---------------------------------------------------------------------------

  describe('guard conditions', () => {
    it('returns empty state when tokenId is undefined', async () => {
      setupMocks([makeNode(NODE_OWNER_1)]);

      const { result } = renderHook(() => useAssetCustody(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toEqual([]);
      expect(result.current.totalCustodied).toBe(0n);
      expect(result.current.hasAnyCustodian).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockService?.getCustodyInfo).not.toHaveBeenCalled();
    });

    it('returns empty state when tokenId is empty string', async () => {
      setupMocks([makeNode(NODE_OWNER_1)]);

      const { result } = renderHook(() => useAssetCustody(''));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toEqual([]);
      expect(mockService?.getCustodyInfo).not.toHaveBeenCalled();
    });

    it('returns empty state when there are no nodes', async () => {
      setupMocks([]);

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toEqual([]);
      expect(result.current.hasAnyCustodian).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  describe('loading state', () => {
    it('sets isLoading to true while fetching', async () => {
      let resolveFn: (v: bigint) => void;
      const pending = new Promise<bigint>((resolve) => {
        resolveFn = resolve;
      });

      setupMocks([makeNode(NODE_OWNER_1)], {
        getCustodyInfo: vi.fn().mockReturnValue(pending),
      });

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      // Initial render — fetch is in-flight
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      act(() => {
        resolveFn(100n);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Success states
  // ---------------------------------------------------------------------------

  describe('success — single node with custody', () => {
    it('returns the custodied node entry', async () => {
      setupMocks([makeNode(NODE_OWNER_1, 'Farm A')], {
        getCustodyInfo: vi.fn().mockResolvedValue(500n),
      });

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes[0]).toEqual({
        nodeAddress: NODE_OWNER_1,
        nodeLocation: 'Farm A',
        amount: 500n,
      });
      expect(result.current.totalCustodied).toBe(500n);
      expect(result.current.hasAnyCustodian).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('success — multiple nodes', () => {
    it('aggregates entries from all nodes with non-zero custody', async () => {
      const getCustodyInfo = vi
        .fn()
        .mockResolvedValueOnce(300n) // node 1
        .mockResolvedValueOnce(0n) // node 2 — zero, should be excluded
        .mockResolvedValueOnce(200n); // node 3

      setupMocks(
        [
          makeNode(NODE_OWNER_1, 'Farm A'),
          makeNode(NODE_OWNER_2, 'Farm B'),
          makeNode('0xOwner3', 'Farm C'),
        ],
        { getCustodyInfo },
      );

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Node 2 has zero custody so it's excluded
      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.totalCustodied).toBe(500n);
      expect(result.current.hasAnyCustodian).toBe(true);
    });

    it('uses owner address as location when node.location is absent', async () => {
      setupMocks([makeNode(NODE_OWNER_1)], {
        getCustodyInfo: vi.fn().mockResolvedValue(100n),
      });

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes[0].nodeLocation).toBe(NODE_OWNER_1);
    });
  });

  describe('success — all nodes have zero custody', () => {
    it('returns empty nodes array', async () => {
      setupMocks([makeNode(NODE_OWNER_1), makeNode(NODE_OWNER_2)], {
        getCustodyInfo: vi.fn().mockResolvedValue(0n),
      });

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nodes).toEqual([]);
      expect(result.current.totalCustodied).toBe(0n);
      expect(result.current.hasAnyCustodian).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('captures Error message on getCustodyInfo rejection', async () => {
      setupMocks([makeNode(NODE_OWNER_1)], {
        getCustodyInfo: vi.fn().mockRejectedValue(new Error('RPC error')),
      });

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('RPC error');
      expect(result.current.nodes).toEqual([]);
    });

    it('sets generic message for non-Error rejections', async () => {
      setupMocks([makeNode(NODE_OWNER_1)], {
        getCustodyInfo: vi.fn().mockRejectedValue('unknown failure'),
      });

      const { result } = renderHook(() => useAssetCustody(TOKEN_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch custody');
    });
  });

  // ---------------------------------------------------------------------------
  // Reactivity
  // ---------------------------------------------------------------------------

  describe('reactivity', () => {
    it('refetches when tokenId changes', async () => {
      const getCustodyInfo = vi.fn().mockResolvedValue(100n);
      setupMocks([makeNode(NODE_OWNER_1)], { getCustodyInfo });

      const { result, rerender } = renderHook(({ id }) => useAssetCustody(id), {
        initialProps: { id: '1' },
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const firstCallCount = getCustodyInfo.mock.calls.length;

      rerender({ id: '2' });

      await waitFor(() => {
        expect(getCustodyInfo.mock.calls.length).toBeGreaterThan(
          firstCallCount,
        );
      });
    });
  });
});
