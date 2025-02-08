'use client';

import { OperationData } from '@/dapp-connectors/staking-controller';
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context
interface PoolsContextType {
  selectedPool: OperationData | undefined;
  setSelectedPool: (pool: OperationData) => void;
}

// Create the context
const PoolsContext = createContext<PoolsContextType | undefined>(undefined);

// Provider component
export const PoolsProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPool, setSelectedPool] = useState<OperationData | undefined>();

  return (
    <PoolsContext.Provider value={{ selectedPool, setSelectedPool }}>
      {children}
    </PoolsContext.Provider>
  );
};

// Custom hook for consuming the context
export const usePoolsProvider = () => {
  const context = useContext(PoolsContext);
  if (!context) {
    throw new Error('usePools must be used within a PoolsProvider');
  }
  return context;
};
