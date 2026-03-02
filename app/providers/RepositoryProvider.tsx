'use client';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useWallet } from '@/hooks/useWallet';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_DEFAULT_CHAIN_ID,
} from '@/chain-constants';
import { Ausys__factory } from '@/lib/contracts';
import { LoadingScreen } from '@/app/components/ui/loading-screen';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';

interface RepositoryProviderProps {
  children: ReactNode;
}

const IS_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
const MAX_E2E_INIT_RETRIES = 5;

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
      let provider: ethers.BrowserProvider;

      if (IS_E2E_TEST_MODE) {
        const injectedEthereum = (window as Window & { ethereum?: any })
          .ethereum;
        if (!injectedEthereum) {
          throw new Error(
            'E2E test mode requires an injected wallet provider.',
          );
        }

        provider = new ethers.BrowserProvider(injectedEthereum);
        await provider.send('eth_requestAccounts', []);
      } else {
        if (isReady && !privy.authenticated) {
          await connect();
          if (!privy.authenticated) {
            throw new Error('Authentication failed after connect attempt.');
          }
        }

        const connectedWallet = privyWallets.wallets?.[0];

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
          throw new Error(
            `Privy wallet not available after connection attempt.`,
          );
        }

        const ethereumProvider = await connectedWallet.getEthereumProvider();
        if (!ethereumProvider) {
          throw new Error('Ethereum provider not available from Privy wallet.');
        }
        provider = new ethers.BrowserProvider(ethereumProvider);
      }

      const signer = await provider.getSigner();

      const ausysContract = Ausys__factory.connect(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        signer,
      );

      const pinata = new PinataSDK({
        pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
        pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
      });

      // Verify the user is connected to the correct chain before initializing
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      if (chainId !== NEXT_PUBLIC_DEFAULT_CHAIN_ID) {
        const chainNames: Record<number, string> = {
          1: 'Ethereum Mainnet',
          8453: 'Base Mainnet',
          84532: 'Base Sepolia',
        };
        const expected =
          chainNames[NEXT_PUBLIC_DEFAULT_CHAIN_ID] ??
          `chain ${NEXT_PUBLIC_DEFAULT_CHAIN_ID}`;
        const actual = chainNames[chainId] ?? `chain ${chainId}`;
        throw new Error(
          `Wrong network detected. Please switch your wallet to ${expected} (currently on ${actual}).`,
        );
      }

      const repoContext = RepositoryContext.getInstance();
      await repoContext.initialize(ausysContract, provider, signer, pinata);

      const serviceContext = ServiceContext.getInstance();
      serviceContext.initialize(repoContext);
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
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    if (isInitialized) {
      return;
    }

    if (
      !IS_E2E_TEST_MODE &&
      (!isReady || !privy.ready || !privyWallets.ready)
    ) {
      return;
    }

    const init = async () => {
      try {
        await initializeRepository();
      } catch (err) {
        if (mounted) {
          console.error('[RepositoryProvider] useEffect init error:', err);
          if (IS_E2E_TEST_MODE && retryCount < MAX_E2E_INIT_RETRIES) {
            retryTimeout = setTimeout(() => {
              if (!mounted) return;
              setRetryCount((prev) => prev + 1);
            }, 1000);
          }
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isReady,
    privy.ready,
    privyWallets.ready,
    isInitialized,
    isConnected,
    privy.authenticated,
    retryCount,
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

        const connectedWallet = privyWallets.wallets?.[0];
        if (!connectedWallet) return;

        const ethereumProvider = await connectedWallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(ethereumProvider);
        const newSigner = await provider.getSigner();

        if (!cancelled) {
          await repoContext.updateSigner(newSigner);
        }
      } catch (err) {
        console.error('[RepositoryProvider] Failed to update signer:', err);
      }
    };

    syncSigner();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWalletAddress, isInitialized]);

  if (!IS_E2E_TEST_MODE && (!privy.ready || !privyWallets.ready)) {
    return <LoadingScreen />;
  }

  if (!isInitialized) {
    // Show error UI for unrecoverable failures:
    // - In E2E mode: after exhausting all retries
    // - In normal mode: always (retries don't apply, error is likely user-actionable e.g. wrong network)
    const showError =
      error && (IS_E2E_TEST_MODE ? retryCount >= MAX_E2E_INIT_RETRIES : true);
    if (showError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
          <div className="max-w-xl text-center">
            <h2 className="mb-2 text-xl font-semibold">
              Wallet initialization failed
            </h2>
            <p className="text-sm text-white/80">{error.message}</p>
          </div>
        </div>
      );
    }
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
