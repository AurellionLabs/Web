'use client';
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

type UserRole = 'customer' | 'node' | 'driver' | 'guest';

interface MainContextType {
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  connected: boolean;
  setIsWalletConnected: (isConnected: boolean) => void;
}

const MainContext = createContext<MainContextType | undefined>(undefined);

const ethereumChain = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://eth.llamarpc.com'],
    },
    privyWalletOverride: {
      http: ['https://eth.llamarpc.com'],
    },
  },
};

export function MainProvider({ children }: { children: ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('customer');
  const [connected, setIsWalletConnected] = useState(false);

  const value = {
    currentUserRole,
    setCurrentUserRole,
    connected,
    setIsWalletConnected,
  };

  return <MainContext.Provider value={value}>{children}</MainContext.Provider>;
}

export function useMainProvider() {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMainProvider must be used within MainProvider');
  }
  return context;
}
