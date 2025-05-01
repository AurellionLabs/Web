import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PrivyWalletRepository } from '@/infrastructure/repositories/privy-wallet-repository';

export function useWallet() {
  const privy = usePrivy(); // Get the full Privy object
  const privyWallets = useWallets(); // Get the full Wallets object

  // The connected wallet from Privy (usually the first one)
  const connectedWallet = privyWallets.wallets?.[0];

  const [repository, setRepository] = useState<PrivyWalletRepository | null>(
    null,
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
  const isConnected = privy.authenticated && !!connectedWallet;
  const address = isConnected ? connectedWallet.address : null;
  const chainId = isConnected ? connectedWallet.chainId : null; // Keep Privy's format (e.g., eip155:84532)

  // Simplified connect/disconnect just call Privy's login/logout
  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      console.log('[useWallet] Calling Privy login()...');
      privy.login(); // Use privy.login
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
