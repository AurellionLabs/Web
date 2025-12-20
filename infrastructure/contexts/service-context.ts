import { INodeAssetService } from '@/domain/node/node';
import {
  INodeService,
  NodeService,
} from '@/infrastructure/services/node.service';
import { IOrderService } from '@/domain/orders/order';
import { NodeAssetService } from '../services/node-asset.service';
import { RepositoryContext } from './repository-context';
import { OrderService } from '@/infrastructure/services/order-service';
import { IPoolService } from '@/domain/pool';
import { PoolService } from '../services/pool.service';

/**
 * Context that manages all services and their dependencies - UPDATED
 */
export class ServiceContext {
  private static instance: ServiceContext;
  private nodeAssetService: INodeAssetService | null = null;
  private repositoryContext: RepositoryContext | null = null;
  private orderService: IOrderService | null = null;
  private nodeService: INodeService | null = null;
  private poolService: IPoolService | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of ServiceContext
   */
  public static getInstance(): ServiceContext {
    if (!ServiceContext.instance) {
      ServiceContext.instance = new ServiceContext();
    }
    return ServiceContext.instance;
  }

  /**
   * Initialize the context with repository context
   */
  public initialize(repositoryContext: RepositoryContext) {
    this.repositoryContext = repositoryContext;

    // Create services with updated implementations
    this.nodeAssetService = new NodeAssetService(repositoryContext);
    this.nodeService = new NodeService(repositoryContext);
    // Wire OrderService using Ausys contract + signer from RepositoryContext
    try {
      const ausys = repositoryContext.getAusysContract();
      const signer = repositoryContext.getSigner();
      this.orderService = new OrderService(ausys as any, signer as any);
    } catch (e) {
      console.warn(
        '[ServiceContext] Unable to initialize OrderService yet:',
        e,
      );
      this.orderService = null;
    }

    // Wire PoolService using provider + signer from RepositoryContext
    try {
      const signer = repositoryContext.getSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error('Provider not available from signer');
      }
      this.poolService = new PoolService(provider, signer, repositoryContext);
    } catch (e) {
      console.warn('[ServiceContext] Unable to initialize PoolService yet:', e);
      this.poolService = null;
    }

    console.log('[ServiceContext] Successfully created refactored services');
  }

  /**
   * Get the node asset service instance
   */
  public getNodeAssetService(): INodeAssetService {
    if (!this.nodeAssetService) {
      throw new Error(
        'NodeAssetService not initialized. Call initialize() first.',
      );
    }
    return this.nodeAssetService;
  }

  /**
   * Get the order service instance
   */
  public getOrderService(): IOrderService {
    if (!this.orderService) {
      throw new Error(
        'OrderService not initialized. Ensure RepositoryContext is initialized before ServiceContext.',
      );
    }
    return this.orderService;
  }

  /**
   * Get the node service instance
   */
  public getNodeService(): INodeService {
    if (!this.nodeService) {
      throw new Error(
        'NodeService not initialized. Ensure RepositoryContext is initialized before ServiceContext.',
      );
    }
    return this.nodeService;
  }

  /**
   * Get the pool service instance
   */
  public getPoolService(): IPoolService {
    if (!this.poolService) {
      throw new Error(
        'PoolService not initialized. Ensure RepositoryContext is initialized before ServiceContext.',
      );
    }
    return this.poolService;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.nodeAssetService = null;
    this.repositoryContext = null;
    this.orderService = null;
    this.nodeService = null;
    this.poolService = null;
  }
}
