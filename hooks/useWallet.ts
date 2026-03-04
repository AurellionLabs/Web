import { useState, useEffect, useCallback } from 'react';
import {
  ConnectedWallet,
  usePrivy,
  useWallets,
  Wallet,
} from '@privy-io/react-auth';
import { PrivyWalletRepository } from '@/infrastructure/repositories/privy-wallet-repository';
import { useE2EAuth } from '@/app/providers/e2e-auth.provider';
import { setCurrentChainId } from '@/infrastructure/config/indexer-endpoint';

export const IS_E2E_TEST_MODE =
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

// Helper function to parse chainId string to number
const parseChainId = (chainIdStr: string | undefined | null): number | null => {
  if (!chainIdStr) return null;
  try {
    const parts = chainIdStr.split(':');
    return parts.length > 1 ? parseInt(parts[1], 10) : null;
  } catch (e) {
    console.error('Failed to parse chainId string:', chainIdStr, e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// E2E path — reads from E2EAuthContext, never touches Privy
// ---------------------------------------------------------------------------
function useWalletE2E() {
  const e2eAuth = useE2EAuth();

  const connect = useCallback(async () => {
    // E2E wallet auto-connects via E2EAuthProvider init
  }, []);

  const disconnect = useCallback(async () => {
    // no-op in E2E mode
  }, []);

  return {
    isConnected: e2eAuth.isConnected,
    connectedWallet: null as ConnectedWallet | null,
    address: e2eAuth.address,
    chainId: 84532, // Base Sepolia
    error: null,
    connect,
    disconnect,
    repository: null,
    isLoading: !e2eAuth.isReady,
    isInitialized: e2eAuth.isReady && e2eAuth.isConnected,
    isReady: e2eAuth.isReady,
  };
}

// ---------------------------------------------------------------------------
// Production path — Privy-backed (must be inside PrivyProvider)
// ---------------------------------------------------------------------------
function useWalletPrivy() {
  const privy = usePrivy();
  const privyWallets = useWallets();

  const initialConnectedWallet = privyWallets.wallets?.[0];

  const [repository, setRepository] = useState<PrivyWalletRepository | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState<boolean>(
    () => privy.authenticated && !!privyWallets.wallets?.[0],
  );
  const [connectedWallet, setConnectedWallet] =
    useState<ConnectedWallet | null>(initialConnectedWallet);
  const [address, setAddress] = useState<string | null>(
    initialConnectedWallet?.address ?? null,
  );
  const [chainId, setChainId] = useState<number | null>(
    parseChainId(initialConnectedWallet?.chainId),
  );

  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!privy.ready || !privyWallets.ready || repository) return;
    const newRepository = new PrivyWalletRepository(privyWallets, privy);
    setRepository(newRepository);
  }, [
    privy.ready,
    privyWallets.ready,
    privyWallets.wallets,
    repository,
    privy,
  ]);

  useEffect(() => {
    const currentWallet = privyWallets.wallets?.[0];
    setConnectedWallet(currentWallet ?? null);
    setIsConnected(privy.authenticated && !!currentWallet);
    setAddress(currentWallet?.address ?? null);
    const newChainId = parseChainId(currentWallet?.chainId);
    setChainId(newChainId);
    // Sync to indexer endpoint resolver so repositories use the right URL
    setCurrentChainId(newChainId);
  }, [privy.authenticated, privyWallets.wallets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as Window & {
      ethereum?: { on?: Function; removeListener?: Function };
    };
    if (!win.ethereum?.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const newAddress = accounts[0]?.toLowerCase();
      const currentAddress = connectedWallet?.address?.toLowerCase();

      if (!newAddress) {
        setConnectedWallet(null);
        setIsConnected(false);
        setAddress(null);
        setChainId(null);
        return;
      }

      if (newAddress === currentAddress) return;

      const matchingPrivyWallet = privyWallets.wallets?.find(
        (w) => w.address?.toLowerCase() === newAddress,
      );

      if (matchingPrivyWallet) {
        setConnectedWallet(matchingPrivyWallet);
        setIsConnected(true);
        setAddress(matchingPrivyWallet.address);
        setChainId(parseChainId(matchingPrivyWallet.chainId));
      } else {
        setAddress(newAddress);
      }
    };

    win.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      win.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [connectedWallet, privyWallets.wallets]);

  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await privy.login();
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to connect wallet'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [privy]);

  const disconnect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await privy.logout();
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to disconnect wallet'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [privy]);

  return {
    isConnected,
    connectedWallet,
    address,
    chainId,
    error,
    connect,
    disconnect,
    repository,
    isLoading,
    isInitialized: privy.ready && privyWallets.ready && !!repository,
    isReady: privy.ready && privyWallets.ready,
  };
}

// ---------------------------------------------------------------------------
// Public export — build-time constant selects the right implementation
// ---------------------------------------------------------------------------
export function useWallet() {
  if (IS_E2E_TEST_MODE) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useWalletE2E();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWalletPrivy();
}
