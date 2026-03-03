// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAttributeFilters,
  applyFilters,
  assetClassAttributes,
  FilterState,
} from '@/hooks/useAttributeFilters';

describe('useAttributeFilters', () => {
  describe('initialization', () => {
    it('should initialize with empty filters by default', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      expect(result.current.filters).toEqual({});
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should initialize with provided initial filters', () => {
      const initialFilters: FilterState = {
        weight: { range: [0, 100] },
        certified: { enabled: true },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.filters).toEqual(initialFilters);
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('should return correct attributes for commodities class', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      expect(result.current.attributes).toBeDefined();
      expect(result.current.attributes.length).toBeGreaterThan(0);

      const ids = result.current.attributes.map((a) => a.id);
      expect(ids).toContain('weight');
      expect(ids).toContain('purity');
      expect(ids).toContain('origin');
      expect(ids).toContain('certified');
      // Base attributes
      expect(ids).toContain('priceRange');
      expect(ids).toContain('verified');
    });

    it('should return correct attributes for collectibles class', () => {
      const { result } = renderHook(() => useAttributeFilters('collectibles'));

      const ids = result.current.attributes.map((a) => a.id);
      expect(ids).toContain('year');
      expect(ids).toContain('condition');
      expect(ids).toContain('rarity');
      expect(ids).toContain('authenticated');
    });

    it('should return correct attributes for real-estate class', () => {
      const { result } = renderHook(() => useAttributeFilters('real-estate'));

      const ids = result.current.attributes.map((a) => a.id);
      expect(ids).toContain('sqft');
      expect(ids).toContain('bedrooms');
      expect(ids).toContain('propertyType');
      expect(ids).toContain('location');
    });

    it('should return correct attributes for art class', () => {
      const { result } = renderHook(() => useAttributeFilters('art'));

      const ids = result.current.attributes.map((a) => a.id);
      expect(ids).toContain('year');
      expect(ids).toContain('medium');
      expect(ids).toContain('size');
      expect(ids).toContain('authenticated');
    });

    it('should handle unknown asset class gracefully', () => {
      const { result } = renderHook(() => useAttributeFilters('unknown-class'));

      // Should still return base attributes
      expect(result.current.attributes).toBeDefined();
      const ids = result.current.attributes.map((a) => a.id);
      expect(ids).toContain('priceRange');
      expect(ids).toContain('verified');
    });
  });

  describe('setFilter', () => {
    it('should set a range filter', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      act(() => {
        result.current.setFilter('weight', { range: [50, 200] });
      });

      expect(result.current.filters.weight).toEqual({ range: [50, 200] });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should set a select filter', () => {
      const { result } = renderHook(() => useAttributeFilters('collectibles'));

      act(() => {
        result.current.setFilter('condition', { selected: 'Mint' });
      });

      expect(result.current.filters.condition).toEqual({ selected: 'Mint' });
    });

    it('should set a multiSelect filter', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      act(() => {
        result.current.setFilter('origin', {
          multiSelected: ['USA', 'Canada'],
        });
      });

      expect(result.current.filters.origin).toEqual({
        multiSelected: ['USA', 'Canada'],
      });
    });

    it('should set a boolean filter', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      act(() => {
        result.current.setFilter('certified', { enabled: true });
      });

      expect(result.current.filters.certified).toEqual({ enabled: true });
    });

    it('should overwrite existing filter value', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      act(() => {
        result.current.setFilter('weight', { range: [0, 100] });
      });

      act(() => {
        result.current.setFilter('weight', { range: [50, 200] });
      });

      expect(result.current.filters.weight).toEqual({ range: [50, 200] });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should call onFilterChange callback when provided', () => {
      const onFilterChange = vi.fn();
      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { onFilterChange }),
      );

      act(() => {
        result.current.setFilter('weight', { range: [50, 200] });
      });

      expect(onFilterChange).toHaveBeenCalledWith({
        weight: { range: [50, 200] },
      });
    });

    it('should allow multiple filters', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      act(() => {
        result.current.setFilter('weight', { range: [50, 200] });
      });

      act(() => {
        result.current.setFilter('purity', { range: [90, 100] });
      });

      act(() => {
        result.current.setFilter('origin', { multiSelected: ['USA'] });
      });

      act(() => {
        result.current.setFilter('certified', { enabled: true });
      });

      expect(result.current.activeFilterCount).toBe(4);
    });
  });

  describe('clearFilter', () => {
    it('should clear a specific filter', () => {
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
        certified: { enabled: true },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      act(() => {
        result.current.clearFilter('weight');
      });

      expect(result.current.filters.weight).toBeUndefined();
      expect(result.current.filters.certified).toEqual({ enabled: true });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should call onFilterChange callback when clearing', () => {
      const onFilterChange = vi.fn();
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters, onFilterChange }),
      );

      act(() => {
        result.current.clearFilter('weight');
      });

      expect(onFilterChange).toHaveBeenCalledWith({});
    });

    it('should handle clearing non-existent filter gracefully', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      act(() => {
        result.current.clearFilter('nonExistent');
      });

      expect(result.current.filters).toEqual({});
    });
  });

  describe('clearAllFilters', () => {
    it('should clear all filters', () => {
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
        certified: { enabled: true },
        origin: { multiSelected: ['USA'] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      act(() => {
        result.current.clearAllFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should call onFilterChange callback with empty object', () => {
      const onFilterChange = vi.fn();
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters, onFilterChange }),
      );

      act(() => {
        result.current.clearAllFilters();
      });

      expect(onFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('activeFilterChips', () => {
    it('should generate chips for range filters', () => {
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.activeFilterChips).toHaveLength(1);
      expect(result.current.activeFilterChips[0]).toEqual({
        id: 'weight',
        name: 'Weight',
        value: '50 - 200 kg',
      });
    });

    it('should generate chips for range filters without unit', () => {
      const initialFilters: FilterState = {
        year: { range: [1900, 2000] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('collectibles', { initialFilters }),
      );

      expect(result.current.activeFilterChips[0].value).toBe('1900 - 2000');
    });

    it('should generate chips for select filters', () => {
      const initialFilters: FilterState = {
        condition: { selected: 'Mint' },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('collectibles', { initialFilters }),
      );

      expect(result.current.activeFilterChips[0].value).toBe('Mint');
    });

    it('should generate chips for multiSelect filters', () => {
      const initialFilters: FilterState = {
        origin: { multiSelected: ['USA', 'Canada', 'Australia'] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      // More than 2 items should show "+N" format
      expect(result.current.activeFilterChips[0].value).toBe('USA, Canada +1');
    });

    it('should generate chips for multiSelect with 2 or fewer items', () => {
      const initialFilters: FilterState = {
        origin: { multiSelected: ['USA', 'Canada'] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.activeFilterChips[0].value).toBe('USA, Canada');
    });

    it('should generate chips for boolean filters (enabled)', () => {
      const initialFilters: FilterState = {
        certified: { enabled: true },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.activeFilterChips[0].value).toBe('Yes');
    });

    it('should generate chips for boolean filters (disabled)', () => {
      const initialFilters: FilterState = {
        certified: { enabled: false },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.activeFilterChips[0].value).toBe('No');
    });

    it('should return empty array when no filters active', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      expect(result.current.activeFilterChips).toEqual([]);
    });

    it('should filter out chips for unknown attributes', () => {
      const initialFilters: FilterState = {
        unknownFilter: { enabled: true },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.activeFilterChips).toHaveLength(0);
    });
  });

  describe('isFilterActive', () => {
    it('should return true for active filter', () => {
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.isFilterActive('weight')).toBe(true);
    });

    it('should return false for inactive filter', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      expect(result.current.isFilterActive('weight')).toBe(false);
    });
  });

  describe('getFilterValue', () => {
    it('should return filter value for active filter', () => {
      const initialFilters: FilterState = {
        weight: { range: [50, 200] },
      };

      const { result } = renderHook(() =>
        useAttributeFilters('commodities', { initialFilters }),
      );

      expect(result.current.getFilterValue('weight')).toEqual({
        range: [50, 200],
      });
    });

    it('should return undefined for inactive filter', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      expect(result.current.getFilterValue('weight')).toBeUndefined();
    });
  });

  describe('attributes', () => {
    it('should include base attributes for all classes', () => {
      const classes = [
        'commodities',
        'collectibles',
        'real-estate',
        'art',
        'unknown',
      ];

      classes.forEach((assetClass) => {
        const { result } = renderHook(() => useAttributeFilters(assetClass));
        const ids = result.current.attributes.map((a) => a.id);

        expect(ids).toContain('priceRange');
        expect(ids).toContain('verified');
      });
    });

    it('should have correct attribute types', () => {
      const { result } = renderHook(() => useAttributeFilters('commodities'));

      const weightAttr = result.current.attributes.find(
        (a) => a.id === 'weight',
      );
      expect(weightAttr?.type).toBe('range');
      expect(weightAttr?.min).toBe(0);
      expect(weightAttr?.max).toBe(1000);
      expect(weightAttr?.unit).toBe('kg');

      const originAttr = result.current.attributes.find(
        (a) => a.id === 'origin',
      );
      expect(originAttr?.type).toBe('multiSelect');
      expect(originAttr?.options).toEqual([
        'USA',
        'Canada',
        'Australia',
        'Europe',
        'Asia',
      ]);
    });
  });
});

describe('applyFilters', () => {
  interface TestAsset {
    weight: number;
    purity: number;
    origin: string;
    certified: boolean;
  }

  const mockAssets: TestAsset[] = [
    { weight: 50, purity: 99, origin: 'USA', certified: true },
    { weight: 150, purity: 95, origin: 'Canada', certified: true },
    { weight: 300, purity: 80, origin: 'Australia', certified: false },
    { weight: 500, purity: 75, origin: 'Europe', certified: true },
    { weight: 1000, purity: 90, origin: 'Asia', certified: false },
  ];

  const accessor = (asset: TestAsset, attributeId: string) => {
    return asset[attributeId as keyof TestAsset];
  };

  it('should return all assets when no filters applied', () => {
    const result = applyFilters(mockAssets, {}, accessor);
    expect(result).toHaveLength(5);
  });

  it('should filter by range (lower bound)', () => {
    const filters: FilterState = {
      weight: { range: [100, 1000] },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(4);
    expect(result.every((a) => a.weight >= 100)).toBe(true);
  });

  it('should filter by range (upper bound)', () => {
    const filters: FilterState = {
      weight: { range: [0, 200] },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.weight <= 200)).toBe(true);
  });

  it('should filter by range (exact range)', () => {
    const filters: FilterState = {
      weight: { range: [100, 300] },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.weight)).toEqual([150, 300]);
  });

  it('should filter by select', () => {
    const filters: FilterState = {
      origin: { selected: 'USA' },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe('USA');
  });

  it('should filter by multiSelect (single match)', () => {
    const filters: FilterState = {
      origin: { multiSelected: ['USA'] },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe('USA');
  });

  it('should filter by multiSelect (multiple matches)', () => {
    const filters: FilterState = {
      origin: { multiSelected: ['USA', 'Canada'] },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.origin).sort()).toEqual(['Canada', 'USA']);
  });

  it('should filter by boolean (true)', () => {
    const filters: FilterState = {
      certified: { enabled: true },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(3);
    expect(result.every((a) => a.certified)).toBe(true);
  });

  it('should filter by boolean (false)', () => {
    const filters: FilterState = {
      certified: { enabled: false },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(2);
    expect(result.every((a) => !a.certified)).toBe(true);
  });

  it('should apply multiple filters (AND logic)', () => {
    const filters: FilterState = {
      weight: { range: [100, 500] },
      certified: { enabled: true },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(2);
    expect(
      result.every((a) => a.weight >= 100 && a.weight <= 500 && a.certified),
    ).toBe(true);
  });

  it('should handle non-numeric values in range filter gracefully', () => {
    const assetsWithNonNumeric = [
      { weight: 50, purity: 99, origin: 'USA', certified: true },
      { weight: NaN, purity: 95, origin: 'Canada', certified: true }, // NaN weight
      { weight: 300, purity: 80, origin: 'Australia', certified: false },
    ];

    const filters: FilterState = {
      weight: { range: [100, 1000] },
    };

    const result = applyFilters(
      assetsWithNonNumeric as TestAsset[],
      filters,
      accessor,
    );
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(300);
  });

  it('should handle empty multiSelect as no filter', () => {
    const filters: FilterState = {
      origin: { multiSelected: [] },
    };

    const result = applyFilters(mockAssets, filters, accessor);
    expect(result).toHaveLength(5);
  });
});

describe('assetClassAttributes', () => {
  it('should have commodities attributes', () => {
    expect(assetClassAttributes.commodities).toBeDefined();
    expect(assetClassAttributes.commodities.length).toBeGreaterThan(0);
  });

  it('should have collectibles attributes', () => {
    expect(assetClassAttributes.collectibles).toBeDefined();
    expect(assetClassAttributes.collectibles.length).toBeGreaterThan(0);
  });

  it('should have real-estate attributes', () => {
    expect(assetClassAttributes['real-estate']).toBeDefined();
    expect(assetClassAttributes['real-estate'].length).toBeGreaterThan(0);
  });

  it('should have art attributes', () => {
    expect(assetClassAttributes.art).toBeDefined();
    expect(assetClassAttributes.art.length).toBeGreaterThan(0);
  });

  it('should have base "all" attributes', () => {
    expect(assetClassAttributes.all).toBeDefined();
    expect(assetClassAttributes.all.length).toBeGreaterThan(0);
  });

  it('should have unique IDs within each asset class', () => {
    Object.entries(assetClassAttributes).forEach(([className, attributes]) => {
      const ids = attributes.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
