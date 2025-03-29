'use client';

import { PrivyProvider, PrivyClientConfig } from '@privy-io/react-auth';
import { sepolia, base, baseSepolia, mainnet } from 'viem/chains';
import { ReactNode } from 'react';

// Configuration for Privy
const privyClientConfig: PrivyClientConfig = {
  appearance: {
    theme: 'dark' as 'dark',
    accentColor: '#676FFF' as `#${string}`,
    logo: 'https://aurellionlabs.com/logo.png',
  },

  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
};

export const privyConfig = {
  appId: 'cm8thvspy0126c5jya33n1j7w',
  clientId: 'client-WY5i4UhGnWwwyKpuDsHUnNMHyMUqCeEu5s9B9kaqK76pD',
  config: privyClientConfig,
  defaultChain: sepolia,
  supportedChains: [base, baseSepolia, mainnet, sepolia],
};

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider appId={privyConfig.appId} config={privyConfig.config}>
      {children}
    </PrivyProvider>
  );
}
