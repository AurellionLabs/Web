// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: vi.fn(),
}));

import { useUserAssets } from '@/hooks/useUserAssets';
import { useWallet } from '@/hooks/useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';

const mockUseWallet = vi.mocked(useWallet);
const mockUseDiamond = vi.mocked(useDiamond);

const USER_ADDRESS = '0xUser0000000000000000000000000000000001';
const NODE_ID_1 = '0xNodeId000000000000000000000000000000001';
const NODE_ID_2 = '0xNodeId000000000000000000000000000000002';

const makeAsset = (
  id: string,
  name: string,
  cls = 'Livestock',
  amount = '5',
) => ({
  id,
  name,
  class: cls,
  amount,
  capacity: '10',
  price: String(2n * 10n ** 18n),
  fileHash: `0xfile${id}`,
});

function setupWallet(connected = true, address = USER_ADDRESS) {
  mockUseWallet.mockReturnValue({
    address: connected ? address : null,
    isConnected: connected,
  } as any);
}

function setupDiamond(
  overrides: Partial<{
    initialized: boolean;
    getOwnedNodes: ReturnType<typeof vi.fn>;
    getNodeAssets: ReturnType<typeof vi.fn>;
    getAssetAttributes: ReturnType<typeof vi.fn>;
  }> = {},
) {
  mockUseDiamond.mockReturnValue({
    initialized: true,
    getOwnedNodes: vi.fn().mockResolvedValue([]),
    getNodeAssets: vi.fn().mockResolvedValue([]),
    getAssetAttributes: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as any);
}

describe('useUserAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty assets when wallet is disconnected', async () => {
    setupWallet(false);
    setupDiamond();
    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sellableAssets).toEqual([]);
    expect(result.current.hasAssets).toBe(false);
  });

  it('stays loading while diamond is not initialized', () => {
    setupWallet(true);
    setupDiamond({ initialized: false });
    const { result } = renderHook(() => useUserAssets());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns sellable assets using node sellable amount', async () => {
    const getAssetAttributes = vi
      .fn()
      .mockResolvedValue([{ name: 'weight', value: '30kg' }]);
    setupWallet(true);
    setupDiamond({
      getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
      getNodeAssets: vi.fn().mockResolvedValue([makeAsset('42', 'Boer Goat')]),
      getAssetAttributes,
    });

    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sellableAssets).toHaveLength(1);
    expect(result.current.sellableAssets[0]).toMatchObject({
      tokenId: '42',
      name: 'Boer Goat',
      balance: '5',
      nodeHash: NODE_ID_1,
    });
    expect(getAssetAttributes).toHaveBeenCalled();
  });

  it('aggregates assets across multiple nodes', async () => {
    const getNodeAssets = vi
      .fn()
      .mockResolvedValueOnce([makeAsset('1', 'Goat A', 'Livestock', '3')])
      .mockResolvedValueOnce([makeAsset('2', 'Goat B', 'Livestock', '7')]);
    setupWallet(true);
    setupDiamond({
      getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1, NODE_ID_2]),
      getNodeAssets,
      getAssetAttributes: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sellableAssets).toHaveLength(2);
  });

  it('filters out zero-sellable assets', async () => {
    setupWallet(true);
    setupDiamond({
      getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
      getNodeAssets: vi
        .fn()
        .mockResolvedValue([makeAsset('9', 'Goat', 'Livestock', '0')]),
      getAssetAttributes: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sellableAssets).toHaveLength(0);
  });

  it('applies class filter case-insensitively', async () => {
    setupWallet(true);
    setupDiamond({
      getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
      getNodeAssets: vi
        .fn()
        .mockResolvedValue([
          makeAsset('1', 'Goat', 'Livestock', '4'),
          makeAsset('2', 'Wheat', 'Grain', '8'),
        ]),
      getAssetAttributes: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useUserAssets('LIVESTOCK'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sellableAssets).toHaveLength(1);
    expect(result.current.sellableAssets[0].class).toBe('Livestock');
  });

  it('continues when one node asset query fails', async () => {
    const getNodeAssets = vi
      .fn()
      .mockRejectedValueOnce(new Error('node 1 failed'))
      .mockResolvedValueOnce([makeAsset('2', 'Nubian Goat', 'Livestock', '2')]);
    setupWallet(true);
    setupDiamond({
      getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1, NODE_ID_2]),
      getNodeAssets,
      getAssetAttributes: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sellableAssets).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error when getOwnedNodes fails', async () => {
    setupWallet(true);
    setupDiamond({
      getOwnedNodes: vi
        .fn()
        .mockRejectedValue(new Error('Diamond unavailable')),
    });
    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to fetch your assets');
  });

  it('re-fetches assets on refresh', async () => {
    const getOwnedNodes = vi.fn().mockResolvedValue([]);
    setupWallet(true);
    setupDiamond({ getOwnedNodes });
    const { result } = renderHook(() => useUserAssets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = getOwnedNodes.mock.calls.length;
    await act(async () => {
      await result.current.refresh();
    });
    expect(getOwnedNodes.mock.calls.length).toBeGreaterThan(before);
  });
});
