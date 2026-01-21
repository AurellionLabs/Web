/**
 * Diamond Context - Provides access to the Diamond contract and its facets
 *
 * This replaces the legacy RepositoryContext for Diamond-based operations.
 * All node, asset, order operations go through the single Diamond proxy.
 */

import { ethers, Contract, Signer, Provider, BrowserProvider } from 'ethers';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '@/chain-constants';

// Re-export for convenience
export { NEXT_PUBLIC_DIAMOND_ADDRESS };
// Use auto-generated ABI from deploy script - automatically updated on deployment
import { DIAMOND_ABI } from '@/infrastructure/contracts/diamond-abi.generated';
// Use AuraAsset ABI from indexer - it has the full ABI including nodeMint
import { AuraAssetABI } from '@/indexer/abis/generated/AuraAsset';

export class DiamondContext {
  private signer: Signer | null = null;
  private provider: Provider | null = null;
  private diamond: Contract | null = null;
  private auraAsset: Contract | null = null;
  private initialized = false;

  /**
   * Initialize the context with a wallet provider
   */
  async initialize(walletProvider: BrowserProvider): Promise<void> {
    this.provider = walletProvider;
    this.signer = await walletProvider.getSigner();

    // Connect to Diamond proxy - all facet functions are called through this
    this.diamond = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      DIAMOND_ABI,
      this.signer,
    );

    // Connect to AuraAsset for ERC1155 operations
    this.auraAsset = new ethers.Contract(
      NEXT_PUBLIC_AURA_ASSET_ADDRESS,
      AuraAssetABI,
      this.signer,
    );

    this.initialized = true;
    console.log(
      '[DiamondContext] Initialized with Diamond:',
      NEXT_PUBLIC_DIAMOND_ADDRESS,
    );
  }

  /**
   * Check if context is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the Diamond contract instance
   * All facet functions are called through this single contract
   */
  getDiamond(): Contract {
    if (!this.diamond) {
      throw new Error(
        'DiamondContext not initialized. Call initialize() first.',
      );
    }
    return this.diamond;
  }

  /**
   * Get the AuraAsset contract for ERC1155 operations
   */
  getAuraAsset(): Contract {
    if (!this.auraAsset) {
      throw new Error(
        'DiamondContext not initialized. Call initialize() first.',
      );
    }
    return this.auraAsset;
  }

  /**
   * Get the current signer
   */
  getSigner(): Signer {
    if (!this.signer) {
      throw new Error(
        'DiamondContext not initialized. Call initialize() first.',
      );
    }
    return this.signer;
  }

  /**
   * Get the provider
   */
  getProvider(): Provider {
    if (!this.provider) {
      throw new Error(
        'DiamondContext not initialized. Call initialize() first.',
      );
    }
    return this.provider;
  }

  /**
   * Get the current signer address
   */
  async getSignerAddress(): Promise<string> {
    const signer = this.getSigner();
    return await signer.getAddress();
  }

  /**
   * Get the Diamond contract address
   * Used for minting operations where Diamond is the recipient
   */
  getDiamondAddress(): string {
    return NEXT_PUBLIC_DIAMOND_ADDRESS;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.signer = null;
    this.provider = null;
    this.diamond = null;
    this.auraAsset = null;
    this.initialized = false;
  }
}

// Singleton instance
let diamondContextInstance: DiamondContext | null = null;

export function getDiamondContext(): DiamondContext {
  if (!diamondContextInstance) {
    diamondContextInstance = new DiamondContext();
  }
  return diamondContextInstance;
}
