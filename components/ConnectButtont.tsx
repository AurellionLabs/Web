'use client'; // This marks it as a Client Component

import { colors } from '@/lib/constants/colors';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';

export default function ConnectButton() {
  const handleConnect = async () => {
    try {
      const response = await setWalletProvider();
      if (response.success) {
        console.log("Connected with address:", response.address);
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
      Connect
    </button>
  );
}
