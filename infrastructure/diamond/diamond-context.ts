/**
 * Diamond Context - Provides access to the Diamond contract and its facets
 *
 * This replaces the legacy RepositoryContext for Diamond-based operations.
 * All node, asset, order operations go through the single Diamond proxy.
 */

import { ethers, Contract, Signer, Provider, BrowserProvider } from 'ethers';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';

// Re-export for convenience
export { NEXT_PUBLIC_DIAMOND_ADDRESS };
// Use auto-generated ABI from deploy script - automatically updated on deployment
import { DIAMOND_ABI } from '@/infrastructure/contracts/diamond-abi.generated';

export class DiamondContext {
  private signer: Signer | null = null;
  private provider: Provider | null = null;
  private diamond: Contract | null = null;
  private initialized = false;
  private readOnly = false;

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

    this.initialized = true;
    this.readOnly = false;
    console.log(
      '[DiamondContext] Initialized with Diamond:',
      NEXT_PUBLIC_DIAMOND_ADDRESS,
    );
  }

  /**
   * Initialize the context in read-only mode using a public RPC provider
   * This allows reading data without a connected wallet
   */
  async initializeReadOnly(rpcUrl: string): Promise<void> {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Connect to Diamond proxy in read-only mode (no signer)
    this.diamond = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      DIAMOND_ABI,
      this.provider,
    );

    this.initialized = true;
    this.readOnly = true;
    console.log(
      '[DiamondContext] Initialized in READ-ONLY mode with Diamond:',
      NEXT_PUBLIC_DIAMOND_ADDRESS,
    );
  }

  /**
   * Check if context is in read-only mode
   */
  isReadOnly(): boolean {
    return this.readOnly;
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
