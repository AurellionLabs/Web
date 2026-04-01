'use client';
import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { useWallet } from '@/hooks/useWallet';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_DEFAULT_CHAIN_ID,
} from '@/chain-constants';
import { Ausys__factory } from '@/lib/contracts';
import { LoadingScreen } from '@/app/components/ui/loading-screen';
import { useE2EAuth } from '@/app/providers/e2e-auth.provider';
import { ethers } from 'ethers';

export const IS_E2E_TEST_MODE =
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

interface RepositoryProviderProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Shared setup — takes a ready provider + signer, wires up contracts & context
// ---------------------------------------------------------------------------
async function setupRepository(
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
) {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== NEXT_PUBLIC_DEFAULT_CHAIN_ID) {
    const names: Record<number, string> = {
      1: 'Ethereum Mainnet',
      8453: 'Base Mainnet',
      84532: 'Base Sepolia',
    };
    throw new Error(
      `Wrong network. Expected ${names[NEXT_PUBLIC_DEFAULT_CHAIN_ID] ?? NEXT_PUBLIC_DEFAULT_CHAIN_ID}, connected to ${names[chainId] ?? chainId}.`,
    );
  }

  const ausysContract = Ausys__factory.connect(
    NEXT_PUBLIC_DIAMOND_ADDRESS,
    signer,
  );

  const repoContext = RepositoryContext.getInstance();
  await repoContext.initialize(
    ausysContract,
    provider,
    signer,
    undefined,
    chainId,
  );
  ServiceContext.getInstance().initialize(repoContext);
}

// ---------------------------------------------------------------------------
// E2E implementation — uses JsonRpcProvider + E2EServerSigner (no BrowserProvider)
// MetaMask / OKX cannot intercept JsonRpcProvider calls.
// ---------------------------------------------------------------------------
function RepositoryProviderE2E({ children }: RepositoryProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const e2eAuth = useE2EAuth();

  useEffect(() => {
    if (
      isInitialized ||
      !e2eAuth.isReady ||
      !e2eAuth.provider ||
      !e2eAuth.signer
    )
      return;

    let mounted = true;
    (async () => {
      try {
        // JsonRpcProvider is assignment-incompatible with BrowserProvider in TS
        // but all operations used by repos (getBlock, getTransaction, etc.) work identically.
        await setupRepository(
          e2eAuth.provider as unknown as ethers.BrowserProvider,
          e2eAuth.signer!,
        );
        if (mounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        console.error('[RepositoryProviderE2E] init error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        if (retryCount < 5) {
          setTimeout(() => {
            if (mounted) setRetryCount((n) => n + 1);
          }, 1500);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [
    e2eAuth.isReady,
    e2eAuth.provider,
    e2eAuth.signer,
    isInitialized,
    retryCount,
  ]);

  if (error && retryCount >= 5) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="max-w-xl text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-400">
            E2E init failed
          </h2>
          <p className="text-sm text-white/70">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) return <LoadingScreen />;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Production implementation — Privy-backed
// ---------------------------------------------------------------------------
function RepositoryProviderPrivy({ children }: RepositoryProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [needsWalletConnection, setNeedsWalletConnection] = useState(false);
  const {
    connect,
    isReady,
    error: walletError,
    isConnected,
    connectedWallet,
    isLoading: isWalletLoading,
    isDisconnecting,
    authTransitionState,
  } = useWallet();
  const walletPromptRequestedRef = useRef(false);
  const previousIsConnectedRef = useRef<boolean | null>(null);

  const initializeRepository = useCallback(async () => {
    try {
      if (!isConnected || !connectedWallet) {
        setIsInitialized(false);
        setNeedsWalletConnection(true);
        setError(null);

        if (
          !walletPromptRequestedRef.current &&
          !isWalletLoading &&
          !isDisconnecting
        ) {
          walletPromptRequestedRef.current = true;
          void connect();
        }
        return;
      }

      const ethereumProvider = await connectedWallet.getEthereumProvider();
      if (!ethereumProvider) {
        throw new Error('Ethereum provider not available from Privy wallet.');
      }

      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      await setupRepository(provider, signer);
      walletPromptRequestedRef.current = false;
      setNeedsWalletConnection(false);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('[RepositoryProviderPrivy] init error:', err);
      setNeedsWalletConnection(false);
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to initialise repository'),
      );
    }
  }, [connect, connectedWallet, isConnected, isDisconnecting, isWalletLoading]);

  useEffect(() => {
    const previousIsConnected = previousIsConnectedRef.current;
    previousIsConnectedRef.current = isConnected;

    if (isConnected) {
      walletPromptRequestedRef.current = false;
      setNeedsWalletConnection(false);
      setError(null);
      return;
    }

    if (previousIsConnected) {
      walletPromptRequestedRef.current = false;
    }
    if (isDisconnecting) {
      walletPromptRequestedRef.current = false;
    }
  }, [isConnected, isDisconnecting]);

  // Re-sync signer when wallet address changes
  const currentWalletAddress = connectedWallet?.address ?? null;
  useEffect(() => {
    if (!isInitialized || !currentWalletAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const repoCtx = RepositoryContext.getInstance();
        const stored = await repoCtx.getSignerAddress();
        if (stored.toLowerCase() === currentWalletAddress.toLowerCase()) return;
        if (!connectedWallet) return;
        const ep = await connectedWallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(ep);
        const signer = await provider.getSigner();
        if (!cancelled) await repoCtx.updateSigner(signer);
      } catch (err) {
        console.error('[RepositoryProviderPrivy] signer sync error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectedWallet, currentWalletAddress, isInitialized]);

  useEffect(() => {
    if (
      isInitialized ||
      !isReady ||
      isDisconnecting ||
      authTransitionState === 'authenticating'
    ) {
      return;
    }
    void initializeRepository();
  }, [
    authTransitionState,
    connectedWallet,
    initializeRepository,
    isConnected,
    isDisconnecting,
    isReady,
    isInitialized,
  ]);

  if (!isReady) return <LoadingScreen />;

  if (!isInitialized) {
    if (needsWalletConnection) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
          <div className="max-w-xl text-center">
            <h2 className="mb-2 text-xl font-semibold">
              Connect wallet to continue
            </h2>
            <p className="text-sm text-white/80">
              {walletError?.message ||
                (authTransitionState === 'authenticating'
                  ? 'Complete the wallet signature in Privy to continue.'
                  : 'A connected wallet is required to open this page.')}
            </p>
            <button
              onClick={() => {
                walletPromptRequestedRef.current = false;
                setNeedsWalletConnection(true);
                setError(null);
                void initializeRepository();
              }}
              className="mt-4 rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
          <div className="max-w-xl text-center">
            <h2 className="mb-2 text-xl font-semibold">
              Wallet initialization failed
            </h2>
            <p className="text-sm text-white/80">{error.message}</p>
            <button
              onClick={() => {
                walletPromptRequestedRef.current = false;
                setError(null);
                void initializeRepository();
              }}
              className="mt-4 rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Public export — build-time constant selects the right implementation
// ---------------------------------------------------------------------------
export function RepositoryProvider({ children }: RepositoryProviderProps) {
  if (IS_E2E_TEST_MODE) {
    return <RepositoryProviderE2E>{children}</RepositoryProviderE2E>;
  }
  return <RepositoryProviderPrivy>{children}</RepositoryProviderPrivy>;
}
