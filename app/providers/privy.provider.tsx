'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { arbitrum, sepolia, base, baseSepolia } from 'viem/chains';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
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
        supportedChains: [arbitrum, sepolia, base, baseSepolia],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
