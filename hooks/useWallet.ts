import { useState, useEffect, useCallback } from 'react';
import {
  ConnectedWallet,
  usePrivy,
  useWallets,
  Wallet,
} from '@privy-io/react-auth';
import { PrivyWalletRepository } from '@/infrastructure/repositories/privy-wallet-repository';

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

export function useWallet() {
  const privy = usePrivy(); // Get the full Privy object
  const privyWallets = useWallets(); // Get the full Wallets object

  // The connected wallet from Privy (usually the first one)

  const initialConnectedWallet = privyWallets.wallets?.[0];

  const [repository, setRepository] = useState<PrivyWalletRepository | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
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

  // Initialize repository when Privy wallets are ready
  useEffect(() => {
    // Check if already initialized or not ready
    if (!privy.ready || !privyWallets.ready || repository) return;

    console.log('[useWallet] Initializing PrivyWalletRepository...');
    // Pass the full hook objects to the constructor
    const newRepository = new PrivyWalletRepository(privyWallets, privy);
    setRepository(newRepository);
  }, [
    privy.ready,
    privyWallets.ready,
    privyWallets.wallets,
    repository,
    privy,
  ]); // Adjusted dependencies

  // Derive state directly from Privy hooks and connected wallet
  useEffect(() => {
    const currentWallet = privyWallets.wallets?.[0];
    console.log('[useWallet] currentWallet', currentWallet);
    console.log('[useWallet] connectedWallet', connectedWallet);
    setConnectedWallet(currentWallet ?? null);
    setIsConnected(privy.authenticated && !!currentWallet);
    setAddress(currentWallet?.address ?? null);
    setChainId(parseChainId(currentWallet?.chainId));
  }, [privy.authenticated, privyWallets.wallets]);

  // Simplified connect/disconnect just call Privy's login/logout
  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      console.log('[useWallet] Calling Privy login()...');
      await privy.login();
      console.log('[useWallet] Privy login() finished.');
    } catch (err) {
      console.error('[useWallet] Error during login:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to connect wallet'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [privy]); // Depend on privy

  const disconnect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      console.log('[useWallet] Calling Privy logout()...');
      await privy.logout(); // Use privy.logout
      console.log('[useWallet] Privy logout() finished.');
    } catch (err) {
      console.error('[useWallet] Error during logout:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to disconnect wallet'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [privy]); // Depend on privy

  return {
    // Return derived state
    isConnected,
    connectedWallet,
    address,
    chainId,
    error,
    connect,
    disconnect,
    repository, // Still return repository if needed elsewhere
    isLoading,
    // Readiness flags based on Privy
    isInitialized: privy.ready && privyWallets.ready && !!repository, // Repository is initialized
    isReady: privy.ready && privyWallets.ready, // Privy itself is ready
  };
}
