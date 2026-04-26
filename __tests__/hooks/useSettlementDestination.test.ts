import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';

const mockGetPendingOrders = vi.fn();
const mockSelectDestination = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: '0xBuyerAddress',
    isConnected: true,
  })),
}));

vi.mock('@/infrastructure/services/settlement-service', () => ({
  getSettlementService: () => ({
    getPendingOrders: mockGetPendingOrders,
    selectDestination: mockSelectDestination,
  }),
}));

import { useWallet } from '@/hooks/useWallet';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';

describe('useSettlementDestination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPendingOrders.mockResolvedValue([]);
    mockSelectDestination.mockResolvedValue(undefined);
    Object.defineProperty(window, 'ethereum', {
      value: {},
      writable: true,
      configurable: true,
    });
    (useWallet as ReturnType<typeof vi.fn>).mockReturnValue({
      address: '0xBuyerAddress',
      isConnected: true,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('should return pending orders list from contract call', async () => {
    const orderId1 =
      '0x1111111111111111111111111111111111111111111111111111111111111111';
    const orderId2 =
      '0x2222222222222222222222222222222222222222222222222222222222222222';

    mockGetPendingOrders.mockResolvedValue([orderId1, orderId2]);

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingOrders).toEqual([orderId1, orderId2]);
    expect(result.current.error).toBeNull();
  });

  it('should surface the pending orders returned by the settlement service', async () => {
    const orderId =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const zeroByte =
      '0x0000000000000000000000000000000000000000000000000000000000000000';

    mockGetPendingOrders.mockResolvedValue([orderId, zeroByte]);

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingOrders).toEqual([orderId, zeroByte]);
  });

  it('should return empty array when wallet not connected', async () => {
    (useWallet as ReturnType<typeof vi.fn>).mockReturnValue({
      address: null,
      isConnected: false,
    } as any);

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingOrders).toEqual([]);
    expect(mockGetPendingOrders).not.toHaveBeenCalled();
  });

  it('should set error state on contract failure', async () => {
    mockGetPendingOrders.mockRejectedValue(new Error('Contract call reverted'));

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Contract call reverted');
    expect(result.current.pendingOrders).toEqual([]);
  });

  it('should call contract with burn=true and nodeId=0x0', async () => {
    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const orderId =
      '0x1111111111111111111111111111111111111111111111111111111111111111';

    await act(async () => {
      await result.current.selectDestination(orderId, null, true);
    });

    expect(mockSelectDestination).toHaveBeenCalledWith(orderId, null, true);
  });

  it('should call contract with burn=false and provided nodeId', async () => {
    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const orderId =
      '0x1111111111111111111111111111111111111111111111111111111111111111';
    const nodeId =
      '0xababababababababababababababababababababababababababababababababab';

    await act(async () => {
      await result.current.selectDestination(orderId, nodeId, false);
    });

    expect(mockSelectDestination).toHaveBeenCalledWith(orderId, nodeId, false);
  });
});
