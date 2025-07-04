import {
  IPoolRepository,
  Pool,
  PoolStatus,
  StakeEvent,
  PoolDynamicData,
  GroupedStakes,
  Address,
  BigNumberString,
} from '@/domain/pool';
import {
  AuStake as AuStakeContract,
  AuStake__factory,
} from '@/typechain-types';
import {
  BigNumberish,
  BytesLike,
  ethers,
  Provider,
  Signer,
} from 'ethers';
import { NEXT_PUBLIC_AUSTAKE_ADDRESS } from '@/chain-constants';

/**
 * Blockchain-based implementation of IPoolRepository.
 * Handles all data persistence and retrieval operations for Pools via smart contract interaction.
 */
export class PoolRepository implements IPoolRepository {
  private contract: AuStakeContract;
  private signer: Signer;
  private provider: Provider;

  constructor(
    provider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ) {
    if (!contractAddress) {
      throw new Error(
        '[PoolRepository] Pool contract address is undefined',
      );
    }
    this.provider = provider;
    this.signer = signer;
    this.contract = AuStake__factory.connect(contractAddress, signer);
  }

  async getPoolById(id: string): Promise<Pool> {
    try {
      const operation = await this.contract.getOperation(id);
      
      if (!operation || operation.id === ethers.ZeroHash || operation.token === ethers.ZeroAddress) {
        throw new Error(`Pool with id ${id} not found`);
      }

      return this.mapContractOperationToPool(operation);
    } catch (error) {
      console.error(`[PoolRepository.getPoolById] Error fetching pool ${id}:`, error);
      throw new Error(`Failed to fetch pool ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPoolStakeHistory(poolId: string): Promise<StakeEvent[]> {
    try {
      // Get stake events from contract logs
      const filter = this.contract.filters.Staked(null, poolId, null);
      const events = await this.contract.queryFilter(filter);
      
      return events.map((event: any) => ({
        poolId,
        stakerAddress: event.args?.staker as Address,
        amount: event.args?.amount?.toString() || '0',
        timestamp: event.args?.timestamp ? Number(event.args.timestamp) : 0,
        transactionHash: event.transactionHash,
      }));
    } catch (error) {
      console.error(`[PoolRepository.getPoolStakeHistory] Error fetching stake history for pool ${poolId}:`, error);
      throw new Error(`Failed to fetch stake history for pool ${poolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findPoolsByInvestor(investorAddress: Address): Promise<Pool[]> {
    try {
      // Get all Staked events for this investor
      const filter = this.contract.filters.Staked(investorAddress, null, null);
      const events = await this.contract.queryFilter(filter);
      
      // Get unique pool IDs
      const poolIds = [...new Set(events.map((event: any) => event.args?.operationId).filter(id => id))] as string[];
      
      // Fetch all pools
      const pools = await Promise.all(
        poolIds.map(id => this.getPoolById(id))
      );
      
      return pools.filter((pool: any) => pool !== null);
    } catch (error) {
      console.error(`[PoolRepository.findPoolsByInvestor] Error fetching pools for investor ${investorAddress}:`, error);
      throw new Error(`Failed to fetch pools for investor ${investorAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findPoolsByProvider(providerAddress: Address): Promise<Pool[]> {
    try {
      // Get all OperationCreated events for this provider
      const filter = this.contract.filters.OperationCreated(null, null, providerAddress);
      const events = await this.contract.queryFilter(filter);
      
      // Fetch all pools
      const pools = await Promise.all(
        events.map((event: any) => this.getPoolById(event.args?.operationId))
      );
      
      return pools.filter((pool: any) => pool !== null);
    } catch (error) {
      console.error(`[PoolRepository.findPoolsByProvider] Error fetching pools for provider ${providerAddress}:`, error);
      throw new Error(`Failed to fetch pools for provider ${providerAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllPools(): Promise<Pool[]> {
    try {
      // Get all OperationCreated events
      const filter = this.contract.filters.OperationCreated(null, null, null);
      const events = await this.contract.queryFilter(filter);
      
      // Fetch all pools
      const pools = await Promise.all(
        events.map((event: any) => this.getPoolById(event.args?.operationId))
      );
      
      return pools.filter((pool: any) => pool !== null);
    } catch (error) {
      console.error(`[PoolRepository.getAllPools] Error fetching all pools:`, error);
      throw new Error(`Failed to fetch all pools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPoolWithDynamicData(id: string): Promise<(Pool & PoolDynamicData) | null> {
    try {
      const pool = await this.getPoolById(id);
      const stakeHistory = await this.getPoolStakeHistory(id);
      const dynamicData = await this.calculatePoolDynamicData(pool, stakeHistory);
      
      return { ...pool, ...dynamicData };
    } catch (error) {
      console.error(`[PoolRepository.getPoolWithDynamicData] Error fetching pool with dynamic data ${id}:`, error);
      return null;
    }
  }

  async getAllPoolsWithDynamicData(): Promise<(Pool & PoolDynamicData)[]> {
    try {
      const pools = await this.getAllPools();
      
      const poolsWithDynamicData = await Promise.all(
        pools.map(async pool => {
          const stakeHistory = await this.getPoolStakeHistory(pool.id);
          const dynamicData = await this.calculatePoolDynamicData(pool, stakeHistory);
          return { ...pool, ...dynamicData };
        })
      );
      
      return poolsWithDynamicData;
    } catch (error) {
      console.error(`[PoolRepository.getAllPoolsWithDynamicData] Error fetching all pools with dynamic data:`, error);
      throw new Error(`Failed to fetch all pools with dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserPoolsWithDynamicData(stakerAddress: Address): Promise<(Pool & PoolDynamicData)[]> {
    try {
      const pools = await this.findPoolsByInvestor(stakerAddress);
      
      const poolsWithDynamicData = await Promise.all(
        pools.map(async pool => {
          const stakeHistory = await this.getPoolStakeHistory(pool.id);
          const dynamicData = await this.calculatePoolDynamicData(pool, stakeHistory);
          return { ...pool, ...dynamicData };
        })
      );
      
      return poolsWithDynamicData;
    } catch (error) {
      console.error(`[PoolRepository.getUserPoolsWithDynamicData] Error fetching user pools with dynamic data:`, error);
      throw new Error(`Failed to fetch user pools with dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProviderPoolsWithDynamicData(providerAddress: Address): Promise<(Pool & PoolDynamicData)[]> {
    try {
      const pools = await this.findPoolsByProvider(providerAddress);
      
      const poolsWithDynamicData = await Promise.all(
        pools.map(async pool => {
          const stakeHistory = await this.getPoolStakeHistory(pool.id);
          const dynamicData = await this.calculatePoolDynamicData(pool, stakeHistory);
          return { ...pool, ...dynamicData };
        })
      );
      
      return poolsWithDynamicData;
    } catch (error) {
      console.error(`[PoolRepository.getProviderPoolsWithDynamicData] Error fetching provider pools with dynamic data:`, error);
      throw new Error(`Failed to fetch provider pools with dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGroupedStakeHistory(
    poolId: string,
    interval: '1H' | '1D' | '1W' | '1M' | '1Y',
  ): Promise<GroupedStakes> {
    try {
      const stakeHistory = await this.getPoolStakeHistory(poolId);
      
      const grouped: GroupedStakes = {};
      
      // Group stakes by interval
      for (const stake of stakeHistory) {
        const date = new Date(stake.timestamp * 1000);
        let key: string;
        
        switch (interval) {
          case '1H':
            key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
            if (!grouped.hourly) grouped.hourly = {};
            grouped.hourly[key] = (BigInt(grouped.hourly[key] || '0') + BigInt(stake.amount)).toString();
            break;
          case '1D':
            key = date.toISOString().substring(0, 10); // YYYY-MM-DD
            if (!grouped.daily) grouped.daily = {};
            grouped.daily[key] = (BigInt(grouped.daily[key] || '0') + BigInt(stake.amount)).toString();
            break;
          case '1W':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().substring(0, 10);
            if (!grouped.weekly) grouped.weekly = {};
            grouped.weekly[key] = (BigInt(grouped.weekly[key] || '0') + BigInt(stake.amount)).toString();
            break;
          case '1M':
            key = date.toISOString().substring(0, 7); // YYYY-MM
            if (!grouped.monthly) grouped.monthly = {};
            grouped.monthly[key] = (BigInt(grouped.monthly[key] || '0') + BigInt(stake.amount)).toString();
            break;
          case '1Y':
            key = date.toISOString().substring(0, 4); // YYYY
            if (!grouped.yearly) grouped.yearly = {};
            grouped.yearly[key] = (BigInt(grouped.yearly[key] || '0') + BigInt(stake.amount)).toString();
            break;
        }
      }
      
      return grouped;
    } catch (error) {
      console.error(`[PoolRepository.getGroupedStakeHistory] Error grouping stake history:`, error);
      throw new Error(`Failed to group stake history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculatePoolDynamicData(pool: Pool, stakeHistory?: StakeEvent[]): Promise<PoolDynamicData> {
    try {
      const history = stakeHistory || await this.getPoolStakeHistory(pool.id);
      
      // Calculate current time and pool end time
      const currentTime = Math.floor(Date.now() / 1000);
      const poolEndTime = pool.startDate + (pool.durationDays * 24 * 60 * 60);
      
      // Calculate progress percentage
      const fundingProgress = (BigInt(pool.totalValueLocked) * BigInt(100)) / BigInt(pool.fundingGoal);
      const timeProgress = Math.min(100, Math.max(0, ((currentTime - pool.startDate) / (poolEndTime - pool.startDate)) * 100));
      
      // Calculate time remaining
      const timeRemainingSeconds = Math.max(0, poolEndTime - currentTime);
      
      // Calculate 24h volume
      const oneDayAgo = currentTime - (24 * 60 * 60);
      const volume24h = history
        .filter(stake => stake.timestamp >= oneDayAgo)
        .reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0))
        .toString();
      
      // Calculate APY (simplified calculation)
      const apy = pool.rewardRate; // Assuming rewardRate is already in percentage
      
      // Format values
      const tvlFormatted = this.formatCurrency(pool.totalValueLocked);
      const fundingGoalFormatted = this.formatCurrency(pool.fundingGoal);
      const rewardFormatted = `${pool.rewardRate}%`;
      
      return {
        progressPercentage: Math.min(100, Number(fundingProgress)),
        timeRemainingSeconds,
        volume24h,
        volumeChangePercentage: "+0.0%", // Would need historical data to calculate
        apy,
        tvlFormatted,
        fundingGoalFormatted,
        rewardFormatted,
      };
    } catch (error) {
      console.error(`[PoolRepository.calculatePoolDynamicData] Error calculating dynamic data:`, error);
      throw new Error(`Failed to calculate dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapContractOperationToPool(operation: AuStakeContract.OperationStructOutput): Pool {
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = Number(operation.deadline);
    
    // Determine status based on deadline and completion
    let status: PoolStatus;
    if (currentTime > deadline) {
      status = PoolStatus.COMPLETE;
    } else {
      status = PoolStatus.ACTIVE;
    }
    
    return {
      id: operation.id,
      name: operation.name,
      description: operation.description,
      assetName: operation.rwaName,
      tokenAddress: operation.token as Address,
      providerAddress: operation.provider as Address,
      fundingGoal: operation.fundingGoal.toString(),
      totalValueLocked: operation.totalStaked?.toString() || '0',
      startDate: currentTime, // Contract doesn't store start date, using current time
      durationDays: Math.ceil((deadline - currentTime) / (24 * 60 * 60)),
      rewardRate: Number(operation.reward) / 100, // Assuming reward is in basis points
      status,
    };
  }

  private formatCurrency(value: BigNumberString): string {
    const num = Number(ethers.formatEther(value));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}