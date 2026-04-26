import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWalletState = {
  address: undefined as string | undefined,
};

const mockNodeRepository = {
  getAllNodeAssets: vi.fn(),
};

const mockDiamondState = {
  diamondContext: {
    getDiamond: vi.fn(),
    getProvider: vi.fn(),
    getSigner: vi.fn(),
  },
  initialized: true,
  isReadOnly: true,
  canWrite: false,
  nodeRepository: mockNodeRepository,
  contextVersion: 0,
};

const handleContractErrorMock = vi.fn((error: unknown) => error);
const orderRepositoryCtor = vi.fn();
const orderServiceCtor = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => mockDiamondState,
}));

vi.mock('@/utils/error-handler', () => ({
  handleContractError: (...args: unknown[]) => handleContractErrorMock(...args),
}));

vi.mock('@/infrastructure/repositories/orders-repository', () => ({
  OrderRepository: vi.fn().mockImplementation((...args: unknown[]) => {
    orderRepositoryCtor(...args);
    return {
      getBuyerOrders: vi.fn(),
    };
  }),
}));

vi.mock('@/infrastructure/services/order-service', () => ({
  OrderService: vi.fn().mockImplementation((...args: unknown[]) => {
    orderServiceCtor(...args);
    return {
      createOrder: vi.fn(),
    };
  }),
}));

import { TradeProvider, useTrade } from '@/app/providers/trade.provider';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TradeProvider>{children}</TradeProvider>;
  };
}

describe('TradeProvider read-only mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState.address = undefined;
    mockDiamondState.diamondContext = {
      getDiamond: vi.fn(),
      getProvider: vi.fn(),
      getSigner: vi.fn(),
    };
    mockDiamondState.initialized = true;
    mockDiamondState.isReadOnly = true;
    mockDiamondState.canWrite = false;
    mockDiamondState.contextVersion = 0;
    mockNodeRepository.getAllNodeAssets.mockResolvedValue([
      {
        id: 'asset-1',
        name: 'Asset One',
        price: '3',
        capacity: '7',
      },
    ]);
  });

  it('renders read-only asset browsing without constructing write services', async () => {
    const { result } = renderHook(() => useTrade(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.assets).toHaveLength(1);
    });

    expect(result.current.assets[0].totalValue).toBe(21);
    expect(orderRepositoryCtor).not.toHaveBeenCalled();
    expect(orderServiceCtor).not.toHaveBeenCalled();
  });

  it('clears order loading and fails placeOrder cleanly in read-only mode', async () => {
    mockWalletState.address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c';

    const { result } = renderHook(() => useTrade(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loadOrders();
    });

    expect(result.current.orders).toEqual([]);

    let placeOrderResult = true;
    await act(async () => {
      placeOrderResult = await result.current.placeOrder({
        id: 'order-1',
        buyer: '',
        seller: '',
        price: '1',
        quantity: '1',
        tokenId: '1',
      } as any);
    });

    expect(placeOrderResult).toBe(false);
    expect(orderRepositoryCtor).not.toHaveBeenCalled();
    expect(orderServiceCtor).not.toHaveBeenCalled();
    expect(handleContractErrorMock).toHaveBeenCalled();
  });
});
