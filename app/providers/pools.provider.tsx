'use client';

import { Pool, PoolDynamicData, IPoolService } from '@/domain/pool';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the context
interface PoolsContextType {
  selectedPool: (Pool & PoolDynamicData) | undefined;
  setSelectedPool: (pool: Pool & PoolDynamicData) => void;
  pools: (Pool & PoolDynamicData)[];
  isLoading: boolean;
  error: string | null;
  refreshPools: () => Promise<void>;
  poolService: IPoolService | null;
}

// Create the context
const PoolsContext = createContext<PoolsContextType | undefined>(undefined);

// Provider component
export const PoolsProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPool, setSelectedPool] = useState<(Pool & PoolDynamicData) | undefined>();
  const [pools, setPools] = useState<(Pool & PoolDynamicData)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolService, setPoolService] = useState<IPoolService | null>(null);

  // Initialize pool service when context is available
  useEffect(() => {
    try {
      const repositoryContext = RepositoryContext.getInstance();
      const serviceContext = ServiceContext.getInstance(repositoryContext);
      
      // Check if contexts are initialized before getting service
      if (serviceContext) {
        const service = serviceContext.getPoolService();
        setPoolService(service);
      }
    } catch (error) {
      console.warn('[PoolsProvider] Service not yet initialized:', error);
      // Service will be set when contexts are properly initialized
    }
  }, []);

  const refreshPools = async () => {
    if (!poolService) {
      console.warn('[PoolsProvider] Pool service not available for refresh');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const allPools = await poolService.getAllPoolsWithDynamicData();
      setPools(allPools);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pools';
      setError(errorMessage);
      console.error('[PoolsProvider] Error loading pools:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh pools when service becomes available
  useEffect(() => {
    if (poolService) {
      refreshPools();
    }
  }, [poolService]);

  const contextValue: PoolsContextType = {
    selectedPool,
    setSelectedPool,
    pools,
    isLoading,
    error,
    refreshPools,
    poolService,
  };

  return (
    <PoolsContext.Provider value={contextValue}>
      {children}
    </PoolsContext.Provider>
  );
};

// Custom hook for consuming the context
export const usePoolsProvider = () => {
  const context = useContext(PoolsContext);
  if (!context) {
    throw new Error('usePoolsProvider must be used within a PoolsProvider');
  }
  return context;
};
