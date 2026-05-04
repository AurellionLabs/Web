import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectedWallet, usePrivy, useWallets } from '@privy-io/react-auth';
import { PrivyWalletRepository } from '@/infrastructure/repositories/privy-wallet-repository';
import { useE2EAuth } from '@/app/providers/e2e-auth.provider';
import { setCurrentChainId } from '@/infrastructure/config/indexer-endpoint';

export const IS_E2E_TEST_MODE =
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

type AuthTransitionState =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'disconnecting';

const normalizeAddress = (address: string | null | undefined): string | null =>
  address ? address.toLowerCase() : null;

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

const getSelectedInjectedAddress = (): string | null => {
  if (typeof window === 'undefined') return null;

  const browserWindow = window as Window & {
    ethereum?: { selectedAddress?: string | null };
  };

  return browserWindow.ethereum?.selectedAddress ?? null;
};

const findMatchingPrivyWallet = (
  wallets: ConnectedWallet[] | undefined,
  address: string | null | undefined,
): ConnectedWallet | null => {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return null;

  return (
    wallets?.find(
      (wallet) => normalizeAddress(wallet.address) === normalizedAddress,
    ) ?? null
  );
};

function useWalletE2E() {
  const e2eAuth = useE2EAuth();

  const connect = useCallback(async () => {
    // E2E wallet auto-connects via E2EAuthProvider init
  }, []);

  const disconnect = useCallback(async () => {
    // no-op in E2E mode
  }, []);

  return {
    wallets: [] as ConnectedWallet[],
    activeWallet: null as ConnectedWallet | null,
    isConnected: e2eAuth.isConnected,
    connectedWallet: null as ConnectedWallet | null,
    address: e2eAuth.address,
    chainId: 84532,
    error: null,
    connect,
    disconnect,
    repository: null,
    isLoading: !e2eAuth.isReady,
    isDisconnecting: false,
    authTransitionState: 'idle' as AuthTransitionState,
    isInitialized: e2eAuth.isReady && e2eAuth.isConnected,
    isReady: e2eAuth.isReady,
  };
}

function useWalletPrivy() {
  const privy = usePrivy();
  const privyWallets = useWallets();
  const injectedSelectedAddress = getSelectedInjectedAddress();
  const initialConnectedWallet =
    findMatchingPrivyWallet(privyWallets.wallets, injectedSelectedAddress) ??
    privyWallets.wallets?.[0] ??
    null;
  const initialAddress = initialConnectedWallet?.address ?? null;

  const activeWalletRef = useRef<ConnectedWallet | null>(
    initialConnectedWallet,
  );
  const previousAddressRef = useRef<string | null>(
    normalizeAddress(initialAddress),
  );
  const [repository, setRepository] = useState<PrivyWalletRepository | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState<boolean>(
    () => privy.authenticated && !!initialConnectedWallet,
  );
  const [connectedWallet, setConnectedWallet] =
    useState<ConnectedWallet | null>(initialConnectedWallet);
  const [address, setAddress] = useState<string | null>(initialAddress);
  const [chainId, setChainId] = useState<number | null>(
    parseChainId(initialConnectedWallet?.chainId),
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!privy.ready || !privyWallets.ready || repository) return;
    const newRepository = new PrivyWalletRepository(
      privyWallets,
      privy,
      () => activeWalletRef.current,
    );
    setRepository(newRepository);
  }, [privy.ready, privyWallets.ready, repository, privy, privyWallets]);

  useEffect(() => {
    activeWalletRef.current = connectedWallet;
  }, [connectedWallet]);

  useEffect(() => {
    const selectedInjectedAddress = getSelectedInjectedAddress();
    const matchingWallet = findMatchingPrivyWallet(
      privyWallets.wallets,
      selectedInjectedAddress,
    );
    const currentWallet = matchingWallet ?? privyWallets.wallets?.[0] ?? null;
    const nextAddress = currentWallet?.address ?? null;

    setConnectedWallet(currentWallet ?? null);
    setIsConnected(privy.authenticated && !!currentWallet);
    setAddress(nextAddress);
    const newChainId = parseChainId(currentWallet?.chainId);
    setChainId(newChainId);
    setCurrentChainId(newChainId);
  }, [privy.authenticated, privyWallets.wallets]);

  useEffect(() => {
    const normalizedAddress = normalizeAddress(address);

    if (repository && previousAddressRef.current !== normalizedAddress) {
      repository.clearProviderCache();
    }

    previousAddressRef.current = normalizedAddress;
  }, [address, repository]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const browserWindow = window as Window & {
      ethereum?: { on?: Function; removeListener?: Function };
    };

    if (!browserWindow.ethereum?.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAddress = accounts[0] ?? null;
      const normalizedNextAddress = normalizeAddress(nextAddress);
      const currentAddress = normalizeAddress(address);

      if (!normalizedNextAddress) {
        setConnectedWallet(null);
        setIsConnected(false);
        setAddress(null);
        setChainId(null);
        setCurrentChainId(null);
        return;
      }

      if (normalizedNextAddress === currentAddress) return;

      const matchingPrivyWallet = privyWallets.wallets?.find(
        (wallet) => normalizeAddress(wallet.address) === normalizedNextAddress,
      );

      if (matchingPrivyWallet) {
        setConnectedWallet(matchingPrivyWallet);
        setIsConnected(true);
        setAddress(matchingPrivyWallet.address);
        const nextChainId = parseChainId(matchingPrivyWallet.chainId);
        setChainId(nextChainId);
        setCurrentChainId(nextChainId);
      } else {
        repository?.clearProviderCache();
      }
    };

    browserWindow.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      browserWindow.ethereum?.removeListener?.(
        'accountsChanged',
        handleAccountsChanged,
      );
    };
  }, [address, privyWallets.wallets, repository]);

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
    wallets: connectedWallet ? [connectedWallet] : [],
    activeWallet: connectedWallet,
    isConnected,
    connectedWallet,
    address,
    chainId,
    error,
    connect,
    disconnect,
    repository,
    isLoading,
    isDisconnecting: false,
    authTransitionState: 'idle' as AuthTransitionState,
    isInitialized: privy.ready && privyWallets.ready && !!repository,
    isReady: privy.ready && privyWallets.ready,
  };
}

export function useWallet() {
  if (IS_E2E_TEST_MODE) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useWalletE2E();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWalletPrivy();
}
