'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from './button';
import { LogOut } from 'lucide-react';
import { useMainProvider } from '@/app/providers/main.provider';

export function WalletDisconnect() {
  const { authenticated, logout } = usePrivy();
  const { isWalletConnected, setIsWalletConnected } = useMainProvider();

  if (!authenticated && !isWalletConnected) return null;

  const handleDisconnect = async () => {
    try {
      // If authenticated with Privy, use Privy logout
      if (authenticated) {
        await logout();
      }

      // Always reset the wallet connection state
      setIsWalletConnected(false);

      // Clear any stored wallet data if needed
      // You might want to add additional cleanup here
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDisconnect}
      className="text-gray-400 hover:text-white"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Disconnect
    </Button>
  );
}
