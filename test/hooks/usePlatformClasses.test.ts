import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: vi.fn(),
}));

import { usePlatformClasses } from '@/hooks/usePlatformClasses';
import { usePlatform } from '@/app/providers/platform.provider';
import type { AssetClass } from '@/domain/platform';

const mockUsePlatform = usePlatform as ReturnType<typeof vi.fn>;

const mockClasses: AssetClass[] = [
  {
    name: 'Gold',
    assetTypeCount: 3,
    assetCount: 100,
    totalVolume: '50000',
    isActive: true,
  },
  {
    name: 'Silver',
    assetTypeCount: 2,
    assetCount: 50,
    totalVolume: '25000',
    isActive: true,
  },
  {
    name: 'Goat',
    assetTypeCount: 5,
    assetCount: 200,
    totalVolume: '75000',
    isActive: true,
  },
];

const mockRefresh = vi.fn().mockResolvedValue(undefined);

describe('usePlatformClasses', () => {
  beforeEach(() => {
    mockUsePlatform.mockReturnValue({
      assetClasses: mockClasses,
      isLoading: false,
      error: null,
      refreshPlatformData: mockRefresh,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns classes from the platform provider', () => {
    const { result } = renderHook(() => usePlatformClasses());

    expect(result.current.classes).toEqual(mockClasses);
    expect(result.current.classes).toHaveLength(3);
  });

  it('returns isLoading state from provider', () => {
    mockUsePlatform.mockReturnValue({
      assetClasses: [],
      isLoading: true,
      error: null,
      refreshPlatformData: mockRefresh,
    });

    const { result } = renderHook(() => usePlatformClasses());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from provider', () => {
    mockUsePlatform.mockReturnValue({
      assetClasses: [],
      isLoading: false,
      error: 'Failed to fetch',
      refreshPlatformData: mockRefresh,
    });

    const { result } = renderHook(() => usePlatformClasses());
    expect(result.current.error).toBe('Failed to fetch');
  });

  it('searchClasses returns all classes for empty query', () => {
    const { result } = renderHook(() => usePlatformClasses());

    const found = result.current.searchClasses('');
    expect(found).toEqual(mockClasses);
  });

  it('searchClasses filters by name (case-insensitive)', () => {
    const { result } = renderHook(() => usePlatformClasses());

    const found = result.current.searchClasses('go');
    expect(found).toHaveLength(2);
    expect(found.map((c) => c.name)).toEqual(['Gold', 'Goat']);
  });

  it('searchClasses returns empty array for no matches', () => {
    const { result } = renderHook(() => usePlatformClasses());

    const found = result.current.searchClasses('Platinum');
    expect(found).toHaveLength(0);
  });

  it('searchClasses trims whitespace from query', () => {
    const { result } = renderHook(() => usePlatformClasses());

    const found = result.current.searchClasses('  silver  ');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Silver');
  });

  it('getClassByName returns matching class (case-insensitive)', () => {
    const { result } = renderHook(() => usePlatformClasses());

    const cls = result.current.getClassByName('gold');
    expect(cls).toBeDefined();
    expect(cls!.name).toBe('Gold');
  });

  it('getClassByName returns undefined for unknown class', () => {
    const { result } = renderHook(() => usePlatformClasses());

    const cls = result.current.getClassByName('Platinum');
    expect(cls).toBeUndefined();
  });

  it('refetch delegates to provider refreshPlatformData', async () => {
    const { result } = renderHook(() => usePlatformClasses());

    await result.current.refetch();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
