/**
 * Diamond Context - Provides access to the Diamond contract and its facets
 *
 * Singleton Diamond context for contract, signer, and provider access.
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
  private chainId: number = 0;

  /**
   * Initialize the context with a wallet provider
   */
  async initialize(
    walletProvider: BrowserProvider,
    prebuiltSigner?: ethers.Signer,
    chainId?: number,
  ): Promise<void> {
    this.provider = walletProvider;
    // Accept a pre-built signer (e.g. from E2EServerSigner) to avoid calling
    // walletProvider.getSigner() which hangs on JsonRpcProvider (public node).
    this.signer = prebuiltSigner ?? (await walletProvider.getSigner());

    // Get chainId from parameter or from provider
    if (chainId !== undefined) {
      this.chainId = chainId;
    } else {
      const network = await walletProvider.getNetwork();
      this.chainId = Number(network.chainId);
    }

    // Connect to Diamond proxy - all facet functions are called through this
    this.diamond = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      DIAMOND_ABI,
      this.signer,
    );

    this.initialized = true;
    this.readOnly = false;
  }

  /**
   * Initialize with a pre-built signer + JsonRpcProvider (e.g. E2E test wallet).
   * Avoids requiring a BrowserProvider when one is not available.
   */
  async initializeWithSigner(
    signer: ethers.Signer,
    provider: ethers.JsonRpcProvider,
  ): Promise<void> {
    this.provider = provider;
    this.signer = signer;

    const network = await provider.getNetwork();
    this.chainId = Number(network.chainId);

    this.diamond = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      DIAMOND_ABI,
      this.signer,
    );

    this.initialized = true;
    this.readOnly = false;
  }

  /**
   * Initialize the context in read-only mode using a public RPC provider
   * This allows reading data without a connected wallet
   */
  async initializeReadOnly(rpcUrl: string, chainId: number): Promise<void> {
    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
      staticNetwork: true,
    });
    await provider.getBlockNumber();
    this.provider = provider;

    // Connect to Diamond proxy in read-only mode (no signer)
    this.diamond = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      DIAMOND_ABI,
      this.provider,
    );

    this.initialized = true;
    this.readOnly = true;
    this.chainId = chainId;
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
   * Get the current chain ID
   */
  getChainId(): number {
    if (!this.initialized) {
      throw new Error(
        'DiamondContext not initialized. Call initialize() first.',
      );
    }
    return this.chainId;
  }

  /**
   * Get the signer's address
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
