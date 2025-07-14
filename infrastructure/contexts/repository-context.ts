import { NodeRepository } from '@/domain/node/node';
import { BlockchainNodeRepository } from '../repositories/node-repository';
import {
  AurumNodeManager,
  LocationContract,
  AurumNode,
  AurumNode__factory,
  AuraGoat,
  AuraGoat__factory,
} from '@/typechain-types';
import { BrowserProvider, ethers } from 'ethers';
import { INodeAssetService } from '@/domain/node';
import { IOrderService } from '@/domain/orders';
import { IOrderRepository } from '@/domain/orders';
import { OrderRepository } from '../repositories/orders-repository';
import { DriverRepository } from '../repositories/driver-repository';
import { IDriverRepository } from '@/domain/driver/driver';
import {
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
} from '@/chain-constants';
import { listenForSignature } from '../services/signature-listener.service';
import { IPoolRepository } from '@/domain/pool';
import { PoolRepository } from '../repositories/pool-repository';
import { RepositoryFactory } from '../factories/repository-factory';

/**
 * Context that manages all repositories and their dependencies
 */
export class RepositoryContext {
  private static instance: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private orderRepository: OrderRepository | null = null;
  private driverRepository: IDriverRepository | null = null;
  private poolRepository: IPoolRepository | null = null;
  private aurumContract: AurumNodeManager | null = null;
  private ausysContract: LocationContract | null = null;
  private signer: ethers.Signer | null = null;
  private auraGoatContract: AuraGoat | null = null;

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
   * Initialize the context with required contracts and signer
   */
  public async initialize(
    ausysContract: LocationContract,
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
  ) {
    this.ausysContract = ausysContract;
    this.aurumContract = aurumContract;
    this.signer = signer;

    // Use the factory to create repositories with RPC separation
    const repositoryFactory = RepositoryFactory.getInstance();

    try {
      const repositories = await repositoryFactory.createAllRepositories(
        provider,
        signer,
        aurumContract,
        ausysContract,
      );

      this.poolRepository = repositories.poolRepository;
      this.nodeRepository = repositories.nodeRepository;
      this.orderRepository = repositories.orderRepository;
      this.driverRepository = repositories.driverRepository;

      console.log(
        '[RepositoryContext] Successfully created repositories with RPC separation',
      );
    } catch (error) {
      console.error(
        '[RepositoryContext] Failed to create repositories with factory, falling back to direct creation:',
        error,
      );

      // Fallback to direct creation if factory fails
      this.poolRepository = new PoolRepository(provider, signer);
      this.nodeRepository = new BlockchainNodeRepository(
        aurumContract,
        provider,
        signer,
        this.auraGoatAddress,
      );
      this.orderRepository = new OrderRepository(
        ausysContract,
        provider,
        signer,
      );
      this.driverRepository = new DriverRepository(
        ausysContract,
        provider,
        signer,
      );
    }

    this.auraGoatContract = AuraGoat__factory.connect(
      this.auraGoatAddress,
      signer,
    );
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
    if (!this.orderRepository) {
      throw new Error(
        'RepositoryContext not initialized. Call initialize() first.',
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
        'RepositoryContext not initialized. Call initialize() first.',
      );
    }
    return this.driverRepository;
  }

  /**
   * Get the Pool repository instance
   */
  public getPoolRepository(): IPoolRepository {
    if (!this.poolRepository) {
      throw new Error(
        'RepositoryContext not initialized or PoolRepository failed to initialize.',
      );
    }
    return this.poolRepository;
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

  /**
   * Get the Ausys (LocationContract) contract instance
   */
  public getAusysContract(): LocationContract {
    if (!this.ausysContract) {
      throw new Error(
        'RepositoryContext not initialized. Call initialize() first.',
      );
    }
    return this.ausysContract;
  }

  /**
   * Get the connected Signer instance.
   */
  public getSigner(): ethers.Signer {
    if (!this.signer) {
      throw new Error('RepositoryContext not initialized with a signer.');
    }
    return this.signer;
  }

  /**
   * Get the AuraGoat contract instance
   */
  public async getAuraGoatContract(): Promise<AuraGoat> {
    if (!this.auraGoatContract) {
      throw new Error('AuraGoat contract not initialized.');
    }
    return this.auraGoatContract;
  }

  /**
   * Get an AurumNode contract instance connected to a specific address.
   * Requires the context to be initialized with a signer.
   */
  public getAurumNodeContract(address: string): AurumNode {
    if (!this.signer) {
      throw new Error(
        'RepositoryContext not initialized with a signer. Cannot get AurumNode contract.',
      );
    }
    try {
      // Use the factory to connect to the specific node address with the stored signer
      return AurumNode__factory.connect(address, this.signer);
    } catch (error) {
      console.error(
        `Error connecting to AurumNode contract at ${address}:`,
        error,
      );
      throw new Error(`Failed to connect to AurumNode contract at ${address}`);
    }
  }

  /**
   * Waits for the Multi-Party Signature Confirmation (two distinct signatures)
   * for a specific job ID on the Ausys/Location contract.
   * Resolves true if two distinct parties sign within the timeout, otherwise rejects.
   *
   * @param jobID The string ID of the job requiring signature confirmation.
   * @param timeoutMs Optional timeout override (defaults to ~2 minutes).
   * @returns Promise<boolean>
   * @throws Error if RepositoryContext is not initialized or ausysContract is missing.
   */
  public async waitForSignaturesForJob(
    jobID: string,
    timeoutMs?: number,
  ): Promise<boolean> {
    if (!this.ausysContract) {
      throw new Error(
        'RepositoryContext not initialized or Ausys contract not available.',
      );
    }
    // The ausysContract instance here is already connected to the user's signer
    // Call the underlying infrastructure service function
    console.log('[RepositoryContext] Initiating waitForSignaturesForJob...');
    return listenForSignature(this.ausysContract, jobID, timeoutMs);
  }
}
