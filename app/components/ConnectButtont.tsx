'use client'; // This marks it as a Client Component

import { colors } from '@/lib/constants/colors';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@/hooks/useWallet';

export default function ConnectButton() {
  const { connected: isMainProviderConnected, setIsWalletConnected } =
    useMainProvider();
  const { ready, authenticated } = usePrivy();
  const {
    connect: connectWallet,
    isConnected: isWalletHookConnected,
    isLoading,
  } = useWallet();

  const handleConnect = async () => {
    if (!ready) {
      console.log('Privy is not ready yet');
      return;
    }
    if (!authenticated) {
      try {
        console.log('Calling connectWallet (privy.login)...');
        await connectWallet();
        console.log('connectWallet finished.');
      } catch (error) {
        console.error('Connection error:', error);
      }
    } else {
      console.log('Already authenticated via Privy.');
    }
  };

  const buttonText =
    !ready || isLoading
      ? 'Loading...'
      : authenticated
        ? 'Connected'
        : 'Connect Wallet';
  const isDisabled = !ready || isLoading;

  return (
    <Button
      variant={'default'}
      onClick={handleConnect}
      disabled={isDisabled}
      className="px-4 py-2"
    >
      {buttonText}
    </Button>
  );
}
