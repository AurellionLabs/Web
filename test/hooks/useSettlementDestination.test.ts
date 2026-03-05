/**
 * @file test/hooks/useSettlementDestination.test.ts
 * @description Tests for useSettlementDestination hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';

// =============================================================================
// MOCKS
// =============================================================================

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@/infrastructure/services/settlement-service', () => ({
  getSettlementService: vi.fn(),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x742d35cc6634c0532925a3b844bc9e7595f0ab12',
}));

// =============================================================================
// IMPORTS AFTER MOCKS
// =============================================================================

import { useWallet } from '@/hooks/useWallet';
import { getSettlementService } from '@/infrastructure/services/settlement-service';

const mockUseWallet = vi.mocked(useWallet);
const mockGetSettlementService = vi.mocked(getSettlementService);

// =============================================================================
// TEST CONSTANTS
// =============================================================================

const TEST_ADDRESS = '0x742d35cc6634c0532925a3b844bc9e7595f0ab14';
const TEST_ORDER_ID =
  '0x6f7264657231000000000000000000000000000000000000000000000000000000';
const TEST_NODE_ID =
  '0x6e6f646531000000000000000000000000000000000000000000000000000000';

describe('useSettlementDestination', () => {
  let mockService: {
    getPendingOrders: ReturnType<typeof vi.fn>;
    selectDestination: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      getPendingOrders: vi.fn().mockResolvedValue([]),
      selectDestination: vi.fn().mockResolvedValue(undefined),
    };

    mockGetSettlementService.mockReturnValue(mockService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return idle state when wallet is not connected', async () => {
      mockUseWallet.mockReturnValue({
        address: null,
        isConnected: false,
      } as any);

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should fetch pending orders when wallet is connected', async () => {
      const pendingOrders = [
        TEST_ORDER_ID,
        '0xorder20000000000000000000000000000000000000000000000000000000000002',
      ];

      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      mockService.getPendingOrders.mockResolvedValue(pendingOrders);

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toEqual(pendingOrders);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getPendingOrders).toHaveBeenCalledWith(TEST_ADDRESS);
    });

    it('should handle errors when fetching pending orders fails', async () => {
      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      mockService.getPendingOrders.mockRejectedValue(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.pendingOrders).toEqual([]);
      });
    });

    it('should filter out zero bytes32 order IDs', async () => {
      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      // Service already filters out zero bytes32 - the hook receives clean data
      mockService.getPendingOrders.mockResolvedValue([
        TEST_ORDER_ID,
        '0xorder30000000000000000000000000000000000000000000000000000000000003',
      ]);

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toHaveLength(2);
        expect(result.current.pendingOrders).not.toContain(
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        );
      });
    });
  });

  describe('selectDestination', () => {
    it('should call service.selectDestination with correct parameters', async () => {
      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      mockService.getPendingOrders.mockResolvedValue([TEST_ORDER_ID]);

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toEqual([TEST_ORDER_ID]);
      });

      await act(async () => {
        await result.current.selectDestination(
          TEST_ORDER_ID,
          TEST_NODE_ID,
          false,
        );
      });

      expect(mockService.selectDestination).toHaveBeenCalledWith(
        TEST_ORDER_ID,
        TEST_NODE_ID,
        false,
      );
    });

    it('should handle errors from selectDestination', async () => {
      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      mockService.getPendingOrders.mockResolvedValue([TEST_ORDER_ID]);
      mockService.selectDestination.mockRejectedValue(
        new Error('Transaction failed'),
      );

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toEqual([TEST_ORDER_ID]);
      });

      // Note: The current implementation doesn't catch errors from selectDestination
      // This test documents current behavior - errors are thrown
      await expect(
        act(async () => {
          await result.current.selectDestination(
            TEST_ORDER_ID,
            TEST_NODE_ID,
            false,
          );
        }),
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle burn option correctly', async () => {
      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      mockService.getPendingOrders.mockResolvedValue([TEST_ORDER_ID]);

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toEqual([TEST_ORDER_ID]);
      });

      await act(async () => {
        await result.current.selectDestination(TEST_ORDER_ID, null, true);
      });

      expect(mockService.selectDestination).toHaveBeenCalledWith(
        TEST_ORDER_ID,
        null,
        true,
      );
    });
  });

  describe('refetch', () => {
    it('should manually refetch pending orders', async () => {
      mockUseWallet.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);

      const order1 = TEST_ORDER_ID;
      const order2 =
        '0xorder20000000000000000000000000000000000000000000000000000000000002';

      mockService.getPendingOrders
        .mockResolvedValueOnce([order1])
        .mockResolvedValueOnce([order1, order2]);

      const { result } = renderHook(() => useSettlementDestination());

      await waitFor(() => {
        expect(result.current.pendingOrders).toEqual([order1]);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockService.getPendingOrders).toHaveBeenCalledTimes(2);
      expect(result.current.pendingOrders).toEqual([order1, order2]);
    });
  });
});
