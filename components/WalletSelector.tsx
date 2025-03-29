'use client';

import { useLogin, usePrivy } from '@privy-io/react-auth';
import { Button } from './ui/button';
import { useState } from 'react';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';
import { useMainProvider } from '@/app/providers/main.provider';

export function WalletSelector() {
  const { login } = useLogin();
  const { ready, authenticated, logout } = usePrivy();
  const { setIsWalletConnected } = useMainProvider();
  const [isLoading, setIsLoading] = useState(false);

  const handlePrivyLogin = async () => {
    setIsLoading(true);
    try {
      login();
    } catch (error) {
      console.error('Privy login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivyLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setIsWalletConnected(false);
    } catch (error) {
      console.error('Privy logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetaMaskLogin = async () => {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">Connect Your Wallet</h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {authenticated ? (
          <Button
            onClick={handlePrivyLogout}
            disabled={!ready || isLoading}
            variant="destructive"
            className="p-4 h-auto"
          >
            <div className="flex flex-col items-center">
              <span className="text-lg">Disconnect Wallet</span>
              <span className="text-sm text-gray-400">Sign out from Privy</span>
            </div>
          </Button>
        ) : (
          <>
            <Button
              onClick={handlePrivyLogin}
              disabled={!ready || isLoading}
              className="p-4 h-auto"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">Privy Wallet</span>
                <span className="text-sm text-gray-400">
                  Simple email/social login
                </span>
              </div>
            </Button>

            <Button
              onClick={handleMetaMaskLogin}
              disabled={isLoading}
              variant="outline"
              className="p-4 h-auto"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">MetaMask / Web3 Wallet</span>
                <span className="text-sm text-gray-400">
                  Connect your existing wallet
                </span>
              </div>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
