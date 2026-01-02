'use client';

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
    <button
      onClick={handleConnect}
      disabled={isDisabled}
      className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-500/50 bg-transparent text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 hover:text-amber-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {buttonText}
    </button>
  );
}
