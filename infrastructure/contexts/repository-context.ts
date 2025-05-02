import { NodeRepository } from '@/domain/node/node';
import { BlockchainNodeRepository } from '../repositories/node-repository';
import {
  AurumNodeManager,
  LocationContract,
  AurumNode,
  AurumNode__factory,
} from '@/typechain-types';
import { BrowserProvider, ethers } from 'ethers';
import { OrderRepositoryInterface } from '@/domain/orders';
import { OrderRepository } from '../repositories/orders-repository';
import { DriverRepository } from '../repositories/driver-repository';
import { IDriverRepository } from '@/domain/driver/driver';

/**
 * Context that manages all repositories and their dependencies
 */
export class RepositoryContext {
  private static instance: RepositoryContext;
  private nodeRepository: NodeRepository | null = null;
  private orderRepository: OrderRepository | null = null;
  private driverRepository: IDriverRepository | null = null;
  private aurumContract: AurumNodeManager | null = null;
  private ausysContract: LocationContract | null = null;
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
    this.signer = signer;
    this.nodeRepository = new BlockchainNodeRepository(
      aurumContract,
      provider,
      signer,
    );
    this.orderRepository = new OrderRepository(ausysContract);
    this.driverRepository = new DriverRepository(
      ausysContract,
      provider,
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
}
