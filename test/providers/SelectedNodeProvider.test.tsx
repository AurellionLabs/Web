import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CONNECTED_WALLET = '0x9999999999999999999999999999999999999999';
const NODE_HASH =
  '0xe5ffe58ff80d365691f9b7338a3010851dce6f023b6c55b0983279f6b4821600';
const NODE_OWNER = '0xfde9344cabfa9504eead8a3e4e2096da1316bbaf';

const getNodeOrdersMock = vi.fn();
const getNodeMock = vi.fn();
const getNodeAssetsMock = vi.fn();
const getSupportingDocumentsMock = vi.fn();
const refreshNodesMock = vi.fn();
const getAssetByTokenIdMock = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: CONNECTED_WALLET,
    connectedWallet: null,
  }),
}));

vi.mock('@/app/providers/main.provider', () => ({
  useMainProvider: () => ({
    connected: true,
  }),
}));

vi.mock('@/app/providers/nodes.provider', () => ({
  useNodes: () => ({
    getNode: getNodeMock,
    refreshNodes: refreshNodesMock,
  }),
}));

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    getAssetByTokenId: getAssetByTokenIdMock,
    supportedAssets: [],
  }),
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => ({
    initialized: true,
    nodeRepository: {
      getNodeOrders: getNodeOrdersMock,
    },
    nodeService: null,
    nodeAssetService: null,
    getNodeAssets: getNodeAssetsMock,
    getAssetAttributes: vi.fn(),
    updateNodeStatus: vi.fn(),
    mintAsset: vi.fn(),
    updateAssetCapacity: vi.fn(),
    updateAssetPrice: vi.fn(),
    getSupportingDocuments: getSupportingDocumentsMock,
    addSupportingDocument: vi.fn(),
    removeSupportingDocument: vi.fn(),
  }),
}));

import {
  SelectedNodeProvider,
  useSelectedNode,
} from '@/app/providers/selected-node.provider';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SelectedNodeProvider>{children}</SelectedNodeProvider>;
  };
}

describe('SelectedNodeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNodeMock.mockResolvedValue({
      address: NODE_HASH,
      owner: NODE_OWNER,
      location: {
        addressName: 'Node HQ',
        location: { lat: '0', lng: '0' },
      },
      validNode: true,
      assets: [],
      status: 'Active',
    });
    getNodeOrdersMock.mockResolvedValue([]);
    getNodeAssetsMock.mockResolvedValue([]);
    getSupportingDocumentsMock.mockResolvedValue([]);
    getAssetByTokenIdMock.mockResolvedValue(null);
    refreshNodesMock.mockResolvedValue(undefined);
  });

  it('loads node orders with the selected node owner, not the connected wallet', async () => {
    const { result } = renderHook(() => useSelectedNode(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.selectNode(NODE_HASH);
    });

    await waitFor(() => {
      expect(getNodeOrdersMock).toHaveBeenCalledWith(NODE_HASH, NODE_OWNER);
    });

    expect(getNodeOrdersMock).not.toHaveBeenCalledWith(
      NODE_HASH,
      CONNECTED_WALLET,
    );
  });

  it('refreshes orders with the selected node owner after selection', async () => {
    const { result } = renderHook(() => useSelectedNode(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.selectNode(NODE_HASH);
    });

    getNodeOrdersMock.mockClear();

    await act(async () => {
      await result.current.refreshOrders();
    });

    expect(getNodeOrdersMock).toHaveBeenCalledTimes(1);
    expect(getNodeOrdersMock).toHaveBeenCalledWith(NODE_HASH, NODE_OWNER);
  });
});
