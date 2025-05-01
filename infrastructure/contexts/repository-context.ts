import { NodeRepository } from '@/domain/node';
import { BlockchainNodeRepository } from '../repositories/node-repository';
import { AurumNodeManager, LocationContract } from '@/typechain-types';
import { BrowserProvider, ethers } from 'ethers';
import { OrderRepositoryInterface } from '@/domain/orders';
import { OrderRepository } from '../repositories/orders-repository';

/**
 * Context that manages all repositories and their dependencies
 */
export class RepositoryContext {
  private static instance: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private orderRepository: OrderRepository | null = null;
  private aurumContract: AurumNodeManager | null = null;
  private ausysContract: LocationContract | null = null;

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
   * Initialize the context with required contracts and signer
   */
  public initialize(
    ausysContract: LocationContract,
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
  ) {
    this.ausysContract = ausysContract;
    this.aurumContract = aurumContract;
    this.nodeRepository = new BlockchainNodeRepository(
      aurumContract,
      provider,
      signer,
    );
    this.orderRepository = new OrderRepository(ausysContract);
  }

  /**
   * Get the node repository instance
   */
  public getNodeRepository(): NodeRepository {
    if (!this.nodeRepository) {
      throw new Error(
        'RepositoryContext not initialized. Call initialize() first.',
      );
    }
    return this.nodeRepository;
  }

  public getOrderRepository(): OrderRepository {
    if (!this.nodeRepository) {
      throw new Error(
        'RepositoryContext not initialized. Call initialize() first.',
      );
    }
    return this.orderRepository;
  }

  /**
   * Get the Aurum contract instance
   */
  public getAurumContract(): AurumNodeManager {
    if (!this.aurumContract) {
      throw new Error(
        'RepositoryContext not initialized. Call initialize() first.',
      );
    }
    return this.aurumContract;
  }
}
