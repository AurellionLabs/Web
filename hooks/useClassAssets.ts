'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePlatform } from '@/app/providers/platform.provider';
import { Asset } from '@/domain/shared';
import { FilterState, applyFilters } from './useAttributeFilters';

/**
 * State type for the hook
 */
type ClassAssetsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; assets: Asset[] };

/**
 * Return type for the useClassAssets hook
 */
export interface UseClassAssetsReturn {
  /** All assets in the class */
  assets: Asset[];
  /** Assets filtered by current filters */
  filteredAssets: Asset[];
  /** Unique asset type names within the class */
  assetTypes: string[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Current filter state */
  filters: FilterState;
  /** Set a filter value */
  setFilters: (filters: FilterState) => void;
  /** Selected asset type for additional filtering */
  selectedAssetType: string | null;
  /** Set the selected asset type */
  setSelectedAssetType: (type: string | null) => void;
  /** Refetch the class assets */
  refetch: () => Promise<void>;
}

/**
 * Hook for managing assets within a specific asset class
 *
 * Features:
 * - Fetches assets for a given class
 * - Provides filtering by attributes
 * - Provides filtering by asset type (name)
 * - Extracts unique asset types from the class
 * - Loading and error states
 *
 * @param className - The asset class to fetch assets for
 *
 * @example
 * ```tsx
 * const {
 *   assets,
 *   filteredAssets,
 *   assetTypes,
 *   isLoading,
 *   filters,
 *   setFilters,
 *   selectedAssetType,
 *   setSelectedAssetType,
 * } = useClassAssets('Goat');
 *
 * // Filter by asset type
 * setSelectedAssetType('Boer Goat');
 *
 * // Apply attribute filters
 * setFilters({ weight: { range: [10, 50] } });
 * ```
 */
export function useClassAssets(className: string): UseClassAssetsReturn {
  const { getClassAssets } = usePlatform();

  // State
  const [state, setState] = useState<ClassAssetsState>({ status: 'idle' });
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(
    null,
  );

  // Derived state
  const assets = state.status === 'success' ? state.assets : [];
  const isLoading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;

  /**
   * Extract unique asset types (names) from the assets
   */
  const assetTypes = useMemo(() => {
    const names = new Set(assets.map((a) => a.name));
    return Array.from(names).sort();
  }, [assets]);

  /**
   * Filter assets by selected type and attribute filters
   */
  const filteredAssets = useMemo(() => {
    let result = assets;

    // Filter by selected asset type
    if (selectedAssetType) {
      result = result.filter((a) => a.name === selectedAssetType);
    }

    // Apply attribute filters
    if (Object.keys(filters).length > 0) {
      result = applyFilters(
        result as unknown as Record<string, unknown>[],
        filters,
        (asset: Record<string, unknown>, attributeId: string) => {
          // Find the attribute value in the asset
          const attributes = asset.attributes as
            | Array<{
                name: string;
                values: string[];
              }>
            | undefined;
          const attr = attributes?.find(
            (a) => a.name.toLowerCase() === attributeId.toLowerCase(),
          );
          if (!attr) return null;

          // Return the first value if single, or the values array
          if (attr.values.length === 1) {
            return attr.values[0];
          }
          return attr.values;
        },
      ) as unknown as Asset[];
    }

    return result;
  }, [assets, selectedAssetType, filters]);

  /**
   * Fetch assets for the class
   */
  const fetchAssets = useCallback(async () => {
    if (!className) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const classAssets = await getClassAssets(className);
      setState({ status: 'success', assets: classAssets });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load class assets';
      console.error(
        `[useClassAssets] Error loading assets for ${className}:`,
        err,
      );
      setState({ status: 'error', error: message });
    }
  }, [className, getClassAssets]);

  // Fetch on mount and when className changes
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset selected type when class changes
  useEffect(() => {
    setSelectedAssetType(null);
    setFilters({});
  }, [className]);

  return useMemo(
    () => ({
      assets,
      filteredAssets,
      assetTypes,
      isLoading,
      error,
      filters,
      setFilters,
      selectedAssetType,
      setSelectedAssetType,
      refetch: fetchAssets,
    }),
    [
      assets,
      filteredAssets,
      assetTypes,
      isLoading,
      error,
      filters,
      selectedAssetType,
      fetchAssets,
    ],
  );
}

export default useClassAssets;
