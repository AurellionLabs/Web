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
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useE2EAuth } from '@/app/providers/e2e-auth.provider';
import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';

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
  const pinata = new PinataSDK({
    pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
    pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
  });

  const repoContext = RepositoryContext.getInstance();
  await repoContext.initialize(ausysContract, provider, signer, pinata);
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
  const privy = usePrivy();
  const privyWallets = useWallets();
  const { connect, isConnected, isReady } = useWallet();

  const initializeRepository = useCallback(async () => {
    try {
      if (isReady && !privy.authenticated) {
        await connect();
      }

      const connectedWallet = privyWallets.wallets?.[0];
      if (!connectedWallet) {
        throw new Error('Privy wallet not available.');
      }

      const ethereumProvider = await connectedWallet.getEthereumProvider();
      if (!ethereumProvider) {
        throw new Error('Ethereum provider not available from Privy wallet.');
      }

      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      await setupRepository(provider, signer);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('[RepositoryProviderPrivy] init error:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to initialise repository'),
      );
    }
  }, [connect, privy.authenticated, privyWallets.wallets, isReady]);

  // Re-sync signer when wallet address changes
  const currentWalletAddress = privyWallets.wallets?.[0]?.address ?? null;
  useEffect(() => {
    if (!isInitialized || !currentWalletAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const repoCtx = RepositoryContext.getInstance();
        const stored = await repoCtx.getSignerAddress();
        if (stored.toLowerCase() === currentWalletAddress.toLowerCase()) return;
        const wallet = privyWallets.wallets?.[0];
        if (!wallet) return;
        const ep = await wallet.getEthereumProvider();
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
  }, [currentWalletAddress, isInitialized, privyWallets.wallets]);

  useEffect(() => {
    if (isInitialized || !isReady || !privy.ready || !privyWallets.ready)
      return;
    initializeRepository();
  }, [
    isReady,
    privy.ready,
    privyWallets.ready,
    isInitialized,
    privy.authenticated,
  ]);

  if (!privy.ready || !privyWallets.ready) return <LoadingScreen />;

  if (!isInitialized) {
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
                setError(null);
                initializeRepository();
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
