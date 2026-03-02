import { ethers, JsonRpcProvider } from 'ethers';
import { NETWORK_CONFIGS } from '@/config/network';

/**
 * Factory for creating read-only RPC providers using dedicated endpoints.
 * This helps avoid rate limiting by using your own RPC endpoints for data queries.
 */
export class RpcProviderFactory {
  private static readOnlyProviders: Map<number, JsonRpcProvider> = new Map();

  /**
   * Get a read-only provider for the specified chain using dedicated RPC endpoints.
   * This provider should be used for all data queries to avoid user rate limiting.
   */
  static getReadOnlyProvider(chainId: number): JsonRpcProvider {
    if (!this.readOnlyProviders.has(chainId)) {
      const networkConfig = NETWORK_CONFIGS[chainId];

      if (!networkConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Create a dedicated RPC provider using your own endpoints
      const provider = new JsonRpcProvider(networkConfig.rpcUrl);
      this.readOnlyProviders.set(chainId, provider);
    }

    return this.readOnlyProviders.get(chainId)!;
  }

  /**
   * Get the current chain ID from a user's provider.
   * This is used to determine which read-only provider to use.
   */
  static async getChainId(userProvider: ethers.Provider): Promise<number> {
    const network = await userProvider.getNetwork();
    return Number(network.chainId);
  }

  /**
   * Clear cached providers (useful for testing or if RPC endpoints change).
   */
  static clearCache(): void {
    this.readOnlyProviders.clear();
  }
}
