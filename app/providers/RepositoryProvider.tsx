'use client';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useWallet } from '@/hooks/useWallet';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';
import { Ausys__factory } from '@/lib/contracts';
import { LoadingScreen } from '@/app/components/ui/loading-screen';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';

interface RepositoryProviderProps {
  children: ReactNode;
}

export function RepositoryProvider({ children }: RepositoryProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const privy = usePrivy();
  const privyWallets = useWallets();
  const {
    connect,
    isConnected,
    isReady,
    isInitialized: isWalletInitialized,
  } = useWallet();

  const initializeRepository = useCallback(async () => {
    try {
      console.log('Is privy ready', isReady);
      console.log('Is privy connected', isConnected);
      console.log('Is privy authenticated', privy.authenticated);
      if (isReady && !privy.authenticated) {
        console.log('calling connect');
        await connect();
        if (!privy.authenticated) {
          throw new Error('Authentication failed after connect attempt.');
        }
      }

      const connectedWallet = privyWallets.wallets?.[0];
      console.log(
        '[RepositoryProvider] Checking wallets. Privy Auth State:',
        privy.authenticated,
      );
      console.log(
        '[RepositoryProvider] Privy Wallets State:',
        JSON.stringify(privyWallets, null, 2),
      );

      if (!connectedWallet && privy.authenticated) {
        await privy.logout();
        await privy.login();
        if (!connectedWallet && privy.authenticated) {
          console.error(
            'Authenticated but no wallet found. User might need to link a wallet.',
            privyWallets,
          );
          throw new Error(
            `Privy wallet not available even though user is authenticated.`,
          );
        }
      } else if (!connectedWallet) {
        throw new Error(`Privy wallet not available after connection attempt.`);
      }

      const ethereumProvider = await connectedWallet.getEthereumProvider();
      if (!ethereumProvider) {
        throw new Error('Ethereum provider not available from Privy wallet.');
      }
      const provider = new ethers.BrowserProvider(ethereumProvider);

      const signer = await provider.getSigner();

      const ausysContract = Ausys__factory.connect(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        signer,
      );

      const pinata = new PinataSDK({
        pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
        pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
      });

      const repoContext = RepositoryContext.getInstance();
      await repoContext.initialize(ausysContract, provider, signer, pinata);
      console.log(
        '[RepositoryProvider] RepositoryContext initialized with Diamond.',
      );

      const serviceContext = ServiceContext.getInstance();
      serviceContext.initialize(repoContext);
      console.log('[RepositoryProvider] ServiceContext initialized.');
      // TODO: Add a check to see if the user is connected to the correct chain
      setIsInitialized(true);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('Repository initialization error:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to initialize repository'),
      );
      setIsInitialized(false);
    }
  }, [
    connect,
    privy.authenticated,
    privyWallets.wallets,
    isReady,
    isConnected,
  ]);

  // Track current wallet address for signer updates
  const currentWalletAddress = privyWallets.wallets?.[0]?.address ?? null;

  useEffect(() => {
    let mounted = true;

    if (!isReady || !privy.ready || !privyWallets.ready || isInitialized) {
      return;
    }

    const init = async () => {
      try {
        await initializeRepository();
      } catch (err) {
        if (mounted) {
          console.error('[RepositoryProvider] useEffect init error:', err);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [
    isReady,
    privy.ready,
    privyWallets.ready,
    isInitialized,
    isConnected,
    privy.authenticated,
  ]);

  // Watch for wallet address changes AFTER initialization and update the signer.
  // This handles role switches (driver ↔ customer ↔ node) where the connected
  // Privy wallet changes but RepositoryContext still has the old signer.
  useEffect(() => {
    if (!isInitialized || !currentWalletAddress) return;

    let cancelled = false;

    const syncSigner = async () => {
      try {
        const repoContext = RepositoryContext.getInstance();
        const storedAddr = await repoContext.getSignerAddress();

        if (storedAddr.toLowerCase() === currentWalletAddress.toLowerCase()) {
          return; // Already in sync
        }

        console.log(
          `[RepositoryProvider] Wallet changed (${storedAddr} → ${currentWalletAddress}). Updating signer...`,
        );

        const connectedWallet = privyWallets.wallets?.[0];
        if (!connectedWallet) return;

        const ethereumProvider = await connectedWallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(ethereumProvider);
        const newSigner = await provider.getSigner();

        if (!cancelled) {
          await repoContext.updateSigner(newSigner);
          console.log('[RepositoryProvider] Signer updated successfully.');
        }
      } catch (err) {
        console.error('[RepositoryProvider] Failed to update signer:', err);
      }
    };

    syncSigner();

    return () => {
      cancelled = true;
    };
  }, [currentWalletAddress, isInitialized]);

  if (!privy.ready || !privyWallets.ready) {
    return <LoadingScreen />;
  }

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
