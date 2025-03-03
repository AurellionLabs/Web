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

interface ChainContextType {
  connected: boolean;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  isWalletConnected: boolean;
  setIsWalletConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isInitializing: boolean;
  lastError: string | null;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const useMainProvider = () => {
  const context = useContext(ChainContext);
  if (!context)
    throw new Error('useMainProvider must be used within MainProvider');
  return context;
};

export const MainProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('guest');
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const router = useRouter();

  // Restore role and node on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    const savedNode = localStorage.getItem('selectedNode');

    if (savedRole) {
      setCurrentUserRole(savedRole);

      // Only redirect if we're on the home page
      if (window.location.pathname === '/') {
        if (savedRole === 'node') {
          if (savedNode) {
            router.push('/node/overview');
          } else {
            router.push('/node/register');
          }
        } else if (savedRole === 'customer') {
          router.push('/customer/pools');
        }
      }
    }
  }, [router]);

  const handleRoleSelect = async (role: UserRole) => {
    setCurrentUserRole(role);
    localStorage.setItem('userRole', role);

    if (role === 'node') {
      try {
        const address = await getCurrentWalletAddress();
        const hasNode = await checkIfNodeExists(address);

        if (hasNode) {
          const nodeAddresses = await getOwnedNodeAddressList();
          if (nodeAddresses.length > 0) {
            localStorage.setItem('selectedNode', nodeAddresses[0]);
            router.push('/node/overview');
          }
        } else {
          router.push('/node/register');
        }
      } catch (error) {
        console.error('Error checking node status:', error);
        toast.error('Failed to check node status');
      }
    } else if (role === 'customer') {
      router.push('/customer/pools');
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    let mounted = true;
    const checkWallet = async () => {
      try {
        setIsInitializing(true);
        const { signer } = await initializeProvider();

        if (!mounted) return;

        if (signer) {
          const address = await signer.getAddress();
          console.log('Wallet connected:', address);
          setIsWalletConnected(true);
          setConnected(true);
          setLastError(null);
        }
      } catch (error: any) {
        console.error('Wallet check failed:', error);
        if (!mounted) return;

        setIsWalletConnected(false);
        setConnected(false);
        setLastError(error.message);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    checkWallet();

    // Setup wallet event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        if (mounted) checkWallet();
      });
      window.ethereum.on('chainChanged', () => {
        if (mounted) checkWallet();
      });
    }

    return () => {
      mounted = false;
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkWallet);
        window.ethereum.removeListener('chainChanged', checkWallet);
      }
    };
  }, []);

  const contextValue = {
    connected,
    setConnected,
    currentUserRole,
    setCurrentUserRole: handleRoleSelect,
    isWalletConnected,
    setIsWalletConnected,
    isInitializing,
    lastError,
  };

  return (
    <ChainContext.Provider value={contextValue}>
      {children}
    </ChainContext.Provider>
  );
};
