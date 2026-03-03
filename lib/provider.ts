import { ethers, BrowserProvider, JsonRpcProvider, Provider } from 'ethers';
import { NEXT_PUBLIC_RPC_URL_84532 } from '../chain-constants';

/**
 * Get a read-only JSON RPC provider for blockchain queries.
 * Uses the Base Mainnet RPC URL by default.
 * 
 * @param rpcUrl Optional custom RPC URL override
 * @returns JsonRpcProvider instance
 */
export function getReadOnlyProvider(rpcUrl?: string): JsonRpcProvider {
  const url = rpcUrl || NEXT_PUBLIC_RPC_URL_84532;
  if (!url) {
    throw new Error('No RPC URL available. Set NEXT_PUBLIC_RPC_URL_84532 or pass a custom URL.');
  }
  return new JsonRpcProvider(url);
}

/**
 * Get a browser provider from the user's wallet (MetaMask, etc.)
 * Returns null if no wallet is installed.
 * 
 * @returns BrowserProvider instance or null if no wallet
 */
export async function getBrowserProvider(): Promise<BrowserProvider | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }
  return new BrowserProvider(window.ethereum as any);
}

/**
 * Get an appropriate provider based on wallet availability.
 * If user has a connected wallet (window.ethereum), returns BrowserProvider.
 * Otherwise falls back to read-only JsonRpcProvider.
 * 
 * @param rpcUrl Optional custom RPC URL for fallback
 * @returns Provider instance
 */
export async function getProvider(rpcUrl?: string): Promise<Provider> {
  const browserProvider = await getBrowserProvider();
  if (browserProvider) {
    return browserProvider;
  }
  return getReadOnlyProvider(rpcUrl);
}

/**
 * Get a signer from the browser provider.
 * Throws if no wallet is connected.
 * 
 * @returns Signer instance
 */
export async function getSigner(): Promise<ethers.Signer> {
  const browserProvider = await getBrowserProvider();
  if (!browserProvider) {
    throw new Error('No wallet detected. Please connect your wallet.');
  }
  return browserProvider.getSigner();
}
