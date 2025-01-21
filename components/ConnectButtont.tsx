'use client'; // This marks it as a Client Component

import { colors } from '@/lib/constants/colors';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';
import { useState } from 'react';

export default function ConnectButton() {
 const [connected, setConnected] = useState("Connect")
  const handleConnect = async () => {
    try {
      const response = await setWalletProvider();
      if (response.success) {
        console.log("Connected with address:", response.address);
        setConnected("Connected")
      } else {
        console.error("Connection failed:", response.error);
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  return (
    <button 
      onClick={handleConnect} 
      className={`bg-[${colors.primary[500]}] hover:bg-[${colors.primary[600]}] text-white px-4 py-2 rounded-2xl`}
    >
    {connected} 
    </button>
  );
}
