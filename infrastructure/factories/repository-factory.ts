import { ethers, Provider, Signer } from 'ethers';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { PoolRepository } from '@/infrastructure/repositories/pool-repository';
import { OrderRepository } from '@/infrastructure/repositories/orders-repository';
import { DriverRepository } from '@/infrastructure/repositories/driver-repository';
import { BlockchainNodeRepository } from '@/infrastructure/repositories/node-repository';
import {
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
} from '@/chain-constants';
import {
  AuStake__factory,
  AurumNodeManager__factory,
  AuraAsset__factory,
  Ausys__factory,
} from '@/lib/contracts';
import { PlatformRepository } from '../repositories/platform-repository';
import { PinataSDK } from 'pinata';

/**
 * Factory for creating repositories with proper RPC separation.
 * This factory handles the complexity of setting up read/write providers
 * so repositories can focus on their core business logic.
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private readProviders: Map<number, Provider> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
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
        `[RepositoryFactory] Initialized with dedicated RPC for chain ${chainId}`,
      );
    } catch (error) {
      console.warn(
        '[RepositoryFactory] Failed to initialize read provider, repositories will use user provider:',
        error,
      );
      this.isInitialized = true;
    }
  }

  /**
   * Get read provider for the current chain or fallback to user provider
   */
  private getReadProvider(userProvider: Provider, chainId?: number): Provider {
    if (chainId && this.readProviders.has(chainId)) {
      return this.readProviders.get(chainId)!;
    }
    return userProvider; // Fallback to user provider
  }

  /**
   * Create a PoolRepository with RPC separation
   */
  public async createPoolRepository(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ): Promise<PoolRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // PoolRepository handles RPC separation internally
    return new PoolRepository(userProvider, signer, contractAddress);
  }

  /**
   * Create an OrderRepository with RPC separation
   */
  public async createOrderRepository(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
  ): Promise<OrderRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // Create the contract instance and pass to repository
    const contract = Ausys__factory.connect(contractAddress, signer);
    return new OrderRepository(contract as any, userProvider as any, signer);
  }

  /**
   * Create a DriverRepository with RPC separation
   */
  public async createDriverRepository(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
  ): Promise<DriverRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // Create the contract instance and pass to repository
    const contract = Ausys__factory.connect(contractAddress, signer);
    return new DriverRepository(contract as any, userProvider as any, signer);
  }

  /**
   * Create a NodeRepository with RPC separation
   */
  public async createNodeRepository(
    userProvider: Provider,
    signer: Signer,
    aurumManagerAddress: string = NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
    auraGoatAddress: string = NEXT_PUBLIC_AURA_GOAT_ADDRESS,
    pinata: PinataSDK,
  ): Promise<BlockchainNodeRepository> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    // Create the contract instance and pass to repository
    const contract = AurumNodeManager__factory.connect(
      aurumManagerAddress,
      signer,
    );
    return new BlockchainNodeRepository(
      contract,
      userProvider as any,
      signer,
      auraGoatAddress,
      pinata,
    );
  }

  public async createPlatformRepository(
    signer: Signer,
    pinata: PinataSDK,
  ): Promise<PlatformRepository> {
    const contract = AuraAsset__factory.connect(
      NEXT_PUBLIC_AURA_GOAT_ADDRESS,
      signer,
    );
    return new PlatformRepository(contract, pinata);
  }

  /**
   * Create all repositories at once for the RepositoryProvider
   */
  public async createAllRepositories(
    userProvider: Provider,
    signer: Signer,
    pinata: PinataSDK,
  ): Promise<{
    poolRepository: PoolRepository;
    orderRepository: OrderRepository;
    driverRepository: DriverRepository;
    nodeRepository: BlockchainNodeRepository;
    platformRepository: PlatformRepository;
  }> {
    if (!this.isInitialized) {
      await this.initialize(userProvider, signer);
    }

    const [
      poolRepository,
      orderRepository,
      driverRepository,
      nodeRepository,
      platformRepository,
    ] = await Promise.all([
      this.createPoolRepository(userProvider, signer),
      this.createOrderRepository(userProvider, signer),
      this.createDriverRepository(userProvider, signer),
      this.createNodeRepository(
        userProvider,
        signer,
        NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
        NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        pinata,
      ),
      this.createPlatformRepository(signer, pinata),
    ]);

    return {
      poolRepository,
      orderRepository,
      driverRepository,
      nodeRepository,
      platformRepository,
    };
  }

  /**
   * Clear cached providers (useful for testing or chain switches)
   */
  public clearCache(): void {
    this.readProviders.clear();
    this.isInitialized = false;
  }
}
