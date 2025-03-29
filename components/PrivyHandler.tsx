'use client';

import { useLogin, usePrivy, useSendTransaction } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { LoadingSpinner } from './ui/loading-spinner';
import { useMainProvider } from '@/app/providers/main.provider';
import { WalletSelector } from './WalletSelector';

interface PrivyHandlerProps {
  children: React.ReactNode;
}

export const PrivyHandler: React.FC<PrivyHandlerProps> = ({ children }) => {
  const { login } = useLogin();
  const { ready, authenticated, user } = usePrivy();
  const { setIsWalletConnected, isWalletConnected } = useMainProvider();

  const { sendTransaction } = useSendTransaction({
    onSuccess: ({ hash }) => {
      console.log('transaction sent:', hash);
    },
    onError: (error) => {
      console.error('transaction error:', error);
    },
  });

  // Update wallet connection status when Privy auth changes
  useEffect(() => {
    if (authenticated && user) {
      setIsWalletConnected(true);
    } else {
      setIsWalletConnected(false);
    }
  }, [authenticated, user, setIsWalletConnected]);

  if (!ready) {
    return <LoadingSpinner txt="Loading wallet options..." />;
  }

  // Check both Privy authentication AND app wallet connection
  if (authenticated || isWalletConnected) {
    return <>{children}</>;
  }

  // Show wallet selector if neither authentication method is active
  return <WalletSelector />;
};
