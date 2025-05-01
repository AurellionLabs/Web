'use client'; // This marks it as a Client Component

import { colors } from '@/lib/constants/colors';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePrivy } from '@privy-io/react-auth';

export default function ConnectButton() {
  const [connectedText, setConnectedText] = useState('Connect');
  const { connected, setIsWalletConnected } = useMainProvider();
  const { ready } = usePrivy();

  useEffect(() => {
    if (ready && connected) {
      setConnectedText('Connected');
    }
  }, [ready, connected]);

  const handleConnect = async () => {
    if (!ready) {
      console.log('Privy is not ready yet');
      return;
    }

    try {
      const response = await setWalletProvider();
      if (response.success) {
        console.log('Connected with address:', response.address);
        setIsWalletConnected(true);
        setConnectedText('Connected');
      } else {
        console.error('Connection failed:', response.error);
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  if (!ready) {
    return (
      <Button variant={'default'} className="px-4 py-2" disabled>
        Loading...
      </Button>
    );
  }

  return (
    <Button variant={'default'} onClick={handleConnect} className="px-4 py-2">
      {connectedText}
    </Button>
  );
}
