import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { toast } from 'sonner';
import { SUPPORTED_CHAINS } from '@/config/network';

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

export const setProvider = (newProvider: BrowserProvider | null) => {
  provider = newProvider;
};
export const setSigner = (newSigner: JsonRpcSigner | null) => {
  signer = newSigner;
};
export const setWalletAddress = (address: string) => {
  walletAddress = address;
};

// Export getters
export const getProvider = () => provider;
export const getSigner = () => signer;
export const getWalletAddress = () => walletAddress;

export const initializeProvider = async (): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
}> => {
  if (initializationPromise) {
    const result = await initializationPromise;
    if (!result) throw new Error('Initialization failed');
    return result;
  }

  initializationPromise = (async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      provider = new BrowserProvider(window.ethereum);
      signer = await provider.getSigner();

      if (!provider || !signer) throw new Error('Failed to initialize wallet');
      return { provider, signer };
    } finally {
      initializationPromise = null;
    }
  })();

  const result = await initializationPromise;
  if (!result) throw new Error('Initialization failed');
  return result;
};

// Common error handling
export interface ContractError extends Error {
  code?: string;
  reason?: string;
  transaction?: any;
}

export const handleContractError = (error: any, context: string): never => {
  const contractError: ContractError = error;
  console.error(`Error in ${context}:`, {
    message: contractError.message,
    code: contractError.code,
    reason: contractError.reason,
    transaction: contractError.transaction,
  });

  if (contractError.code === 'ACTION_REJECTED') {
    throw new Error('Transaction was rejected by user');
  }

  if (contractError.reason) {
    throw new Error(contractError.reason);
  }

  throw new Error(`Failed to ${context}: ${contractError.message}`);
};

// Instead, add a function to get the current wallet address
export const getCurrentWalletAddress = async (): Promise<string> => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  return await signer.getAddress();
};

// Export as aliases for backward compatibility
export { provider as ethersProvider, signer };
