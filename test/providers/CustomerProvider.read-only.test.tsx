import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWalletState = {
  address: undefined as string | undefined,
};

const mockPlatformState = {
  getAssetByTokenId: vi.fn(),
  supportedAssets: [],
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
  contextVersion: 0,
};

const orderRepositoryCtor = vi.fn();
const handleContractErrorMock = vi.fn((error: unknown) => error);

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => mockPlatformState,
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
      getP2POrdersForUser: vi.fn(),
    };
  }),
}));

vi.mock('@/infrastructure/diamond/diamond-p2p-service', () => ({
  DiamondP2PService: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: vi.fn(),
}));

import {
  CustomerProvider,
  useCustomer,
} from '@/app/providers/customer.provider';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <CustomerProvider>{children}</CustomerProvider>;
  };
}

describe('CustomerProvider read-only mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState.address = undefined;
    mockPlatformState.supportedAssets = [];
    mockPlatformState.getAssetByTokenId.mockResolvedValue(null);
    mockDiamondState.diamondContext = {
      getDiamond: vi.fn(),
      getProvider: vi.fn(),
      getSigner: vi.fn(),
    };
    mockDiamondState.initialized = true;
    mockDiamondState.isReadOnly = true;
    mockDiamondState.canWrite = false;
    mockDiamondState.contextVersion = 0;
  });

  it('mounts without a signer and settles into an empty idle state', async () => {
    const { result } = renderHook(() => useCustomer(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(orderRepositoryCtor).not.toHaveBeenCalled();
  });

  it('rejects write actions explicitly instead of crashing at render time', async () => {
    mockWalletState.address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2b4c';

    const { result } = renderHook(() => useCustomer(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let rejection: unknown;
    await act(async () => {
      try {
        await result.current.cancelOrder('order-1');
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain(
      'Diamond is in read-only mode. Connect a wallet to continue.',
    );

    expect(handleContractErrorMock).toHaveBeenCalled();
  });
});
