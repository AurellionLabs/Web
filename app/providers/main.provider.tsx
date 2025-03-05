'use client';
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from 'react';
import { initializeProvider } from '@/dapp-connectors/base-controller';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getCurrentWalletAddress } from '@/dapp-connectors/base-controller';
import { checkIfNodeExists } from '@/dapp-connectors/aurum-controller';
import { getOwnedNodeAddressList } from '@/dapp-connectors/aurum-controller';

type UserRole = 'customer' | 'node' | 'driver' | 'guest';

interface MainContextType {
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  isWalletConnected: boolean;
  setIsWalletConnected: React.Dispatch<React.SetStateAction<boolean>>;
  connected: boolean;
}

const MainContext = createContext<MainContextType | undefined>(undefined);

export function MainProvider({ children }: { children: ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('customer');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const value = {
    currentUserRole,
    setCurrentUserRole,
    isWalletConnected,
    setIsWalletConnected,
    connected: isWalletConnected,
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
