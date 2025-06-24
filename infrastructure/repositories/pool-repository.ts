import {
  IPoolRepository,
  Pool,
  StakeEvent,
  Address,
  BigNumberString,
  PoolStatus,
} from '@/domain/pool';
import {
  AuStake as AuStakeContract,
  AuStake__factory,
} from '@/typechain-types';
import {
  ethers,
  BrowserProvider,
  Signer,
  Provider,
  BytesLike,
} from 'ethers';
import { NEXT_PUBLIC_AUSTAKE_ADDRESS } from '@/chain-constants';

// Error handler following the existing pattern
const handleRepositoryError = (error: any, methodName: string) => {
  console.error(`Error in PoolRepository.${methodName}:`, error);
  if (error instanceof Error) {
    throw new Error(`PoolRepository.${methodName} failed: ${error.message}`);
  }
  throw new Error(
    `PoolRepository.${methodName} failed with an unknown error.`,
  );
};

export class PoolRepository implements IPoolRepository {
  private contract: AuStakeContract;
  private signer: Signer;
  private provider: Provider;

  constructor(
    provider: Provider,
    signer: Signer,
    auStakeContractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ) {
    if (!auStakeContractAddress) {
      throw new Error(
        '[PoolRepository] AuStake contract address is undefined',
      );
    }
    this.provider = provider;
    this.signer = signer;
    this.contract = AuStake__factory.connect(auStakeContractAddress, this.signer);
  }

  async getPoolById(id: string): Promise<Pool | null> {
    const methodName = 'getPoolById';
    try {
      const operationId = ethers.id(id); // Convert string to bytes32
      const operation = await this.contract.getOperation(operationId);

      if (
        !operation ||
        operation.id === ethers.ZeroHash ||
        operation.token === ethers.ZeroAddress
      ) {
        return null;
      }

      return this.mapOperationToPool(operation, id);
    } catch (error) {
      handleRepositoryError(error, methodName);
      return null;
    }
  }

  async getAllPoolIds(): Promise<string[]> {
    const methodName = 'getAllPoolIds';
    try {
      // This would need to be implemented based on how the contract stores operations
      // For now, we'll return an empty array as this depends on contract implementation
      console.warn(
        '[PoolRepository] getAllPoolIds needs contract implementation for operation enumeration',
      );
      return [];
    } catch (error) {
      handleRepositoryError(error, methodName);
      return [];
    }
  }

  async getPoolStakeHistory(poolId: string): Promise<StakeEvent[]> {
    const methodName = 'getPoolStakeHistory';
    try {
      const operationId = ethers.id(poolId);
      
      // Query stake events from the contract
      // This would typically involve filtering events or calling a view function
      const filter = this.contract.filters.Staked(null, operationId);
      const events = await this.contract.queryFilter(filter);
      
      return events.map((event: any) => ({
        poolId,
        stakerAddress: event.args.user as Address,
        amount: event.args.amount.toString() as BigNumberString,
        timestamp: Math.floor(Date.now() / 1000), // Would get from block timestamp
        transactionHash: event.transactionHash,
      }));
    } catch (error) {
      handleRepositoryError(error, methodName);
      return [];
    }
  }

  async findPoolsByStaker(stakerAddress: Address): Promise<Pool[]> {
    const methodName = 'findPoolsByStaker';
    try {
      // Query user's staking events to find pools they've participated in
      const filter = this.contract.filters.Staked(stakerAddress);
      const events = await this.contract.queryFilter(filter);
      
      const uniqueOperationIds = [...new Set(events.map((e: any) => e.args.operationId))];
      const pools: Pool[] = [];
      
      for (const operationId of uniqueOperationIds) {
        const operation = await this.contract.getOperation(operationId);
        if (operation && operation.id !== ethers.ZeroHash) {
          const pool = this.mapOperationToPool(operation, operationId);
          pools.push(pool);
        }
      }
      
      return pools;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return [];
    }
  }

  async findPoolsByProvider(providerAddress: Address): Promise<Pool[]> {
    const methodName = 'findPoolsByProvider';
    try {
      // Query OperationCreated events filtered by provider
      const filter = this.contract.filters.OperationCreated();
      const events = await this.contract.queryFilter(filter);
      
      const pools: Pool[] = [];
      
      for (const event of events) {
        const operation = await this.contract.getOperation(event.args.operationId);
        if (operation && operation.provider.toLowerCase() === providerAddress.toLowerCase()) {
          const pool = this.mapOperationToPool(operation, event.args.operationId);
          pools.push(pool);
        }
      }
      
      return pools;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return [];
    }
  }

  async getTokenDecimals(tokenAddress: Address): Promise<number> {
    const methodName = 'getTokenDecimals';
    try {
      const erc20Abi = [
        'function decimals() view returns (uint8)',
      ];
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        this.provider,
      );
      
      return await tokenContract.decimals();
    } catch (error) {
      handleRepositoryError(error, methodName);
      return 18; // Default to 18 decimals
    }
  }

  async getAllPools(): Promise<Pool[]> {
    const methodName = 'getAllPools';
    try {
      const poolIds = await this.getAllPoolIds();
      const pools: Pool[] = [];
      
      for (const id of poolIds) {
        const pool = await this.getPoolById(id);
        if (pool) {
          pools.push(pool);
        }
      }
      
      return pools;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return [];
    }
  }

  private mapOperationToPool(
    operation: AuStakeContract.OperationStructOutput,
    operationId: string | BytesLike,
  ): Pool {
    // Map the smart contract operation struct to domain Pool interface
    return {
      id: typeof operationId === 'string' ? operationId : ethers.hexlify(operationId),
      name: operation.name,
      description: operation.description,
      assetName: operation.rwaName,
      tokenAddress: operation.token as Address,
      providerAddress: operation.provider as Address,
      fundingGoal: operation.fundingGoal.toString() as BigNumberString,
      totalValueLocked: operation.totalStaked?.toString() || '0' as BigNumberString,
      startDate: Number(operation.deadline) - (Number(operation.deadline) * 0.1), // Estimate start date
      durationDays: Math.floor(Number(operation.deadline) / (24 * 60 * 60)), // Convert to days
      rewardRate: Number(operation.reward),
      status: this.mapContractStatusToPoolStatus(Number(operation.status)),
    };
  }

  private mapContractStatusToPoolStatus(contractStatus: number): PoolStatus {
    // Map contract status enum to domain PoolStatus
    switch (contractStatus) {
      case 0:
        return PoolStatus.PENDING;
      case 1:
        return PoolStatus.ACTIVE;
      case 2:
        return PoolStatus.COMPLETE;
      case 3:
        return PoolStatus.PAID;
      default:
        return PoolStatus.PENDING;
    }
  }
}