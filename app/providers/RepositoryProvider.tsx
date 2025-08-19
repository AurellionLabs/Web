'use client';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useWallet } from '@/hooks/useWallet';
import {
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
} from '@/chain-constants';
import {
  AurumNodeManager__factory,
  LocationContract__factory,
  AuraAsset__factory,
} from '@/typechain-types';
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
      const aurumContract = AurumNodeManager__factory.connect(
        NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
        signer,
      );

      const ausysContract = LocationContract__factory.connect(
        NEXT_PUBLIC_AUSYS_ADDRESS,
        signer,
      );

      const auraAssetContract = AuraAsset__factory.connect(
        NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        signer,
      );
      const repoContext = RepositoryContext.getInstance();
      const pinata = new PinataSDK({
        pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
        pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
      });
      await repoContext.initialize(
        auraAssetContract,
        ausysContract,
        aurumContract,
        provider,
        signer,
        pinata,
      );
      console.log('[RepositoryProvider] RepositoryContext initialized.');

      const serviceContext = ServiceContext.getInstance(repoContext);
      serviceContext.initialize();
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

  if (!privy.ready || !privyWallets.ready) {
    return <LoadingScreen />;
  }

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
