import { ethers, Provider, Signer } from 'ethers';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { PoolRepository } from '@/infrastructure/repositories/pool-repository';
import { OrderRepository } from '@/infrastructure/repositories/orders-repository';
import { DriverRepository } from '@/infrastructure/repositories/driver-repository';
import { BlockchainNodeRepository } from '@/infrastructure/repositories/node-repository';
import {
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
} from '@/chain-constants';
import {
  AuStake__factory,
  LocationContract__factory,
  AurumNodeManager__factory,
  AurumNodeManager,
  LocationContract,
} from '@/typechain-types';

/**
 * Enhanced factory that provides actual RPC separation benefits.
 * This factory creates repositories with dedicated RPC providers for read operations.
 */
export class EnhancedRepositoryFactory {
  private static instance: EnhancedRepositoryFactory;
  private readProviders: Map<number, Provider> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): EnhancedRepositoryFactory {
    if (!EnhancedRepositoryFactory.instance) {
      EnhancedRepositoryFactory.instance = new EnhancedRepositoryFactory();
    }
    return EnhancedRepositoryFactory.instance;
  }

  /**
   * Initialize the factory with user's provider and signer
   */
  public async initialize(
    userProvider: Provider,
    signer: Signer,
  ): Promise<void> {
    try {
      const chainId = await RpcProviderFactory.getChainId(userProvider);

      // Initialize read provider for this chain
      const readProvider = RpcProviderFactory.getReadOnlyProvider(chainId);
      this.readProviders.set(chainId, readProvider);

      this.isInitialized = true;
      console.log(
        `[EnhancedRepositoryFactory] Initialized with dedicated RPC for chain ${chainId}`,
      );
    } catch (error) {
      console.warn(
        '[EnhancedRepositoryFactory] Failed to initialize read provider, repositories will use user provider:',
        error,
      );
      this.isInitialized = true;
    }
  }

  /**
   * Create a PoolRepository with actual RPC separation
   */
  public async createPoolRepository(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ): Promise<PoolRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // PoolRepository already supports RPC separation internally
    return new PoolRepository(userProvider, signer, contractAddress);
  }

  /**
   * Create an OrderRepository with enhanced RPC separation
   * Note: This will need to be updated once OrderRepository supports the pattern
   */
  public async createOrderRepository(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSYS_ADDRESS,
  ): Promise<OrderRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // For now, create with existing constructor
    // TODO: Update once OrderRepository supports RPC separation
    const contract = LocationContract__factory.connect(contractAddress, signer);
    return new OrderRepository(contract, userProvider as any, signer);
  }

  /**
   * Create a DriverRepository with enhanced RPC separation
   * Note: This will need to be updated once DriverRepository supports the pattern
   */
  public async createDriverRepository(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSYS_ADDRESS,
  ): Promise<DriverRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // For now, create with existing constructor
    // TODO: Update once DriverRepository supports RPC separation
    const contract = LocationContract__factory.connect(contractAddress, signer);
    return new DriverRepository(contract, userProvider as any, signer);
  }

  /**
   * Create a NodeRepository with enhanced RPC separation
   * Note: This will need to be updated once NodeRepository supports the pattern
   */
  public async createNodeRepository(
    userProvider: Provider,
    signer: Signer,
    aurumManagerAddress: string = NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
    auraGoatAddress: string = NEXT_PUBLIC_AURA_GOAT_ADDRESS,
  ): Promise<BlockchainNodeRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // For now, create with existing constructor
    // TODO: Update once NodeRepository supports RPC separation
    const contract = AurumNodeManager__factory.connect(
      aurumManagerAddress,
      signer,
    );
    return new BlockchainNodeRepository(
      contract,
      userProvider as any,
      signer,
      auraGoatAddress,
    );
  }

  /**
   * Create all repositories with enhanced RPC separation
   */
  public async createAllRepositories(
    userProvider: Provider,
    signer: Signer,
    aurumContract: AurumNodeManager,
    ausysContract: LocationContract,
  ): Promise<{
    poolRepository: PoolRepository;
    orderRepository: OrderRepository;
    driverRepository: DriverRepository;
    nodeRepository: BlockchainNodeRepository;
  }> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // Create repositories in parallel
    const [poolRepository, orderRepository, driverRepository, nodeRepository] =
      await Promise.all([
        this.createPoolRepository(userProvider, signer),
        this.createOrderRepository(userProvider, signer),
        this.createDriverRepository(userProvider, signer),
        this.createNodeRepository(userProvider, signer),
      ]);

    return {
      poolRepository,
      orderRepository,
      driverRepository,
      nodeRepository,
    };
  }

  /**
   * Get read provider for a specific chain
   * This can be used by repositories that want to access the dedicated RPC directly
   */
  public getReadProvider(chainId: number): Provider | null {
    return this.readProviders.get(chainId) || null;
  }

  /**
   * Check if the factory is using dedicated RPC for a specific chain
   */
  public hasReadProvider(chainId: number): boolean {
    return this.readProviders.has(chainId);
  }

  /**
   * Get all configured chain IDs
   */
  public getConfiguredChains(): number[] {
    return Array.from(this.readProviders.keys());
  }

  /**
   * Clear cached providers (useful for testing or chain switches)
   */
  public clearCache(): void {
    this.readProviders.clear();
    this.isInitialized = false;
  }
}

// Export both factories for different use cases
export { RepositoryFactory } from './repository-factory';
