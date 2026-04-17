import { BrowserProvider, JsonRpcSigner } from 'ethers';

let provider: BrowserProvider | null = null;
let signer: JsonRpcSigner | null = null;
let walletAddress = '';

export const setProvider = (newProvider: BrowserProvider | null) => {
  provider = newProvider;
};

export const setSigner = (newSigner: JsonRpcSigner | null) => {
  signer = newSigner;
};

export const setWalletAddress = (address: string) => {
  walletAddress = address;
};

export const getProvider = () => provider;
export const getSigner = () => signer;
export const getWalletAddress = () => walletAddress;

export const getCurrentWalletAddress = async (): Promise<string> => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  return signer.getAddress();
};

export interface ContractError extends Error {
  code?: string;
  reason?: string;
  transaction?: unknown;
}

export const handleContractError = (error: unknown, context: string): never => {
  const contractError = error as ContractError;
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
