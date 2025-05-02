import { INodeAssetService } from '@/domain/node/node';
import { NodeAssetService } from '@/infrastructure/services/node-asset.service';
import { RepositoryContext } from './repository-context';

/**
 * Context responsible for initializing and providing access to application services.
 */
export class ServiceContext {
  private static instance: ServiceContext;
  private repositoryContext: RepositoryContext;

  // Service instances
  private nodeAssetService: INodeAssetService | null = null;
  // Add other service instances here as needed
  // private orderService: OrderService | null = null;

  private isInitialized = false;

  // Private constructor for singleton pattern
  private constructor(repositoryContext: RepositoryContext) {
    if (!repositoryContext) {
      throw new Error(
        'RepositoryContext is required to initialize ServiceContext.',
      );
    }
    this.repositoryContext = repositoryContext;
  }

  /**
   * Get the singleton instance of ServiceContext.
   * Requires RepositoryContext instance to be passed on first call.
   */
  public static getInstance(
    repositoryContext?: RepositoryContext,
  ): ServiceContext {
    if (!ServiceContext.instance) {
      if (!repositoryContext) {
        throw new Error(
          'RepositoryContext instance must be provided when calling getInstance for the first time.',
        );
      }
      ServiceContext.instance = new ServiceContext(repositoryContext);
    }
    return ServiceContext.instance;
  }

  /**
   * Initialize all application services.
   * Should be called once after RepositoryContext is initialized.
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('[ServiceContext] Already initialized.');
      return;
    }

    // Initialize services, passing required dependencies from RepositoryContext
    try {
      this.nodeAssetService = new NodeAssetService(this.repositoryContext);
      // Initialize other services here...
      // this.orderService = new ConcreteOrderService(this.repositoryContext.getOrderRepository());

      this.isInitialized = true;
      console.log('[ServiceContext] Initialized successfully.');
    } catch (error) {
      console.error('[ServiceContext] Initialization failed:', error);
      this.isInitialized = false;
      // Optionally re-throw or handle specific initialization errors
      throw new Error('ServiceContext initialization failed.');
    }
  }

  /**
   * Get the Node Asset service instance.
   */
  public getNodeAssetService(): INodeAssetService {
    if (!this.isInitialized || !this.nodeAssetService) {
      throw new Error(
        'ServiceContext not initialized or NodeAssetService failed to initialize.',
      );
    }
    return this.nodeAssetService;
  }

  // Add getters for other services here...
  // public getOrderService(): OrderService { ... }
}
