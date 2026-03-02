import { useState, useEffect, useCallback } from 'react';
import {
  ConnectedWallet,
  usePrivy,
  useWallets,
  Wallet,
} from '@privy-io/react-auth';
import { PrivyWalletRepository } from '@/infrastructure/repositories/privy-wallet-repository';

const IS_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

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
  // Initialize eagerly from Privy state to avoid a render cycle where
  // address is set but isConnected is still false (race condition on mount).
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

  // Initialize repository when Privy wallets are ready
  useEffect(() => {
    if (IS_E2E_TEST_MODE) return;

    // Check if already initialized or not ready
    if (!privy.ready || !privyWallets.ready || repository) return;
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
    setConnectedWallet(currentWallet ?? null);
    setIsConnected(privy.authenticated && !!currentWallet);
    setAddress(currentWallet?.address ?? null);
    setChainId(parseChainId(currentWallet?.chainId));
  }, [privy.authenticated, privyWallets.wallets]);

  // Handle external wallet account switches (e.g. OKX, MetaMask account change).
  // Privy doesn't always propagate accountsChanged to its wallets array for
  // external (injected) wallets, so we listen directly on window.ethereum and
  // reconcile with the known Privy wallet list.
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
        // External wallet disconnected all accounts
        console.warn(
          '[useWallet] accountsChanged: no accounts — wallet disconnected externally',
        );
        setConnectedWallet(null);
        setIsConnected(false);
        setAddress(null);
        setChainId(null);
        return;
      }

      if (newAddress === currentAddress) return; // no actual change

      // Check if Privy already knows about this address (multi-wallet scenario)
      const matchingPrivyWallet = privyWallets.wallets?.find(
        (w) => w.address?.toLowerCase() === newAddress,
      );

      if (matchingPrivyWallet) {
        setConnectedWallet(matchingPrivyWallet);
        setIsConnected(true);
        setAddress(matchingPrivyWallet.address);
        setChainId(parseChainId(matchingPrivyWallet.chainId));
      } else {
        // Privy doesn't have a session for the newly active address.
        // Keep the Privy wallet object as-is (it's the only valid signer we
        // have), but surface the address mismatch so UI components can prompt
        // the user to reconnect / re-authenticate.
        console.warn(
          '[useWallet] accountsChanged: switched to account unknown to Privy — session mismatch. Prompt reconnect.',
          { privyAddress: currentAddress, browserAddress: newAddress },
        );
        // Mirror the browser address for display purposes only
        setAddress(newAddress);
        // isConnected stays true so the UI does not flash; the underlying signer
        // is stale and any tx will fail at the provider level — the correct
        // signal for the user to reconnect.
      }
    };

    win.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      win.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [connectedWallet, privyWallets.wallets]);

  // Simplified connect/disconnect just call Privy's login/logout
  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await privy.login();
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
      await privy.logout(); // Use privy.logout
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
