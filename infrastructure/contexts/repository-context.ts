import { NodeRepository } from '@/domain/node/node';
import { BlockchainNodeRepository } from '../repositories/node-repository';
import { OrderRepository } from '../repositories/orders-repository';
import { IOrderRepository } from '@/domain/orders/order';
import { AurumNodeManager } from '@/typechain-types/contracts/Aurum.sol/AurumNodeManager';
import { AuraAsset } from '@/typechain-types/contracts/AuraAsset.sol/AuraAsset';
import { Ausys } from '@/typechain-types/contracts/AuSys.sol/Ausys';
import { BrowserProvider, ethers } from 'ethers';
import { INodeAssetService } from '@/domain/node/node';
import { DriverRepository } from '../repositories/driver-repository';
import { IDriverRepository } from '@/domain/driver/driver';
import {
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
  NEXT_PUBLIC_AURUM_SUBGRAPH_URL,
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL,
} from '@/chain-constants';
import { listenForSignature } from '../services/signature-listener.service';
import { IPoolRepository } from '@/domain/pool';
import { PoolRepository } from '../repositories/pool-repository';
import { RepositoryFactory } from '../factories/repository-factory';
import { IPlatformRepository } from '@/domain/platform';
import { PlatformRepository } from '../repositories/platform-repository';
import { PinataSDK } from 'pinata';
import { AurumNode, AurumNode__factory } from '@/typechain-types';

/**
 * Context that manages all repositories and their dependencies - UPDATED for refactored contracts
 */
export class RepositoryContext {
  private static instance: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private orderRepository: IOrderRepository | null = null;
  private driverRepository: IDriverRepository | null = null;
  private poolRepository: IPoolRepository | null = null;
  private platformRepository: IPlatformRepository | null = null;
  private aurumContract: AurumNodeManager | null = null;
  private ausysContract: Ausys | null = null;
  private signer: ethers.Signer | null = null;
  private auraGoatContract: AuraAsset | null = null;

  private constructor(
    private readonly auraGoatAddress: string = NEXT_PUBLIC_AURA_GOAT_ADDRESS,
  ) {}

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
   * Initialize the context with required contracts and signer - UPDATED
   */
  public async initialize(
    auraAssetContract: AuraAsset,
    ausysContract: Ausys,
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
    pinata: PinataSDK,
  ) {
    this.ausysContract = ausysContract;
    this.aurumContract = aurumContract;
    this.signer = signer;
    this.auraGoatContract = auraAssetContract;

    try {
      console.log('[RepositoryContext] Creating repositories with refactored implementations...');

      // Create NodeRepository with updated implementation
      this.nodeRepository = new BlockchainNodeRepository(
        aurumContract,
        provider,
        signer,
        this.auraGoatAddress,
        pinata,
      );

      // Create OrderRepository with GraphQL integration
      this.orderRepository = new OrderRepository(
        ausysContract,
        provider,
        signer,
      );

      // Create other repositories (these may need updates too)
      this.driverRepository = new DriverRepository(
        ausysContract,
        provider,
        signer,
      );

      this.poolRepository = new PoolRepository(provider, signer);

      this.platformRepository = new PlatformRepository(
        auraAssetContract,
        pinata,
      );

      console.log('[RepositoryContext] Successfully created refactored repositories');
    } catch (error) {
      console.error('[RepositoryContext] Failed to create repositories:', error);
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
   * Get the Aurum contract instance
   */
  public getAurumContract(): AurumNodeManager {
    if (!this.aurumContract) {
      throw new Error('AurumContract not initialized. Call initialize() first.');
    }
    return this.aurumContract;
  }

  /**
   * Get the Ausys contract instance
   */
  public getAusysContract(): Ausys {
    if (!this.ausysContract) {
      throw new Error('AusysContract not initialized. Call initialize() first.');
    }
    return this.ausysContract;
  }

  /**
   * Get a specific AurumNode contract instance
   */
  public getAurumNodeContract(nodeAddress: string): AurumNode {
    if (!this.signer) {
      throw new Error('Signer not initialized. Call initialize() first.');
    }
    return AurumNode__factory.connect(nodeAddress, this.signer);
  }

  /**
   * Get the AuraGoat contract instance
   */
  public getAuraGoatContract(): AuraAsset {
    if (!this.auraGoatContract) {
      throw new Error('AuraGoatContract not initialized. Call initialize() first.');
    }
    return this.auraGoatContract;
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
   * Listen for signature events on a journey
   */
  public async listenForSignature(
    journeyId: string,
    expectedSigner: string,
    timeoutMs: number = 30000,
  ): Promise<boolean> {
    if (!this.ausysContract) {
      throw new Error('AusysContract not initialized. Call initialize() first.');
    }
    return listenForSignature(
      this.ausysContract,
      journeyId,
      timeoutMs,
    );
  }

  /**
   * Get subgraph endpoints
   */
  public getSubgraphEndpoints() {
    return {
      aurum: NEXT_PUBLIC_AURUM_SUBGRAPH_URL,
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
    this.aurumContract = null;
    this.ausysContract = null;
    this.signer = null;
    this.auraGoatContract = null;
  }
}


