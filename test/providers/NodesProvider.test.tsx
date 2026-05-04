import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const WALLET_ADDRESS = '0xfde9344cabfa9504eead8a3e4e2096da1316bbaf';
const NODE_HASH =
  '0xe5ffe58ff80d365691f9b7338a3010851dce6f023b6c55b0983279f6b4821600';

const getOwnedNodesMock = vi.fn();
const getNodeMock = vi.fn();
const registerNodeMock = vi.fn();
const pushMock = vi.fn();
const mockWalletState = {
  address: WALLET_ADDRESS,
};
const mockMainProviderState = {
  connected: true,
};
const mockRouteState = {
  pathname: '/node/dashboard',
  searchParams: new URLSearchParams(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => mockRouteState.pathname,
  useSearchParams: () => mockRouteState.searchParams,
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('@/app/providers/main.provider', () => ({
  useMainProvider: () => mockMainProviderState,
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => ({
    initialized: true,
    getNode: getNodeMock,
    getOwnedNodes: getOwnedNodesMock,
    registerNode: registerNodeMock,
  }),
}));

import { NodesProvider, useNodes } from '@/app/providers/nodes.provider';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <NodesProvider>{children}</NodesProvider>;
  };
}

describe('NodesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState.address = WALLET_ADDRESS;
    mockMainProviderState.connected = true;
    mockRouteState.pathname = '/node/dashboard';
    mockRouteState.searchParams = new URLSearchParams();
    getOwnedNodesMock.mockResolvedValue([NODE_HASH]);
    getNodeMock.mockResolvedValue({
      address: NODE_HASH,
      owner: WALLET_ADDRESS,
      location: {
        addressName: 'Warehouse',
        location: { lat: '0', lng: '0' },
      },
      validNode: true,
      assets: [],
      status: 'Active',
    });
    registerNodeMock.mockResolvedValue(NODE_HASH);
  });

  it('loads nodes for the connected wallet on mount', async () => {
    const { result } = renderHook(() => useNodes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.nodes).toHaveLength(1);
    });

    expect(getOwnedNodesMock).toHaveBeenCalledWith(WALLET_ADDRESS);
    expect(getNodeMock).toHaveBeenCalledWith(NODE_HASH);
  });

  it('refreshes nodes using the connected wallet address', async () => {
    const { result } = renderHook(() => useNodes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    getOwnedNodesMock.mockClear();

    await act(async () => {
      await result.current.refreshNodes();
    });

    expect(getOwnedNodesMock).toHaveBeenCalledWith(WALLET_ADDRESS);
  });

  it('does not load owned nodes on the public read-only route', async () => {
    mockRouteState.pathname = '/node/explorer';

    const { result } = renderHook(() => useNodes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getOwnedNodesMock).not.toHaveBeenCalled();
    expect(result.current.nodes).toEqual([]);
  });
});
