'use client';

import { useWallet } from '@/hooks/useWallet';

export default function ConnectButton() {
  const {
    connect: connectWallet,
    isConnected,
    isLoading,
    isReady,
  } = useWallet();

  const handleConnect = async () => {
    if (!isReady || isConnected) {
      return;
    }

    try {
      await connectWallet();
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const buttonText =
    !isReady || isLoading
      ? 'Loading...'
      : isConnected
        ? 'Connected'
        : 'Connect Wallet';
  const isDisabled = !isReady || isLoading;

  return (
    <button
      onClick={handleConnect}
      disabled={isDisabled}
      className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-500/50 bg-transparent text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 hover:text-amber-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {buttonText}
    </button>
  );
}
