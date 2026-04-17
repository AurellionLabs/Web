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
import { usePathname, useSearchParams } from 'next/navigation';
import { Asset } from '@/domain/shared';
import { AssetClass, IPlatformRepository } from '@/domain/platform';
import { CLOBV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { PlatformRepository } from '@/infrastructure/repositories/platform-repository';
import { NEXT_PUBLIC_DEFAULT_CHAIN_ID } from '@/chain-constants';
import { setCurrentChainId } from '@/infrastructure/config/indexer-endpoint';
import { resolvePublicNodeChain } from '@/lib/public-node-chain';
import { useWallet } from '@/hooks/useWallet';

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { chainId: walletChainId } = useWallet();
  const isPublicNodeRoute =
    pathname === '/node/explorer' ||
    (pathname === '/node/dashboard' && searchParams.get('view') === 'public');
  const publicChain = resolvePublicNodeChain(searchParams);
  const activePlatformChainId = isPublicNodeRoute
    ? publicChain.chainId
    : (walletChainId ?? NEXT_PUBLIC_DEFAULT_CHAIN_ID);

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

  // Ref to always access latest supportedAssets from callbacks without stale closures
  const supportedAssetsRef = useRef<Asset[]>(supportedAssets);
  supportedAssetsRef.current = supportedAssets;

  // Repository access
  const repositoryRef = useRef<IPlatformRepository | null>(null);
  const clobRepoRef = useRef(new CLOBV2Repository());

  const getRepository = useCallback((): IPlatformRepository => {
    if (repositoryRef.current) {
      return repositoryRef.current;
    }

    repositoryRef.current = new PlatformRepository(
      undefined,
      undefined,
      activePlatformChainId ?? NEXT_PUBLIC_DEFAULT_CHAIN_ID,
    );

    return repositoryRef.current;
  }, [activePlatformChainId]);

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
  }, []);

  useEffect(() => {
    repositoryRef.current = null;
    invalidateCache();
    setCurrentChainId(activePlatformChainId ?? null);
  }, [activePlatformChainId, invalidateCache]);

  /**
   * Get asset by token ID.
   * First checks the already-loaded supportedAssets in memory for an instant match,
   * then falls back to the repository (Pinata/IPFS) lookup.
   */
  const getAssetByTokenId = useCallback(
    async (tokenId: string) => {
      // Normalize tokenId to decimal for consistent comparison
      const normalizedId = (() => {
        try {
          return BigInt(tokenId).toString(10);
        } catch {
          return tokenId;
        }
      })();

      // Check in-memory supported assets first (fast path)
      const cached = supportedAssetsRef.current.find((a) => {
        try {
          return BigInt(a.tokenId).toString(10) === normalizedId;
        } catch {
          return a.tokenId === tokenId;
        }
      });
      if (
        cached &&
        Array.isArray(cached.attributes) &&
        cached.attributes.length
      ) {
        return cached;
      }

      // Fallback to repository/Pinata lookup when the cached asset is missing
      // or does not include hydrated attributes yet.
      try {
        const repository = getRepository();
        const asset = await repository.getAssetByTokenId(tokenId);
        if (asset) {
          if (cached) {
            return {
              ...cached,
              ...asset,
              attributes:
                Array.isArray(asset.attributes) && asset.attributes.length > 0
                  ? asset.attributes
                  : cached.attributes,
            };
          }
          return asset;
        }
        return cached ?? null;
      } catch (err) {
        console.error(
          '[PlatformProvider] Error fetching asset by tokenId:',
          err,
        );
        return cached ?? null;
      }
    },
    [getRepository],
  );

  /**
   * Refresh all platform data
   */
  const refreshPlatformData = useCallback(async () => {
    setLoadState({ status: 'loading' });

    try {
      // Fetch both in parallel
      const repository = getRepository();
      const results = await Promise.allSettled([
        repository.getSupportedAssets(),
        repository.getSupportedAssetClasses(),
      ]);
      const [assetsResult, classesResult] = results;
      const errors: string[] = [];

      // Handle assets result
      if (assetsResult.status === 'fulfilled') {
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
  }, [getRepository, invalidateCache]);

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
        return cached!.data;
      }

      try {
        const assets = await getRepository().getClassAssets(assetClass);

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
    [getRepository, isCacheValid],
  );

  /**
   * Get tokenizable assets for a class (assets with multiple attribute values)
   */
  const getClassTokenizableAssets = useCallback(
    async (assetClass: string): Promise<Asset[]> => {
      const assets = await getClassAssets(assetClass);

      // Filter to tokenizable assets (those with at least one attribute that
      // offers multiple selectable values).
      return assets.filter(
        (asset) =>
          asset.attributes &&
          asset.attributes.some(
            (attribute) =>
              Array.isArray(attribute?.values) && attribute.values.length > 1,
          ),
      );
    },
    [getClassAssets],
  );

  // Initial data fetch
  useEffect(() => {
    if (isPublicNodeRoute && activePlatformChainId === null) {
      setSupportedAssets([]);
      setSupportedAssetClasses([]);
      setVolumeByTokenId(new Map());
      setLoadState({
        status: 'error',
        error: publicChain.error || 'Unsupported public chain.',
      });
      return;
    }

    void refreshPlatformData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlatformChainId, isPublicNodeRoute, publicChain.error]);

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
