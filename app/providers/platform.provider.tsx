'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Asset } from '@/domain/shared';
import { AssetClass } from '@/domain/platform';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { CLOBV2Repository } from '@/infrastructure/repositories/clob-v2-repository';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Discriminated union for platform loading states
 */
type PlatformLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success' };

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Platform context type with enhanced functionality
 */
export interface PlatformContextType {
  // Data
  supportedAssets: Asset[];
  supportedAssetClasses: string[];
  assetClasses: AssetClass[];

  // State
  loadState: PlatformLoadState;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshPlatformData: () => Promise<void>;
  getClassAssets: (assetClass: string) => Promise<Asset[]>;
  getClassTokenizableAssets: (assetClass: string) => Promise<Asset[]>;
  getAssetByTokenId: (tokenId: string) => Promise<Asset | null>;
  invalidateCache: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// =============================================================================
// CONTEXT
// =============================================================================

const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined,
);

// =============================================================================
// PROVIDER
// =============================================================================

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  // State
  const [supportedAssets, setSupportedAssets] = useState<Asset[]>([]);
  const [supportedAssetClasses, setSupportedAssetClasses] = useState<string[]>(
    [],
  );
  const [loadState, setLoadState] = useState<PlatformLoadState>({
    status: 'idle',
  });

  // Volume data: baseTokenId → total quote volume (bigint)
  const [volumeByTokenId, setVolumeByTokenId] = useState<Map<string, bigint>>(
    new Map(),
  );

  // Cache for class assets
  const classAssetsCache = useRef<Map<string, CacheEntry<Asset[]>>>(new Map());

  // Repository access
  const repositoryRef = useRef(
    RepositoryContext.getInstance().getPlatformRepository(),
  );
  const clobRepoRef = useRef(new CLOBV2Repository());

  // Computed: isLoading and error for backwards compatibility
  const isLoading = loadState.status === 'loading';
  const error = loadState.status === 'error' ? loadState.error : null;

  /**
   * Compute AssetClass objects with statistics from raw data
   */
  const assetClasses = useMemo<AssetClass[]>(() => {
    if (supportedAssetClasses.length === 0) return [];

    return supportedAssetClasses.map((className) => {
      // Filter assets belonging to this class
      const classAssets = supportedAssets.filter(
        (asset) => asset.assetClass?.toLowerCase() === className.toLowerCase(),
      );

      // Get unique asset types (names) within this class
      const uniqueNames = new Set(classAssets.map((a) => a.name));

      // Sum CLOB trade volumes for all assets in this class
      const classVolume = classAssets.reduce((acc, asset) => {
        const vol = volumeByTokenId.get(asset.tokenId?.toString() ?? '') ?? 0n;
        return acc + vol;
      }, 0n);

      return {
        name: className,
        assetTypeCount: uniqueNames.size,
        assetCount: classAssets.length,
        totalVolume: classVolume.toString(),
        isActive: true,
      };
    });
  }, [supportedAssetClasses, supportedAssets, volumeByTokenId]);

  /**
   * Check if cache entry is still valid
   */
  const isCacheValid = useCallback((entry: CacheEntry<unknown> | undefined) => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
  }, []);

  /**
   * Invalidate all caches
   */
  const invalidateCache = useCallback(() => {
    classAssetsCache.current.clear();
    console.log('[PlatformProvider] Cache invalidated');
  }, []);

  /**
   * Get asset by token ID
   */
  const getAssetByTokenId = useCallback(async (tokenId: string) => {
    try {
      const asset = await repositoryRef.current.getAssetByTokenId(tokenId);
      return asset;
    } catch (err) {
      console.error('[PlatformProvider] Error fetching asset by tokenId:', err);
      return null;
    }
  }, []);

  /**
   * Refresh all platform data
   */
  const refreshPlatformData = useCallback(async () => {
    console.log('[PlatformProvider] Refreshing platform data...');
    setLoadState({ status: 'loading' });

    try {
      // Fetch both in parallel
      const results = await Promise.allSettled([
        repositoryRef.current.getSupportedAssets(),
        repositoryRef.current.getSupportedAssetClasses(),
      ]);

      const [assetsResult, classesResult] = results;
      const errors: string[] = [];

      // Handle assets result
      if (assetsResult.status === 'fulfilled') {
        console.log(
          `[PlatformProvider] Loaded ${assetsResult.value.length} supported assets`,
        );
        setSupportedAssets(assetsResult.value);
      } else {
        const msg =
          assetsResult.reason instanceof Error
            ? assetsResult.reason.message
            : 'Failed to load supported assets';
        console.error('[PlatformProvider] Error loading assets:', msg);
        errors.push(msg);
      }

      // Handle classes result
      if (classesResult.status === 'fulfilled') {
        console.log(
          `[PlatformProvider] Loaded ${classesResult.value.length} asset classes:`,
          classesResult.value,
        );
        setSupportedAssetClasses(classesResult.value);
      } else {
        const msg =
          classesResult.reason instanceof Error
            ? classesResult.reason.message
            : 'Failed to load asset classes';
        console.error('[PlatformProvider] Error loading classes:', msg);
        errors.push(msg);
      }

      // Set final state
      if (errors.length > 0) {
        setLoadState({ status: 'error', error: errors.join('; ') });
      } else {
        setLoadState({ status: 'success' });
      }

      // Invalidate class assets cache on refresh
      invalidateCache();

      // Fetch CLOB volume data in the background (non-blocking)
      clobRepoRef.current
        .getVolumeByBaseTokenId()
        .then((volumeMap) => {
          setVolumeByTokenId(volumeMap);
          console.log(
            `[PlatformProvider] Loaded CLOB volumes for ${volumeMap.size} token(s)`,
          );
        })
        .catch((err) => {
          console.warn('[PlatformProvider] Failed to load CLOB volumes:', err);
        });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to refresh platform data';
      console.error('[PlatformProvider] Unexpected error:', err);
      setLoadState({ status: 'error', error: msg });
    }
  }, [invalidateCache]);

  /**
   * Get assets for a specific class (with caching)
   */
  const getClassAssets = useCallback(
    async (assetClass: string): Promise<Asset[]> => {
      const key = assetClass.trim().toLowerCase();
      if (!key) return [];

      // Check cache first
      const cached = classAssetsCache.current.get(key);
      if (isCacheValid(cached)) {
        console.log(`[PlatformProvider] Cache hit for class: ${assetClass}`);
        return cached!.data;
      }

      try {
        console.log(
          `[PlatformProvider] Fetching assets for class: ${assetClass}`,
        );
        const assets = await repositoryRef.current.getClassAssets(assetClass);

        // Update cache
        classAssetsCache.current.set(key, {
          data: assets,
          timestamp: Date.now(),
        });

        return assets;
      } catch (err) {
        console.error(
          `[PlatformProvider] Error fetching class assets for ${assetClass}:`,
          err,
        );
        throw err;
      }
    },
    [isCacheValid],
  );

  /**
   * Get tokenizable assets for a class (assets with multiple attribute values)
   */
  const getClassTokenizableAssets = useCallback(
    async (assetClass: string): Promise<Asset[]> => {
      const assets = await getClassAssets(assetClass);

      // Filter to tokenizable assets (those with multiple values for attributes)
      return assets.filter(
        (asset) =>
          asset.attributes &&
          asset.attributes.length > 0 &&
          asset.attributes[0]?.values &&
          asset.attributes[0].values.length > 1,
      );
    },
    [getClassAssets],
  );

  // Initial data fetch
  useEffect(() => {
    console.log('[PlatformProvider] Initial mount, fetching platform data...');
    refreshPlatformData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Context value
  const contextValue = useMemo<PlatformContextType>(
    () => ({
      supportedAssets,
      supportedAssetClasses,
      assetClasses,
      loadState,
      isLoading,
      error,
      refreshPlatformData,
      getClassAssets,
      getClassTokenizableAssets,
      getAssetByTokenId,
      invalidateCache,
    }),
    [
      supportedAssets,
      supportedAssetClasses,
      assetClasses,
      loadState,
      isLoading,
      error,
      refreshPlatformData,
      getClassAssets,
      getClassTokenizableAssets,
      getAssetByTokenId,
      invalidateCache,
    ],
  );

  return (
    <PlatformContext.Provider value={contextValue}>
      {children}
    </PlatformContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access platform context
 */
export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
