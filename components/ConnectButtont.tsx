'use client'; // This marks it as a Client Component

import { colors } from '@/lib/constants/colors';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';
import { useEffect, useState } from 'react';
import { useChainProvider } from '@/app/providers/main.provider';
import { Button } from './ui/button';

export default function ConnectButton() {
  const [connectedText, setConnectedText] = useState('Connect');
  const { connected, setConnected } = useChainProvider();
  useEffect(() => {
    try {
      handleConnect();
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, []);
  const handleConnect = async () => {
    try {
      const response = await setWalletProvider();
      if (response.success) {
        console.log('Connected with address:', response.address);
        setConnected(true);
        setConnectedText('Connected');
      } else {
        console.error('Connection failed:', response.error);
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <Button variant={"default"} 
      onClick={handleConnect}
      className={`px-4 py-2 `}
    >
      {connectedText}
    </Button>
  );
}
