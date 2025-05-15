import { INodeAssetService } from '@/domain/node/node';
import { NodeAssetService } from '@/infrastructure/services/node-asset.service';
import { IDriverService } from '@/domain/driver/driver';
import { DriverService } from '@/infrastructure/services/driver.service';
import { RepositoryContext } from './repository-context';
import { IOrderService } from '@/domain/orders/order';
import { OrderService } from '../services/order-service';
import { IAuStakeService } from '@/domain/austake';
import { AuStakeService } from '../services/austake.service';

/**
 * Context responsible for initializing and providing access to application services.
 */
export class ServiceContext {
  private static instance: ServiceContext;
  private repositoryContext: RepositoryContext;

  // Service instances
  private nodeAssetService: INodeAssetService | null = null;
  private driverService: IDriverService | null = null;
  private orderService: IOrderService | null = null;
  private auStakeService: IAuStakeService | null = null;

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
      this.driverService = new DriverService(this.repositoryContext);
      // Initialize OrderService using dependencies from RepositoryContext
      this.orderService = new OrderService(
        this.repositoryContext.getAusysContract(),
        this.repositoryContext.getSigner(),
      );
      // Initialize AuStakeService with its repository dependency
      //  this.auStakeService = new AuStakeService(
      //    this.repositoryContext.getAuStakeRepository(), // Get IAuStakeRepository from RepositoryContext
      //    this.repositoryContext, // Pass the full RepositoryContext
      //  );

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

  /**
   * Get the Driver service instance.
   */
  public getDriverService(): IDriverService {
    if (!this.isInitialized || !this.driverService) {
      throw new Error(
        'ServiceContext not initialized or DriverService failed to initialize.',
      );
    }
    return this.driverService;
  }

  /**
   * Get the Order service instance.
   */
  public getOrderService(): IOrderService {
    if (!this.isInitialized || !this.orderService) {
      throw new Error(
        'ServiceContext not initialized or OrderService failed to initialize.',
      );
    }
    return this.orderService;
  }

  /**
   * Get the AuStake service instance.
   */
  public getAuStakeService(): IAuStakeService {
    if (!this.isInitialized || !this.auStakeService) {
      throw new Error(
        'ServiceContext not initialized or AuStakeService failed to initialize.',
      );
    }
    return this.auStakeService;
  }
}
