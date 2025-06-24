import {
  IPoolService,
  IPoolRepository,
  Pool,
  PoolCreationData,
  PoolDynamicData,
  StakeEvent,
  GroupedStakes,
  Address,
  BigNumberString,
} from '@/domain/pool';
import { RepositoryContext } from '../contexts/repository-context';
import { ethers } from 'ethers';

// Error handler following the existing pattern
const handleServiceError = (error: any, methodName: string) => {
  console.error(`Error in PoolService.${methodName}:`, error);
  if (error instanceof Error) {
    throw new Error(`PoolService.${methodName} failed: ${error.message}`);
  }
  throw new Error(`PoolService.${methodName} failed with an unknown error.`);
};

export class PoolService implements IPoolService {
  private poolRepository: IPoolRepository;
  private repositoryContext: RepositoryContext;

  constructor(
    poolRepository: IPoolRepository,
    repositoryContext: RepositoryContext,
  ) {
    this.poolRepository = poolRepository;
    this.repositoryContext = repositoryContext;
  }

  private async getCurrentUserAddress(): Promise<string> {
    const signer = this.repositoryContext.getSigner();
    return signer.getAddress();
  }

  async createPool(
    data: PoolCreationData,
    creatorAddress: Address,
  ): Promise<{ poolId: string; transactionHash: string } | string> {
    const methodName = 'createPool';
    try {
      // Use the AuStake repository to create the operation
      const auStakeRepo = this.repositoryContext.getAuStakeRepository();
      
      // Calculate deadline from duration days
      const currentTime = Math.floor(Date.now() / 1000);
      const deadline = currentTime + (data.durationDays * 24 * 60 * 60);
      
      // Note: This should use AuStakeService instead of repository directly
      // For now returning a placeholder response
      throw new Error('Pool creation not yet implemented - need to use AuStakeService');
    } catch (error) {
      handleServiceError(error, methodName);
      throw error;
    }
  }

  async stake(
    poolId: string,
    amount: BigNumberString,
    stakerAddress: Address,
  ): Promise<string> {
    const methodName = 'stake';
    try {
      if (!amount || BigInt(amount) <= 0) {
        throw new Error('Invalid stake amount');
      }

      // Use the AuStake repository to stake
      const auStakeRepo = this.repositoryContext.getAuStakeRepository();
      const pool = await this.poolRepository.getPoolById(poolId);
      
      if (!pool) {
        throw new Error(`Pool with ID ${poolId} not found`);
      }

      const operationId = ethers.id(poolId);
      // Note: This should use AuStakeService instead of repository directly
      throw new Error('Staking not yet implemented - need to use AuStakeService');
    } catch (error) {
      handleServiceError(error, methodName);
      throw error;
    }
  }

  async claimReward(poolId: string, claimantAddress: Address): Promise<string> {
    const methodName = 'claimReward';
    try {
      const auStakeRepo = this.repositoryContext.getAuStakeRepository();
      const pool = await this.poolRepository.getPoolById(poolId);
      
      if (!pool) {
        throw new Error(`Pool with ID ${poolId} not found`);
      }

      const operationId = ethers.id(poolId);
      // Note: This should use AuStakeService instead of repository directly
      throw new Error('Claim reward not yet implemented - need to use AuStakeService');
    } catch (error) {
      handleServiceError(error, methodName);
      throw error;
    }
  }

  async unlockReward(poolId: string, providerAddress: Address): Promise<string> {
    const methodName = 'unlockReward';
    try {
      const auStakeRepo = this.repositoryContext.getAuStakeRepository();
      const pool = await this.poolRepository.getPoolById(poolId);
      
      if (!pool) {
        throw new Error(`Pool with ID ${poolId} not found`);
      }

      const operationId = ethers.id(poolId);
      // Note: This should use AuStakeService instead of repository directly
      throw new Error('Unlock reward not yet implemented - need to use AuStakeService');
    } catch (error) {
      handleServiceError(error, methodName);
      throw error;
    }
  }

  async getPoolWithDynamicData(id: string): Promise<(Pool & PoolDynamicData) | null> {
    const methodName = 'getPoolWithDynamicData';
    try {
      const pool = await this.poolRepository.getPoolById(id);
      if (!pool) {
        return null;
      }

      const dynamicData = await this.calculatePoolDynamicData(pool);
      return { ...pool, ...dynamicData };
    } catch (error) {
      handleServiceError(error, methodName);
      return null;
    }
  }

  async getAllPoolsWithDynamicData(): Promise<(Pool & PoolDynamicData)[]> {
    const methodName = 'getAllPoolsWithDynamicData';
    try {
      const pools = await this.poolRepository.getAllPools();
      const poolsWithDynamicData: (Pool & PoolDynamicData)[] = [];

      for (const pool of pools) {
        const dynamicData = await this.calculatePoolDynamicData(pool);
        poolsWithDynamicData.push({ ...pool, ...dynamicData });
      }

      return poolsWithDynamicData;
    } catch (error) {
      handleServiceError(error, methodName);
      return [];
    }
  }

  async getUserPoolsWithDynamicData(
    stakerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]> {
    const methodName = 'getUserPoolsWithDynamicData';
    try {
      const pools = await this.poolRepository.findPoolsByStaker(stakerAddress);
      const poolsWithDynamicData: (Pool & PoolDynamicData)[] = [];

      for (const pool of pools) {
        const dynamicData = await this.calculatePoolDynamicData(pool);
        poolsWithDynamicData.push({ ...pool, ...dynamicData });
      }

      return poolsWithDynamicData;
    } catch (error) {
      handleServiceError(error, methodName);
      return [];
    }
  }

  async getProviderPoolsWithDynamicData(
    providerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]> {
    const methodName = 'getProviderPoolsWithDynamicData';
    try {
      const pools = await this.poolRepository.findPoolsByProvider(providerAddress);
      const poolsWithDynamicData: (Pool & PoolDynamicData)[] = [];

      for (const pool of pools) {
        const dynamicData = await this.calculatePoolDynamicData(pool);
        poolsWithDynamicData.push({ ...pool, ...dynamicData });
      }

      return poolsWithDynamicData;
    } catch (error) {
      handleServiceError(error, methodName);
      return [];
    }
  }

  async getGroupedStakeHistory(
    poolId: string,
    interval: '1H' | '1D' | '1W' | '1M' | '1Y',
  ): Promise<GroupedStakes> {
    const methodName = 'getGroupedStakeHistory';
    try {
      const stakeHistory = await this.poolRepository.getPoolStakeHistory(poolId);
      return this.groupStakesByInterval(stakeHistory, interval);
    } catch (error) {
      handleServiceError(error, methodName);
      return {};
    }
  }

  async calculatePoolDynamicData(
    pool: Pool,
    stakeHistory?: StakeEvent[],
  ): Promise<PoolDynamicData> {
    const methodName = 'calculatePoolDynamicData';
    try {
      if (!stakeHistory) {
        stakeHistory = await this.poolRepository.getPoolStakeHistory(pool.id);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = pool.startDate + (pool.durationDays * 24 * 60 * 60);
      const timeRemainingSeconds = Math.max(0, endTime - currentTime);
      
      const fundingGoalBigInt = BigInt(pool.fundingGoal);
      const totalValueLockedBigInt = BigInt(pool.totalValueLocked);
      
      const progressPercentage = fundingGoalBigInt > 0 
        ? Math.min(100, Number((totalValueLockedBigInt * BigInt(100)) / fundingGoalBigInt))
        : 0;

      // Calculate 24h volume (simplified - in practice would need more sophisticated logic)
      const oneDayAgo = currentTime - (24 * 60 * 60);
      const recentStakes = stakeHistory.filter(stake => stake.timestamp >= oneDayAgo);
      const volume24h = recentStakes.reduce(
        (sum, stake) => BigInt(sum) + BigInt(stake.amount),
        BigInt(0)
      ).toString() as BigNumberString;

      // Format values using token decimals
      const decimals = await this.poolRepository.getTokenDecimals(pool.tokenAddress);
      const divisor = BigInt(10 ** decimals);
      
      const tvlFormatted = `${(Number(totalValueLockedBigInt) / Number(divisor)).toFixed(2)} ${pool.assetName}`;
      const fundingGoalFormatted = `${(Number(fundingGoalBigInt) / Number(divisor)).toFixed(2)} ${pool.assetName}`;
      const rewardFormatted = `${(pool.rewardRate / 100).toFixed(2)}%`;

      // Calculate APY (simplified calculation)
      const apy = pool.durationDays > 0 
        ? (pool.rewardRate / 100) * (365 / pool.durationDays) * 100
        : 0;

      return {
        progressPercentage,
        timeRemainingSeconds,
        volume24h,
        volumeChangePercentage: '+0.0%', // Placeholder - would need historical data
        apy,
        tvlFormatted,
        fundingGoalFormatted,
        rewardFormatted,
      };
    } catch (error) {
      handleServiceError(error, methodName);
      // Return default values in case of error
      return {
        progressPercentage: 0,
        timeRemainingSeconds: 0,
        volume24h: '0' as BigNumberString,
        volumeChangePercentage: '0.0%',
        apy: 0,
        tvlFormatted: '0',
        fundingGoalFormatted: '0',
        rewardFormatted: '0%',
      };
    }
  }

  private groupStakesByInterval(
    stakeHistory: StakeEvent[],
    interval: '1H' | '1D' | '1W' | '1M' | '1Y',
  ): GroupedStakes {
    const grouped: GroupedStakes = {};
    
    // Simple grouping implementation - in practice would be more sophisticated
    const getIntervalKey = (timestamp: number, intervalType: string): string => {
      const date = new Date(timestamp * 1000);
      
      switch (intervalType) {
        case '1H':
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        case '1D':
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        case '1W':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
        case '1M':
          return `${date.getFullYear()}-${date.getMonth()}`;
        case '1Y':
          return `${date.getFullYear()}`;
        default:
          return date.toISOString().split('T')[0];
      }
    };

    const intervalMap: { [key: string]: BigInt } = {};
    
    stakeHistory.forEach(stake => {
      const key = getIntervalKey(stake.timestamp, interval);
      if (!intervalMap[key]) {
        intervalMap[key] = BigInt(0);
      }
             intervalMap[key] = (intervalMap[key] as bigint) + (BigInt(stake.amount) as bigint);
    });

    // Convert BigInt values back to strings
    const convertedMap: { [key: string]: BigNumberString } = {};
    Object.entries(intervalMap).forEach(([key, value]) => {
      convertedMap[key] = value.toString() as BigNumberString;
    });

    // Map to appropriate interval type
    switch (interval) {
      case '1H':
        grouped.hourly = convertedMap;
        break;
      case '1D':
        grouped.daily = convertedMap;
        break;
      case '1W':
        grouped.weekly = convertedMap;
        break;
      case '1M':
        grouped.monthly = convertedMap;
        break;
      case '1Y':
        grouped.yearly = convertedMap;
        break;
    }

    return grouped;
  }
}