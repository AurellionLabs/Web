'use client';
//
import { ReactNode, useEffect } from 'react';
import {
  addRpcUrlOverrideToChain,
  PrivyProvider,
  useWallets,
} from '@privy-io/react-auth';
import { arbitrum, sepolia, base, baseSepolia, mainnet } from 'viem/chains';
import {
  setProvider,
  setSigner,
  setWalletAddress,
} from '@/dapp-connectors/base-controller';
import { BrowserProvider } from 'ethers';
import { E2EAuthProvider } from '@/app/providers/e2e-auth.provider';

const IS_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
const TEST_CHAIN_ID_HEX = '0x14a34';
const TEST_CHAIN_ID_DEC = '84532';

async function testWalletRpc(method: string, params: unknown[] = []) {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/test-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method, params }),
      });

      if (!response.ok) {
        throw new Error(
          `Test wallet route unavailable (${response.status} ${response.statusText})`,
        );
      }

      const payload = await response.json();
      if (payload?.error) {
        const error = new Error(
          payload.error.message || 'Test wallet RPC error',
        );
        (error as Error & { code?: number }).code = payload.error.code;
        throw error;
      }

      return payload?.result;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delayMs = 500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function installE2ETestWalletShim() {
  if (!IS_E2E_TEST_MODE || typeof window === 'undefined') {
    return;
  }
  const browserWindow = window as Window & { ethereum?: unknown };
  if (browserWindow.ethereum) return;

  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  let connected = false;
  let selectedAddress: string | null = null;

  const emit = (event: string, ...args: unknown[]) => {
    const handlers = listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error('[E2EWalletShim] Event handler error:', error);
      }
    });
  };

  const ethereum = {
    isMetaMask: true,
    selectedAddress: null as string | null,
    chainId: TEST_CHAIN_ID_HEX,
    networkVersion: TEST_CHAIN_ID_DEC,
    isConnected: () => connected,
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)?.push(handler);
    },
    removeListener: (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = listeners.get(event);
      if (!handlers) return;
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    },
    removeAllListeners: (event?: string) => {
      if (event) {
        listeners.delete(event);
        return;
      }
      listeners.clear();
    },
    request: async ({
      method,
      params = [],
    }: {
      method: string;
      params?: unknown[];
    }) => {
      if (method === 'eth_chainId') return TEST_CHAIN_ID_HEX;
      if (method === 'net_version') return TEST_CHAIN_ID_DEC;
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
        const accounts = (await testWalletRpc(method, params)) as string[];
        const address = accounts?.[0] || null;
        selectedAddress = address;
        ethereum.selectedAddress = address;
        connected = !!address;
        if (connected) {
          emit('connect', { chainId: TEST_CHAIN_ID_HEX });
          emit('accountsChanged', accounts);
        } else {
          emit('accountsChanged', []);
        }
        return accounts;
      }

      return testWalletRpc(method, params);
    },
  };

  Object.defineProperty(browserWindow, 'ethereum', {
    value: ethereum,
    writable: false,
    configurable: false,
  });
}

// New component to handle wallet-dependent effects
function PrivyWalletSetupEffect() {
  const { wallets } = useWallets(); // useWallets is now correctly scoped

  useEffect(() => {
    if (IS_E2E_TEST_MODE) return;

    const setupProvider = async () => {
      if (
        IS_E2E_TEST_MODE &&
        (!wallets || wallets.length === 0) &&
        (window as Window & { ethereum?: any }).ethereum
      ) {
        try {
          const ethersProvider = new BrowserProvider(
            (window as Window & { ethereum?: any }).ethereum,
          );
          await ethersProvider.send('eth_requestAccounts', []);
          setProvider(ethersProvider);
          const newSigner = await ethersProvider.getSigner();
          setSigner(newSigner);
          const newAddress = await newSigner.getAddress();
          setWalletAddress(newAddress);
          return;
        } catch (error) {
          console.error('Error setting up E2E injected provider:', error);
        }
      }

      if (wallets && wallets.length > 0 && wallets[0]) {
        try {
          const privyEthereumProvider = await wallets[0].getEthereumProvider();
          // Ensure provider is not null or undefined before proceeding
          if (!privyEthereumProvider) {
            console.warn('Privy Ethereum provider is not available.');
            setProvider(null);
            setSigner(null);
            setWalletAddress('');
            return;
          }
          const ethersProvider = new BrowserProvider(privyEthereumProvider);
          setProvider(ethersProvider);

          const newSigner = await ethersProvider.getSigner();
          setSigner(newSigner);

          const newAddress = await newSigner.getAddress();
          setWalletAddress(newAddress);
        } catch (error) {
          console.error('Error setting up Privy provider:', error);
          setProvider(null);
          setSigner(null);
          setWalletAddress('');
        }
      } else {
        // Wallet disconnected or not available
        setProvider(null);
        setSigner(null);
        setWalletAddress('');
      }
    };
    setupProvider();
  }, [wallets]);

  return null; // This component does not render anything itself
}

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  installE2ETestWalletShim();

  const arbitrumOverride = addRpcUrlOverrideToChain(
    arbitrum,
    process.env.NEXT_PUBLIC_RPC_URL_42161 || 'https://arb1.arbitrum.io/rpc',
  );
  const baseSepoliaOverride = addRpcUrlOverrideToChain(
    baseSepolia,
    process.env.NEXT_PUBLIC_RPC_URL_84532 || 'https://sepolia.base.org',
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: IS_E2E_TEST_MODE
          ? ['email'] // E2E: email-only prevents Privy from contacting MetaMask/OKX
          : ['wallet', 'email', 'google', 'twitter'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          walletChainType: 'ethereum-only',
        },
        defaultChain: arbitrum,
        supportedChains: [
          arbitrumOverride,
          sepolia,
          base,
          baseSepoliaOverride,
          mainnet,
        ],
        fundingMethodConfig: {
          moonpay: {},
        },
      }}
    >
      {!IS_E2E_TEST_MODE && <PrivyWalletSetupEffect />}
      {IS_E2E_TEST_MODE ? (
        <E2EAuthProvider>{children}</E2EAuthProvider>
      ) : (
        children
      )}
    </PrivyProvider>
  );
}
