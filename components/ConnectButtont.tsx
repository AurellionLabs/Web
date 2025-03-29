'use client'; // This marks it as a Client Component

import { colors } from '@/lib/constants/colors';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePrivy } from '@privy-io/react-auth';
import { LogOut, Wallet } from 'lucide-react';

export default function ConnectButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { isWalletConnected, setIsWalletConnected } = useMainProvider();
  const { authenticated, logout } = usePrivy();

  useEffect(() => {
    if (!authenticated && !isWalletConnected) {
      try {
        handleConnect();
      } catch (error) {
        console.error('Connection error:', error);
      }
    }
  }, [authenticated, isWalletConnected]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await setWalletProvider();
      if (response.success) {
        console.log('Connected with address:', response.address);
        setIsWalletConnected(true);
      } else {
        console.error('Connection failed:', response.error);
      }
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      if (authenticated) {
        await logout();
      }
      setIsWalletConnected(false);
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if any wallet is connected
  const isConnected = authenticated || isWalletConnected;

  return (
    <Button
      variant={isConnected ? 'outline' : 'default'}
      onClick={isConnected ? handleDisconnect : handleConnect}
      disabled={isLoading}
      className="px-4 py-2 flex items-center gap-2"
    >
      {isConnected ? (
        <>
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          <span>Connect</span>
        </>
      )}
    </Button>
  );
}
