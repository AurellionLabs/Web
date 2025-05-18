'use client';
//
import { ReactNode, useEffect } from 'react';
import { PrivyProvider, useWallets } from '@privy-io/react-auth';
import { arbitrum, sepolia, base, baseSepolia, mainnet } from 'viem/chains';
import {
  setProvider,
  setSigner,
  setWalletAddress,
} from '@/dapp-connectors/base-controller';
import { BrowserProvider } from 'ethers';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const { wallets } = useWallets();
  useEffect(() => {
    const setupProvider = async () => {
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
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['wallet', 'email', 'google', 'twitter'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          walletChainType: 'ethereum-only',
        },
        defaultChain: arbitrum,
        supportedChains: [arbitrum, sepolia, base, baseSepolia, mainnet],
        fundingMethodConfig: {
          moonpay: {
            useSandbox: true,
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
