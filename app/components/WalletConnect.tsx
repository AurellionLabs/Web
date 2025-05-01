import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Button } from './ui/button';

export function WalletConnect() {
  const { login, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <Button
        onClick={login}
        className="bg-primary text-white hover:bg-primary/90"
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wallets.map((wallet) => (
        <div key={wallet.address} className="text-sm">
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </div>
      ))}
    </div>
  );
}
