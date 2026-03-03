import { NodeRepository } from '@/domain/node/node';
import { DiamondNodeRepository } from '../diamond/diamond-node-repository';
import { OrderRepository } from '../repositories/orders-repository';
import { IOrderRepository } from '@/domain/orders/order';
import type { Ausys } from '@/lib/contracts';
import type { Ausys as LocationContract } from '@/lib/contracts';
import { BrowserProvider, ethers } from 'ethers';
import { DriverRepository } from '../repositories/driver-repository';
import { IDriverRepository } from '@/domain/driver/driver';
import {
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL,
  NEXT_PUBLIC_INDEXER_URL,
} from '@/chain-constants';
import { listenForSignature } from '../services/signature-listener.service';
import { IPoolRepository } from '@/domain/pool';
import { PoolRepository } from '../repositories/pool-repository';
import { IPlatformRepository } from '@/domain/platform';
import { PlatformRepository } from '../repositories/platform-repository';
import { PinataSDK } from 'pinata';
import { DiamondContext } from '../diamond/diamond-context';

/**
 * Context that manages all repositories using Diamond infrastructure
 */
export class RepositoryContext {
  private static instance: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private orderRepository: IOrderRepository | null = null;
  private driverRepository: IDriverRepository | null = null;
  private poolRepository: IPoolRepository | null = null;
  private platformRepository: IPlatformRepository | null = null;
  private diamondContext: DiamondContext | null = null;
  private ausysContract: Ausys | null = null;
  private signer: ethers.Signer | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of RepositoryContext
   */
  public static getInstance(): RepositoryContext {
    if (!RepositoryContext.instance) {
      RepositoryContext.instance = new RepositoryContext();
    }
    return RepositoryContext.instance;
  }

  /**
   * Initialize the context with Diamond infrastructure
   */
  public async initialize(
    ausysContract: Ausys,
    provider: BrowserProvider,
    signer: ethers.Signer,
    pinata: PinataSDK,
  ) {
    this.ausysContract = ausysContract;
    this.signer = signer;

    try {
      // Initialize Diamond context
      this.diamondContext = new DiamondContext();
      await this.diamondContext.initialize(provider, signer);

      // Create Diamond-based NodeRepository with Pinata for IPFS metadata
      this.nodeRepository = new DiamondNodeRepository(
        this.diamondContext,
        pinata,
      );

      // Create OrderRepository with GraphQL integration
      this.orderRepository = new OrderRepository(
        ausysContract,
        provider,
        signer,
      );

      // Create other repositories
      this.driverRepository = new DriverRepository(
        ausysContract,
        provider,
        signer,
      );

      this.poolRepository = new PoolRepository(provider, signer);

      this.platformRepository = new PlatformRepository(pinata);
    } catch (error) {
      console.error(
        '[RepositoryContext] Failed to create repositories:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get the node repository instance
   */
  public getNodeRepository(): NodeRepository {
    if (!this.nodeRepository) {
      throw new Error(
        'NodeRepository not initialized. Call initialize() first.',
      );
    }
    return this.nodeRepository;
  }

  /**
   * Get the order repository instance
   */
  public getOrderRepository(): IOrderRepository {
    if (!this.orderRepository) {
      throw new Error(
        'OrderRepository not initialized. Call initialize() first.',
      );
    }
    return this.orderRepository;
  }

  /**
   * Get the driver repository instance
   */
  public getDriverRepository(): IDriverRepository {
    if (!this.driverRepository) {
      throw new Error(
        'DriverRepository not initialized. Call initialize() first.',
      );
    }
    return this.driverRepository;
  }

  /**
   * Get the pool repository instance
   */
  public getPoolRepository(): IPoolRepository {
    if (!this.poolRepository) {
      throw new Error(
        'PoolRepository not initialized. Call initialize() first.',
      );
    }
    return this.poolRepository;
  }

  /**
   * Get the platform repository instance
   */
  public getPlatformRepository(): IPlatformRepository {
    if (!this.platformRepository) {
      throw new Error(
        'PlatformRepository not initialized. Call initialize() first.',
      );
    }
    return this.platformRepository;
  }

  /**
   * Get the Diamond context instance
   */
  public getDiamondContext(): DiamondContext {
    if (!this.diamondContext) {
      throw new Error(
        'DiamondContext not initialized. Call initialize() first.',
      );
    }
    return this.diamondContext;
  }

  /**
   * Get the Ausys contract instance
   */
  public getAusysContract(): Ausys {
    if (!this.ausysContract) {
      throw new Error(
        'AusysContract not initialized. Call initialize() first.',
      );
    }
    return this.ausysContract;
  }

  /**
   * Get the current signer
   */
  public getSigner(): ethers.Signer {
    if (!this.signer) {
      throw new Error('Signer not initialized. Call initialize() first.');
    }
    return this.signer;
  }

  /**
   * Update the signer and reconnect contracts that use it.
   * Called when the wallet address changes (e.g. role switch).
   */
  public async updateSigner(newSigner: ethers.Signer): Promise<void> {
    const newAddr = await newSigner.getAddress();
    const oldAddr = this.signer ? await this.signer.getAddress() : 'none';

    if (newAddr.toLowerCase() === oldAddr.toLowerCase()) {
      return; // No change
    }

    this.signer = newSigner;

    // Reconnect the ausys contract with the new signer
    if (this.ausysContract) {
      this.ausysContract = this.ausysContract.connect(newSigner) as Ausys;
    }
  }

  /**
   * Get the provider from the signer
   */
  public getProvider(): ethers.Provider {
    if (!this.signer?.provider) {
      throw new Error('Provider not available. Call initialize() first.');
    }
    return this.signer.provider;
  }

  /**
   * Get the signer's address
   */
  public async getSignerAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Call initialize() first.');
    }
    return this.signer.getAddress();
  }

  /**
   * Listen for signature events on a journey
   */
  public async listenForSignature(
    journeyId: string,
    expectedSigner: string,
    timeoutMs: number = 30000,
  ): Promise<boolean> {
    if (!this.ausysContract) {
      throw new Error(
        'AusysContract not initialized. Call initialize() first.',
      );
    }
    return listenForSignature(
      this.ausysContract as unknown as LocationContract,
      journeyId,
      timeoutMs,
    );
  }

  /**
   * Get subgraph endpoints
   */
  public getSubgraphEndpoints() {
    return {
      indexer: NEXT_PUBLIC_INDEXER_URL,
      ausys: NEXT_PUBLIC_AUSYS_SUBGRAPH_URL,
    };
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.nodeRepository = null;
    this.orderRepository = null;
    this.driverRepository = null;
    this.poolRepository = null;
    this.platformRepository = null;
    this.diamondContext = null;
    this.ausysContract = null;
    this.signer = null;
  }
}
