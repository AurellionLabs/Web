'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Asset } from '@/domain/shared';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

export interface PlatformContextType {
  supportedAssets: Asset[];
  supportedAssetClasses: string[];
  isLoading: boolean;
  error: string | null;
  refreshPlatformData: () => Promise<void>;
  getClassTokenizableAssets: (assetClass: string) => Promise<Asset[]>;
  getAssetByTokenId: (tokenId: string) => Promise<Asset | null>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined,
);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [supportedAssets, setSupportedAssets] = useState<Asset[]>([]);
  const [supportedAssetClasses, setSupportedAssetClasses] = useState<string[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repository = RepositoryContext.getInstance().getPlatformRepository();

  const getAssetByTokenId = async (tokenId: string) => {
    const asset = await repository.getAssetByTokenId(tokenId);
    return asset;
  };

  const refreshPlatformData = async () => {
    console.log('[PlatformProvider] Entering refreshPlatformData function...');

    setIsLoading(true);
    setError(null);

    // Handle each promise separately so one failure doesn't block the other
    const results = await Promise.allSettled([
      repository.getSupportedAssets(),
      repository.getSupportedAssetClasses(),
    ]);

    const [assetsResult, assetClassesResult] = results;

    // Handle assets result
    if (assetsResult.status === 'fulfilled') {
      console.log(
        '[PlatformProvider] Raw data from repository.getSupportedAssets():',
        assetsResult.value,
      );
      setSupportedAssets(assetsResult.value);
    } else {
      console.error(
        '[PlatformProvider] Error loading supported assets:',
        assetsResult.reason,
      );
      setError(
        assetsResult.reason instanceof Error
          ? assetsResult.reason.message
          : 'Failed to load supported assets',
      );
    }

    // Handle asset classes result
    if (assetClassesResult.status === 'fulfilled') {
      console.log(
        '[PlatformProvider] Raw data from repository.getSupportedAssetClasses():',
        assetClassesResult.value,
      );
      setSupportedAssetClasses(assetClassesResult.value);
    } else {
      console.error(
        '[PlatformProvider] Error loading supported asset classes:',
        assetClassesResult.reason,
      );
      // Set error for asset classes failure
      const assetClassesError =
        assetClassesResult.reason instanceof Error
          ? assetClassesResult.reason.message
          : 'Failed to load supported asset classes';
      setError((prevError) =>
        prevError ? `${prevError}; ${assetClassesError}` : assetClassesError,
      );
    }

    setIsLoading(false);
  };

  const getClassTokenizableAssets = async (
    assetClass: string,
  ): Promise<Asset[]> => {
    const key = assetClass.trim();
    if (!key) return [];
    try {
      const assets = await repository.getClassAssets(key);
      // Assets that are tokenizable are guaranteed to have at least 2 values for every attribute.
      // So it is enough to only check the first attribute to determine if the asset is tokenizable.
      return assets.filter(
        (asset) =>
          // Verify attributes array exists
          asset.attributes &&
          // Ensure attributes array is not empty
          asset.attributes.length > 0 &&
          // Validate that the first attribute has a values property
          asset.attributes[0]?.values &&
          // Confirm the attribute has multiple values (tokenizable requirement)
          asset.attributes[0].values.length > 1,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load class assets';
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    console.log(
      '[PlatformProvider] useEffect triggered, calling refreshPlatformData...',
    );
    refreshPlatformData();
  }, []);

  return (
    <PlatformContext.Provider
      value={{
        supportedAssets,
        supportedAssetClasses,
        isLoading,
        error,
        refreshPlatformData,
        getClassTokenizableAssets,
        getAssetByTokenId,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
