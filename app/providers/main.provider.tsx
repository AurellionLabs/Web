'use client';
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

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
      http: ['https://eth.llamarpc.com/'],
    },
    privyWalletOverride: {
      http: ['https://eth.llamarpc.com/'],
    },
  },
};

export function MainProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('customer');
  const [connected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    // Get the first segment of the path (e.g., /driver -> driver)
    const pathSegment = pathname.split('/')[1];

    // Only update if the path segment is one of our valid roles
    if (
      pathSegment === 'driver' ||
      pathSegment === 'customer' ||
      pathSegment === 'node'
    ) {
      setCurrentUserRole(pathSegment as UserRole);
    }
  }, [pathname]);

  const value = useMemo(
    () => ({
      currentUserRole,
      setCurrentUserRole,
      connected,
      setIsWalletConnected,
    }),
    [currentUserRole, connected],
  );

  return <MainContext.Provider value={value}>{children}</MainContext.Provider>;
}

export function useMainProvider() {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMainProvider must be used within MainProvider');
  }
  return context;
}
