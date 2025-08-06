'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Asset } from '@/domain/platform/platform';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

export interface PlatformContextType {
  supportedAssets: Asset[];
  supportedAssetClasses: string[];
  isLoading: boolean;
  error: string | null;
  refreshPlatformData: () => Promise<void>;
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

  const refreshPlatformData = async () => {
    console.log('[PlatformProvider] Entering refreshPlatformData function...');

    setIsLoading(true);
    setError(null);

    try {
      const [assets, assetClasses] = await Promise.all([
        repository.getSupportedAssets(),
        repository.getSupportedAssetClasses(),
      ]);

      console.log(
        '[PlatformProvider] Raw data from repository.getSupportedAssets():',
        assets,
      );
      console.log(
        '[PlatformProvider] Raw data from repository.getSupportedAssetClasses():',
        assetClasses,
      );

      setSupportedAssets(assets);
      setSupportedAssetClasses(assetClasses);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load platform data',
      );
    } finally {
      setIsLoading(false);
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
