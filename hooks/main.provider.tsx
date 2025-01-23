'use client'
import React, { createContext, useContext, useState, type ReactNode } from 'react';

const ChainContext = createContext<{
  connected: boolean;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
} | undefined>(undefined);

export const useChainProvider = () => {
  const context = useContext(ChainContext);
  if (!context) throw new Error('useChainProvider must be used within MainProvider');
  return context;
};


const MainProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = useState(false);

  return (
    <ChainContext.Provider value={{ connected, setConnected }}>
      {children}
    </ChainContext.Provider>
  )
};

export default MainProvider;
