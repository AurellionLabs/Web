// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// =============================================================================
// MODULE MOCKS
// =============================================================================

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: vi.fn(),
}));

// =============================================================================
// IMPORTS AFTER MOCKS
// =============================================================================

import { useUserAssets } from '@/hooks/useUserAssets';
import { useWallet } from '@/hooks/useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';

const mockUseWallet = vi.mocked(useWallet);
const mockUseDiamond = vi.mocked(useDiamond);

// =============================================================================
// CONSTANTS & FIXTURES
// =============================================================================

const USER_ADDRESS = '0xUser0000000000000000000000000000000001';
const NODE_ID_1 = '0xNodeId000000000000000000000000000000001';
const NODE_ID_2 = '0xNodeId000000000000000000000000000000002';

const makeAsset = (
  id: string,
  name: string,
  cls = 'Livestock',
  overrides = {},
) => ({
  id,
  name,
  class: cls,
  capacity: '10',
  price: String(2n * 10n ** 18n), // 2 ETH
  fileHash: `0xfile${id}`,
  ...overrides,
});

const makeAttribute = (name: string, value: string) => ({ name, value });

// =============================================================================
// HELPERS
// =============================================================================

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
    getNodeTokenBalance: ReturnType<typeof vi.fn>;
    getAssetAttributes: ReturnType<typeof vi.fn>;
  }> = {},
) {
  mockUseDiamond.mockReturnValue({
    initialized: true,
    getOwnedNodes: vi.fn().mockResolvedValue([]),
    getNodeAssets: vi.fn().mockResolvedValue([]),
    getNodeTokenBalance: vi.fn().mockResolvedValue(0n),
    getAssetAttributes: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as any);
}

// =============================================================================
// TESTS
// =============================================================================

describe('useUserAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Guard conditions
  // ---------------------------------------------------------------------------

  describe('disconnected wallet', () => {
    it('returns empty assets immediately when wallet not connected', async () => {
      setupWallet(false);
      setupDiamond();

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toEqual([]);
      expect(result.current.hasAssets).toBe(false);
      expect(result.current.assetCount).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('waits when diamond is not initialized', async () => {
      setupWallet(true);
      setupDiamond({ initialized: false });

      const { result } = renderHook(() => useUserAssets());

      // Diamond not initialized — hook should not set isLoading false
      // (it returns early without touching isLoading)
      // isLoading starts as true and stays true
      expect(result.current.isLoading).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // No owned nodes
  // ---------------------------------------------------------------------------

  describe('user with no nodes', () => {
    it('returns empty assets when getOwnedNodes returns []', async () => {
      setupWallet(true);
      setupDiamond({ getOwnedNodes: vi.fn().mockResolvedValue([]) });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toEqual([]);
      expect(result.current.hasAssets).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Success paths
  // ---------------------------------------------------------------------------

  describe('assets with non-zero balance', () => {
    it('returns sellable assets with actual balance', async () => {
      const asset = makeAsset('42', 'Boer Goat');
      const getNodeAssets = vi.fn().mockResolvedValue([asset]);
      const getNodeTokenBalance = vi.fn().mockResolvedValue(5n);
      const getAssetAttributes = vi
        .fn()
        .mockResolvedValue([makeAttribute('weight', '30kg')]);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets,
        getAssetAttributes,
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toHaveLength(1);
      const sa = result.current.sellableAssets[0];
      expect(sa.id).toBe('42');
      expect(sa.name).toBe('Boer Goat');
      expect(sa.balance).toBe('5');
      expect(sa.nodeHash).toBe(NODE_ID_1);
      expect(sa.attributes).toHaveLength(1);
      expect(getNodeTokenBalance).toHaveBeenCalledWith(NODE_ID_1, '42');
      expect(result.current.hasAssets).toBe(true);
      expect(result.current.assetCount).toBe(1);
    });

    it('aggregates assets from multiple nodes', async () => {
      const asset1 = makeAsset('1', 'Boer Goat');
      const asset2 = makeAsset('2', 'Nubian Goat');

      const getNodeAssets = vi
        .fn()
        .mockResolvedValueOnce([asset1])
        .mockResolvedValueOnce([asset2]);
      const getNodeTokenBalance = vi.fn().mockResolvedValue(3n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1, NODE_ID_2]),
        getNodeAssets,
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toHaveLength(2);
    });

    it('falls back to capacity when actualBalance is 0 and capacity is set', async () => {
      const asset = makeAsset('5', 'Goat', 'Livestock', { capacity: '8' });
      const getNodeTokenBalance = vi.fn().mockResolvedValue(0n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([asset]),
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Capacity 8 > 0, so it should appear
      expect(result.current.sellableAssets).toHaveLength(1);
      expect(result.current.sellableAssets[0].balance).toBe('8');
    });

    it('excludes assets where both actualBalance and capacity are 0', async () => {
      const asset = makeAsset('7', 'Goat', 'Livestock', { capacity: '0' });
      const getNodeTokenBalance = vi.fn().mockResolvedValue(0n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([asset]),
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toHaveLength(0);
    });

    it('formats price correctly (divides by 1e18)', async () => {
      const asset = makeAsset('9', 'Goat', 'Livestock', {
        price: String(2n * 10n ** 18n), // 2 ETH in wei
      });
      const getNodeTokenBalance = vi.fn().mockResolvedValue(1n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([asset]),
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets[0].price).toBe('2.00');
    });
  });

  // ---------------------------------------------------------------------------
  // Class filter
  // ---------------------------------------------------------------------------

  describe('filterClass', () => {
    it('only returns assets matching the filter class', async () => {
      const livestock = makeAsset('1', 'Goat', 'Livestock');
      const grain = makeAsset('2', 'Wheat', 'Grain');
      const getNodeTokenBalance = vi.fn().mockResolvedValue(5n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([livestock, grain]),
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets('Livestock'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toHaveLength(1);
      expect(result.current.sellableAssets[0].class).toBe('Livestock');
    });

    it('is case-insensitive', async () => {
      const asset = makeAsset('1', 'Goat', 'Livestock');
      const getNodeTokenBalance = vi.fn().mockResolvedValue(5n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([asset]),
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets('LIVESTOCK'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sellableAssets).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('sets error message when getOwnedNodes throws', async () => {
      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi
          .fn()
          .mockRejectedValue(new Error('Diamond unavailable')),
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Failed to fetch your assets');
      expect(result.current.sellableAssets).toEqual([]);
    });

    it('continues with other nodes when one node asset fetch fails', async () => {
      const asset2 = makeAsset('2', 'Nubian Goat');

      const getNodeAssets = vi
        .fn()
        .mockRejectedValueOnce(new Error('node 1 failed'))
        .mockResolvedValueOnce([asset2]);
      const getNodeTokenBalance = vi.fn().mockResolvedValue(2n);

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1, NODE_ID_2]),
        getNodeAssets,
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Node 1 failed but node 2 succeeded
      expect(result.current.sellableAssets).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('falls back to capacity when getNodeTokenBalance throws for an asset', async () => {
      const asset = makeAsset('3', 'Boer Goat', 'Livestock', { capacity: '6' });

      const getNodeTokenBalance = vi
        .fn()
        .mockRejectedValue(new Error('balance error'));

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([asset]),
        getAssetAttributes: vi.fn().mockResolvedValue([]),
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Falls back to capacity '6'
      expect(result.current.sellableAssets).toHaveLength(1);
      expect(result.current.sellableAssets[0].balance).toBe('6');
    });

    it('skips attribute fetch for assets without fileHash', async () => {
      const asset = makeAsset('4', 'Goat', 'Livestock', {
        fileHash: undefined,
      });
      const getNodeTokenBalance = vi.fn().mockResolvedValue(1n);
      const getAssetAttributes = vi.fn();

      setupWallet(true);
      setupDiamond({
        getOwnedNodes: vi.fn().mockResolvedValue([NODE_ID_1]),
        getNodeAssets: vi.fn().mockResolvedValue([asset]),
        getAssetAttributes,
        getNodeTokenBalance,
      });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(getAssetAttributes).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // refresh
  // ---------------------------------------------------------------------------

  describe('refresh', () => {
    it('re-fetches assets when refresh is called', async () => {
      const getOwnedNodes = vi.fn().mockResolvedValue([]);

      setupWallet(true);
      setupDiamond({ getOwnedNodes });

      const { result } = renderHook(() => useUserAssets());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const callsBefore = getOwnedNodes.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(getOwnedNodes.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
