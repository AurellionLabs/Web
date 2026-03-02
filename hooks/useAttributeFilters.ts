'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Types of filter values
 */
export type FilterValueType = 'range' | 'select' | 'multiSelect' | 'boolean';

/**
 * Definition of an attribute that can be filtered
 */
export interface FilterableAttribute {
  /** Unique identifier for the attribute */
  id: string;
  /** Display name */
  name: string;
  /** Type of filter control */
  type: FilterValueType;
  /** For range filters: minimum value */
  min?: number;
  /** For range filters: maximum value */
  max?: number;
  /** For select/multiSelect: available options */
  options?: string[];
  /** Unit label (e.g., "kg", "years") */
  unit?: string;
}

/**
 * Value of an active filter
 */
export interface FilterValue {
  /** For range: [min, max] tuple */
  range?: [number, number];
  /** For select: single selected value */
  selected?: string;
  /** For multiSelect: array of selected values */
  multiSelected?: string[];
  /** For boolean: true/false */
  enabled?: boolean;
}

/**
 * Active filters state
 */
export type FilterState = Record<string, FilterValue>;

/**
 * Predefined attribute schemas by asset class
 */
export const assetClassAttributes: Record<string, FilterableAttribute[]> = {
  commodities: [
    {
      id: 'weight',
      name: 'Weight',
      type: 'range',
      min: 0,
      max: 1000,
      unit: 'kg',
    },
    {
      id: 'purity',
      name: 'Purity',
      type: 'range',
      min: 0,
      max: 100,
      unit: '%',
    },
    {
      id: 'origin',
      name: 'Origin',
      type: 'multiSelect',
      options: ['USA', 'Canada', 'Australia', 'Europe', 'Asia'],
    },
    { id: 'certified', name: 'Certified', type: 'boolean' },
  ],
  collectibles: [
    { id: 'year', name: 'Year', type: 'range', min: 1900, max: 2024 },
    {
      id: 'condition',
      name: 'Condition',
      type: 'select',
      options: ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'],
    },
    {
      id: 'rarity',
      name: 'Rarity',
      type: 'select',
      options: ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Legendary'],
    },
    { id: 'authenticated', name: 'Authenticated', type: 'boolean' },
  ],
  'real-estate': [
    {
      id: 'sqft',
      name: 'Square Feet',
      type: 'range',
      min: 0,
      max: 10000,
      unit: 'sqft',
    },
    { id: 'bedrooms', name: 'Bedrooms', type: 'range', min: 0, max: 10 },
    {
      id: 'propertyType',
      name: 'Property Type',
      type: 'select',
      options: ['Residential', 'Commercial', 'Industrial', 'Land'],
    },
    {
      id: 'location',
      name: 'Location',
      type: 'multiSelect',
      options: ['Urban', 'Suburban', 'Rural'],
    },
  ],
  art: [
    { id: 'year', name: 'Year Created', type: 'range', min: 1500, max: 2024 },
    {
      id: 'medium',
      name: 'Medium',
      type: 'multiSelect',
      options: ['Oil', 'Acrylic', 'Watercolor', 'Digital', 'Mixed Media'],
    },
    {
      id: 'size',
      name: 'Size',
      type: 'select',
      options: ['Small', 'Medium', 'Large', 'Monumental'],
    },
    { id: 'authenticated', name: 'Authenticated', type: 'boolean' },
  ],
  all: [
    {
      id: 'priceRange',
      name: 'Price',
      type: 'range',
      min: 0,
      max: 100000,
      unit: '$',
    },
    { id: 'verified', name: 'Verified', type: 'boolean' },
  ],
};

/**
 * Hook options
 */
export interface UseAttributeFiltersOptions {
  /** Initial filter state */
  initialFilters?: FilterState;
  /** Called when filters change */
  onFilterChange?: (filters: FilterState) => void;
}

/**
 * useAttributeFilters - Hook for managing dynamic attribute filters
 *
 * Provides:
 * - Dynamic filter attributes based on asset class
 * - Filter state management
 * - Filter value setters
 * - Active filter chip generation
 *
 * @param assetClass - The asset class to get filters for
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const {
 *   attributes,
 *   filters,
 *   setFilter,
 *   clearFilter,
 *   clearAllFilters,
 *   activeFilterCount,
 * } = useAttributeFilters('commodities');
 * ```
 */
export function useAttributeFilters(
  assetClass: string,
  options: UseAttributeFiltersOptions = {},
) {
  const { initialFilters = {}, onFilterChange } = options;

  const [filters, setFilters] = useState<FilterState>(initialFilters);

  /**
   * Get attributes for the current asset class
   */
  const attributes = useMemo(() => {
    const classAttributes = assetClassAttributes[assetClass] || [];
    const baseAttributes = assetClassAttributes.all || [];
    return [...baseAttributes, ...classAttributes];
  }, [assetClass]);

  /**
   * Set a filter value
   */
  const setFilter = useCallback(
    (attributeId: string, value: FilterValue) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [attributeId]: value };
        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [onFilterChange],
  );

  /**
   * Clear a specific filter
   */
  const clearFilter = useCallback(
    (attributeId: string) => {
      setFilters((prev) => {
        const { [attributeId]: _, ...rest } = prev;
        onFilterChange?.(rest);
        return rest;
      });
    },
    [onFilterChange],
  );

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    setFilters({});
    onFilterChange?.({});
  }, [onFilterChange]);

  /**
   * Get count of active filters
   */
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).length;
  }, [filters]);

  /**
   * Get active filter chips for display
   */
  const activeFilterChips = useMemo(() => {
    return Object.entries(filters)
      .map(([id, value]) => {
        const attribute = attributes.find((a) => a.id === id);
        if (!attribute) return null;

        let displayValue = '';
        if (value.range) {
          displayValue = `${value.range[0]} - ${value.range[1]}${attribute.unit ? ` ${attribute.unit}` : ''}`;
        } else if (value.selected) {
          displayValue = value.selected;
        } else if (value.multiSelected && value.multiSelected.length > 0) {
          displayValue =
            value.multiSelected.length > 2
              ? `${value.multiSelected.slice(0, 2).join(', ')} +${value.multiSelected.length - 2}`
              : value.multiSelected.join(', ');
        } else if (value.enabled !== undefined) {
          displayValue = value.enabled ? 'Yes' : 'No';
        }

        return {
          id,
          name: attribute.name,
          value: displayValue,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; value: string }>;
  }, [filters, attributes]);

  /**
   * Check if a filter is active
   */
  const isFilterActive = useCallback(
    (attributeId: string) => {
      return attributeId in filters;
    },
    [filters],
  );

  /**
   * Get filter value for an attribute
   */
  const getFilterValue = useCallback(
    (attributeId: string): FilterValue | undefined => {
      return filters[attributeId];
    },
    [filters],
  );

  return {
    attributes,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount,
    activeFilterChips,
    isFilterActive,
    getFilterValue,
  };
}

/**
 * Apply filters to an array of assets
 */
export function applyFilters<T extends Record<string, unknown>>(
  assets: T[],
  filters: FilterState,
  attributeAccessor: (asset: T, attributeId: string) => unknown,
): T[] {
  if (Object.keys(filters).length === 0) {
    return assets;
  }

  return assets.filter((asset) => {
    return Object.entries(filters).every(([attributeId, filterValue]) => {
      const assetValue = attributeAccessor(asset, attributeId);

      // Range filter
      if (filterValue.range) {
        const [min, max] = filterValue.range;
        const numValue = Number(assetValue);
        if (isNaN(numValue)) return false;
        return numValue >= min && numValue <= max;
      }

      // Select filter
      if (filterValue.selected) {
        return assetValue === filterValue.selected;
      }

      // Multi-select filter
      if (filterValue.multiSelected && filterValue.multiSelected.length > 0) {
        return filterValue.multiSelected.includes(String(assetValue));
      }

      // Boolean filter
      if (filterValue.enabled !== undefined) {
        return Boolean(assetValue) === filterValue.enabled;
      }

      return true;
    });
  });
}

export default useAttributeFilters;
