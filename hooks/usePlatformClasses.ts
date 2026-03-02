'use client';

import { useMemo, useCallback } from 'react';
import { usePlatform } from '@/app/providers/platform.provider';
import { AssetClass } from '@/domain/platform';

/**
 * State returned by the usePlatformClasses hook
 */
export interface UsePlatformClassesReturn {
  /** Array of asset classes with computed statistics */
  classes: AssetClass[];
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch the classes data */
  refetch: () => Promise<void>;
  /** Search/filter classes by name */
  searchClasses: (query: string) => AssetClass[];
  /** Get a specific class by name */
  getClassByName: (name: string) => AssetClass | undefined;
}

/**
 * Hook for accessing and managing platform asset classes
 *
 * Features:
 * - Access to all asset classes with computed statistics
 * - Loading and error states
 * - Search functionality
 * - Refetch capability
 *
 * @example
 * ```tsx
 * const { classes, isLoading, error, searchClasses } = usePlatformClasses();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState message={error} />;
 *
 * const filtered = searchClasses(query);
 * return <ClassGrid classes={filtered} />;
 * ```
 */
export function usePlatformClasses(): UsePlatformClassesReturn {
  const { assetClasses, isLoading, error, refreshPlatformData } = usePlatform();

  /**
   * Search classes by name (case-insensitive)
   */
  const searchClasses = useCallback(
    (query: string): AssetClass[] => {
      if (!query.trim()) return assetClasses;

      const normalizedQuery = query.toLowerCase().trim();
      return assetClasses.filter((cls) =>
        cls.name.toLowerCase().includes(normalizedQuery),
      );
    },
    [assetClasses],
  );

  /**
   * Get a specific class by name
   */
  const getClassByName = useCallback(
    (name: string): AssetClass | undefined => {
      return assetClasses.find(
        (cls) => cls.name.toLowerCase() === name.toLowerCase(),
      );
    },
    [assetClasses],
  );

  return useMemo(
    () => ({
      classes: assetClasses,
      isLoading,
      error,
      refetch: refreshPlatformData,
      searchClasses,
      getClassByName,
    }),
    [
      assetClasses,
      isLoading,
      error,
      refreshPlatformData,
      searchClasses,
      getClassByName,
    ],
  );
}

export default usePlatformClasses;
