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

const IS_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

// New component to handle wallet-dependent effects
function PrivyWalletSetupEffect() {
  const { wallets } = useWallets(); // useWallets is now correctly scoped

  useEffect(() => {
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
          ? ['wallet']
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
      <PrivyWalletSetupEffect />
      {children}
    </PrivyProvider>
  );
}
