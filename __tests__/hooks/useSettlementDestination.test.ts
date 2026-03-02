import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';

const mockGetPendingTokenDestinations = vi.fn();
const mockSelectTokenDestination = vi.fn();
const mockWait = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: '0xBuyerAddress',
    isConnected: true,
  })),
}));

vi.mock('@/infrastructure/contexts/repository-context', () => ({
  RepositoryContext: {
    getInstance: () => ({
      getProvider: () => ({}),
    }),
  },
}));

vi.mock('ethers', () => ({
  ethers: {
    Contract: vi.fn().mockImplementation(() => ({
      getPendingTokenDestinations: mockGetPendingTokenDestinations,
      selectTokenDestination: mockSelectTokenDestination,
    })),
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({}),
    })),
  },
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamondAddress',
}));

import { useWallet } from '@/hooks/useWallet';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';

describe('useSettlementDestination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPendingTokenDestinations.mockResolvedValue([]);
    mockSelectTokenDestination.mockResolvedValue({ wait: mockWait });
    Object.defineProperty(globalThis, 'window', {
      value: { ...globalThis.window, ethereum: {} },
      writable: true,
    });
    vi.mocked(useWallet).mockReturnValue({
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

    mockGetPendingTokenDestinations.mockResolvedValue([orderId1, orderId2]);

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingOrders).toEqual([orderId1, orderId2]);
    expect(result.current.error).toBeNull();
  });

  it('should filter out zero bytes32 entries', async () => {
    const orderId =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const zeroByte =
      '0x0000000000000000000000000000000000000000000000000000000000000000';

    mockGetPendingTokenDestinations.mockResolvedValue([orderId, zeroByte]);

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingOrders).toEqual([orderId]);
  });

  it('should return empty array when wallet not connected', async () => {
    vi.mocked(useWallet).mockReturnValue({
      address: null,
      isConnected: false,
    } as any);

    const { result } = renderHook(() => useSettlementDestination());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingOrders).toEqual([]);
    expect(mockGetPendingTokenDestinations).not.toHaveBeenCalled();
  });

  it('should set error state on contract failure', async () => {
    mockGetPendingTokenDestinations.mockRejectedValue(
      new Error('Contract call reverted'),
    );

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

    expect(mockSelectTokenDestination).toHaveBeenCalledWith(
      orderId,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      true,
    );
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

    expect(mockSelectTokenDestination).toHaveBeenCalledWith(
      orderId,
      nodeId,
      false,
    );
  });
});
