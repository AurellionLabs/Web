import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { toast } from 'sonner';
import { SUPPORTED_CHAINS } from '@/config/network';
import { PrivyClientConfig, usePrivy, useWallets } from '@privy-io/react-auth';
import { sepolia, base, baseSepolia, mainnet } from 'viem/chains';

let provider: BrowserProvider | null = null;
let signer: JsonRpcSigner | null = null;
let isInitializing = false;
let lastInitAttempt = 0;
const RETRY_INTERVAL = 2000; // 2 seconds
let walletAddress: string;
let initializationPromise: Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
}> | null = null;
const privyClientConfig: PrivyClientConfig = {
  appearance: {
    theme: 'light',
    accentColor: '#676FFF',
    logo: 'https://picsum.photos/200/300',
  },

  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
};
export const privyConfig = {
  appId: process.env.PRIVY_APP_ID,
  clientId: process.env.PRIVY_CLIENT_ID,
  config: privyClientConfig,
  defaultChain: sepolia,
  supportedChains: [base, baseSepolia, mainnet, sepolia],
};

// Create a hook to get the current wallet provider and signer
export function useEthersProvider() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  const getProvider = async () => {
    if (!authenticated || wallets.length === 0) {
      throw new Error('No wallet connected');
    }

    const embeddedWallet = wallets.find(
      (wallet) => wallet.walletClientType === 'privy',
    );

    if (embeddedWallet) {
      const ethereumProvider = await embeddedWallet.getEthereumProvider();
      // Convert to ethers BrowserProvider
      return new BrowserProvider(ethereumProvider);
    }

    throw new Error('No embedded wallet found');
  };

  const getSigner = async () => {
    const provider = await getProvider();
    return provider.getSigner();
  };

  return { getProvider, getSigner };
}

// Initialize provider and signer
export const initializeProvider = async () => {
  try {
    // This function should be called within a component that uses the useEthersProvider hook
    const { getProvider, getSigner } = useEthersProvider();
    provider = await getProvider();
    signer = await getSigner();

    if (signer) {
      walletAddress = await signer.getAddress();
    }

    return { provider, signer };
  } catch (error) {
    console.error('Failed to initialize provider:', error);
    throw error;
  }
};

// Get wallet address
export const getWalletAddress = () => {
  return walletAddress;
};

// Handle contract errors
export const handleContractError = (error: any, message: string) => {
  console.error(`Error in ${message}:`, error);
  toast.error(`Error: ${error.message || message}`);
  throw error;
};

// Export provider and signer
export { provider, signer };
