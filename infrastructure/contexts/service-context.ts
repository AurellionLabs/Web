import { IOrderService } from '@/domain/orders/order';
import { RepositoryContext } from './repository-context';
import { OrderService } from '@/infrastructure/services/order-service';
import { IPoolService } from '@/domain/pool';
import { PoolService } from '../services/pool.service';

/**
 * Context that manages services - Node operations now handled by DiamondProvider
 * This context only manages Order and Pool services
 */
export class ServiceContext {
  private static instance: ServiceContext;
  private repositoryContext: RepositoryContext | null = null;
  private orderService: IOrderService | null = null;
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
   * Note: Node operations are handled by DiamondProvider, not ServiceContext
   */
  public initialize(repositoryContext: RepositoryContext) {
    this.repositoryContext = repositoryContext;

    // Wire OrderService using Ausys contract + signer from RepositoryContext
    try {
      const ausys = repositoryContext.getAusysContract();
      const signer = repositoryContext.getSigner();
      this.orderService = new OrderService(ausys as unknown as ConstructorParameters<typeof OrderService>[0], signer as unknown as ConstructorParameters<typeof OrderService>[1]);
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
    this.repositoryContext = null;
    this.orderService = null;
    this.poolService = null;
  }
}
