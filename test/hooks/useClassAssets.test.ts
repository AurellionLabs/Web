// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// =============================================================================
// MODULE MOCKS
// =============================================================================

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: vi.fn(),
}));

// =============================================================================
// IMPORTS AFTER MOCKS
// =============================================================================

import { useClassAssets } from '@/hooks/useClassAssets';
import { usePlatform } from '@/app/providers/platform.provider';

const mockUsePlatform = vi.mocked(usePlatform);

// =============================================================================
// HELPERS & FIXTURES
// =============================================================================

const makeAsset = (
  id: string,
  name: string,
  attrs: Record<string, string> = {},
) => ({
  id,
  name,
  class: 'Livestock',
  attributes: Object.entries(attrs).map(([k, v]) => ({
    name: k,
    values: [v],
  })),
});

const GOAT_BOER = makeAsset('1', 'Boer Goat', { weight: '30', age: '2' });
const GOAT_NUBIAN = makeAsset('2', 'Nubian Goat', { weight: '25', age: '3' });
const GOAT_BOER_2 = makeAsset('3', 'Boer Goat', { weight: '45', age: '1' });

function setupPlatform(getClassAssets: ReturnType<typeof vi.fn>) {
  mockUsePlatform.mockReturnValue({ getClassAssets } as any);
}

// =============================================================================
// TESTS
// =============================================================================

describe('useClassAssets', () => {
  let mockGetClassAssets: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassAssets = vi.fn().mockResolvedValue([]);
    setupPlatform(mockGetClassAssets);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Guard conditions
  // ---------------------------------------------------------------------------

  describe('empty className', () => {
    it('stays idle when className is empty string', async () => {
      const { result } = renderHook(() => useClassAssets(''));

      // fetchAssets bails out early when className is falsy
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.assets).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(mockGetClassAssets).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  describe('loading state', () => {
    it('sets isLoading to true while fetching', async () => {
      let resolve: (v: unknown[]) => void;
      mockGetClassAssets.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );

      const { result } = renderHook(() => useClassAssets('Goat'));

      expect(result.current.isLoading).toBe(true);

      act(() => resolve([]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Success states
  // ---------------------------------------------------------------------------

  describe('successful fetch', () => {
    it('returns assets on success', async () => {
      mockGetClassAssets.mockResolvedValue([GOAT_BOER, GOAT_NUBIAN]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.assets).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(mockGetClassAssets).toHaveBeenCalledWith('Goat');
    });

    it('extracts unique sorted asset types', async () => {
      mockGetClassAssets.mockResolvedValue([
        GOAT_BOER,
        GOAT_NUBIAN,
        GOAT_BOER_2,
      ]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Two unique names: Boer Goat and Nubian Goat, sorted
      expect(result.current.assetTypes).toEqual(['Boer Goat', 'Nubian Goat']);
    });

    it('filteredAssets equals assets when no filters or type selected', async () => {
      mockGetClassAssets.mockResolvedValue([
        GOAT_BOER,
        GOAT_NUBIAN,
        GOAT_BOER_2,
      ]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.filteredAssets).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Asset type filtering
  // ---------------------------------------------------------------------------

  describe('selectedAssetType filtering', () => {
    it('filters assets by selected type', async () => {
      mockGetClassAssets.mockResolvedValue([
        GOAT_BOER,
        GOAT_NUBIAN,
        GOAT_BOER_2,
      ]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setSelectedAssetType('Boer Goat');
      });

      expect(result.current.filteredAssets).toHaveLength(2);
      expect(
        result.current.filteredAssets.every((a) => a.name === 'Boer Goat'),
      ).toBe(true);
    });

    it('returns all assets when selectedAssetType is null', async () => {
      mockGetClassAssets.mockResolvedValue([GOAT_BOER, GOAT_NUBIAN]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setSelectedAssetType('Boer Goat');
      });

      expect(result.current.filteredAssets).toHaveLength(1);

      act(() => {
        result.current.setSelectedAssetType(null);
      });

      expect(result.current.filteredAssets).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Attribute filtering
  // ---------------------------------------------------------------------------

  describe('attribute filters (setFilters)', () => {
    it('applies filter to matching attribute', async () => {
      mockGetClassAssets.mockResolvedValue([
        GOAT_BOER,
        GOAT_NUBIAN,
        GOAT_BOER_2,
      ]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Filter weight = '30' (exact string match via select)
      act(() => {
        result.current.setFilters({ weight: { selected: '30' } });
      });

      // Only GOAT_BOER has weight 30
      expect(result.current.filteredAssets).toHaveLength(1);
      expect(result.current.filteredAssets[0].id).toBe('1');
    });

    it('clears filters on className change', async () => {
      mockGetClassAssets.mockResolvedValue([GOAT_BOER]);

      const { result, rerender } = renderHook(
        ({ cls }) => useClassAssets(cls),
        { initialProps: { cls: 'Goat' } },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setFilters({ weight: { selected: '30' } });
      });

      expect(result.current.filters).toEqual({ weight: { selected: '30' } });

      rerender({ cls: 'Cow' });

      await waitFor(() => {
        expect(result.current.filters).toEqual({});
      });
    });

    it('resets selectedAssetType on className change', async () => {
      mockGetClassAssets.mockResolvedValue([GOAT_BOER]);

      const { result, rerender } = renderHook(
        ({ cls }) => useClassAssets(cls),
        { initialProps: { cls: 'Goat' } },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setSelectedAssetType('Boer Goat');
      });

      expect(result.current.selectedAssetType).toBe('Boer Goat');

      rerender({ cls: 'Cow' });

      await waitFor(() => {
        expect(result.current.selectedAssetType).toBeNull();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('sets error message on fetch failure', async () => {
      mockGetClassAssets.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Network error');
      expect(result.current.assets).toEqual([]);
    });

    it('uses fallback message for non-Error rejections', async () => {
      mockGetClassAssets.mockRejectedValue('something went wrong');

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Failed to load class assets');
    });
  });

  // ---------------------------------------------------------------------------
  // refetch
  // ---------------------------------------------------------------------------

  describe('refetch', () => {
    it('re-calls getClassAssets when refetch is invoked', async () => {
      mockGetClassAssets.mockResolvedValue([GOAT_BOER]);

      const { result } = renderHook(() => useClassAssets('Goat'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const callsBefore = mockGetClassAssets.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetClassAssets.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // Reactivity — className changes
  // ---------------------------------------------------------------------------

  describe('reactivity', () => {
    it('re-fetches when className changes', async () => {
      mockGetClassAssets.mockResolvedValue([]);

      const { result, rerender } = renderHook(
        ({ cls }) => useClassAssets(cls),
        { initialProps: { cls: 'Goat' } },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const firstCount = mockGetClassAssets.mock.calls.length;

      rerender({ cls: 'Cattle' });

      await waitFor(() => {
        expect(mockGetClassAssets.mock.calls.length).toBeGreaterThan(
          firstCount,
        );
      });

      expect(mockGetClassAssets).toHaveBeenCalledWith('Cattle');
    });
  });
});
