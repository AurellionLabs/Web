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
import { BigNumberish, BytesLike, ethers, Provider, Signer } from 'ethers';
import { NEXT_PUBLIC_AUSTAKE_ADDRESS } from '@/chain-constants';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { readContract } from 'viem/actions';
import { gql, request } from 'graphql-request';
import {
  STAKED_EVENTS_QUERY,
  STAKED_EVENTS_BY_USER_QUERY,
  OPERATION_CREATED_QUERY,
  OPERATION_CREATED_BY_TOKEN_QUERY,
} from '@/constants';

/**
 * Blockchain-based implementation of IPoolRepository.
 * Handles all data persistence and retrieval operations for Pools via smart contract interaction.
 * Uses dedicated RPC for read operations and user's signer for write operations.
 */
export class PoolRepository implements IPoolRepository {
  private readContract: AuStakeContract;
  private writeContract: AuStakeContract;
  private signer: Signer;
  private readProvider: Provider;
  private userProvider: Provider;
  private contractAddress: string;
  private isInitialized = false;
  private graphqlEndpoint =
    'https://api.studio.thegraph.com/query/112596/aurellion/version/latest';

  constructor(
    userProvider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ) {
    if (!contractAddress) {
      throw new Error('[PoolRepository] Pool contract address is undefined');
    }
    this.userProvider = userProvider;
    this.signer = signer;
    this.contractAddress = contractAddress;

    // Initialize with user provider as fallback
    this.readProvider = userProvider;
    this.readContract = AuStake__factory.connect(contractAddress, userProvider);
    this.writeContract = AuStake__factory.connect(contractAddress, signer);

    // Asynchronously initialize read provider using dedicated RPC
    this.initializeReadProvider();
  }

  private async initializeReadProvider(): Promise<void> {
    try {
      const chainId = await RpcProviderFactory.getChainId(this.userProvider);
      this.readProvider = RpcProviderFactory.getReadOnlyProvider(chainId);

      // Read contract uses dedicated RPC provider
      this.readContract = AuStake__factory.connect(
        this.contractAddress,
        this.readProvider,
      );
      this.isInitialized = true;

      console.log(
        `[PoolRepository] Initialized with dedicated RPC for chain ${chainId}`,
      );
    } catch (error) {
      console.warn(
        '[PoolRepository] Failed to initialize read provider, using user provider:',
        error,
      );
      // Already initialized with user provider as fallback
      this.isInitialized = true;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeReadProvider();
    }
  }

  private async graphqlRequest<T>(query: string, variables?: any): Promise<T> {
    const headers = {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_THEGRAPH_API_KEY}`,
    };
    return await request(this.graphqlEndpoint, query, variables, headers);
  }

  private async retryOnRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isRateLimit =
          error?.code === 'BAD_DATA' &&
          error?.info?.payload?.method === 'eth_call' &&
          error?.value?.some?.((err: any) => err.code === -32005);

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(
            `[PoolRepository] Rate limit hit for ${operationName}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Max retries exceeded for ${operationName}`);
  }

  async getPoolById(id: string): Promise<Pool> {
    try {
      await this.ensureInitialized();

      // Retry logic for rate limiting
      const operation = await this.retryOnRateLimit(
        () => this.readContract.getOperation(id),
        `getOperation for pool ${id}`,
      );

      if (
        !operation ||
        operation.id === ethers.ZeroHash ||
        operation.token === ethers.ZeroAddress
      ) {
        throw new Error(`Pool with id ${id} not found`);
      }

      return this.mapContractOperationToPool(operation);
    } catch (error) {
      console.error(
        `[PoolRepository.getPoolById] Error fetching pool ${id}:`,
        error,
      );
      throw new Error(
        `Failed to fetch pool ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPoolStakeHistory(poolId: string): Promise<StakeEvent[]> {
    try {
      const response: { stakeds: any[] } = await this.graphqlRequest(
        STAKED_EVENTS_QUERY,
        { operationId: poolId },
      );

      return response.stakeds.map((event) => ({
        poolId,
        stakerAddress: event.user as Address,
        amount: event.amount,
        timestamp: Number(event.time),
        transactionHash: event.transactionHash,
      }));
    } catch (error) {
      console.error(
        `[PoolRepository.getPoolStakeHistory] Error fetching staked events for pool ${poolId}:`,
        error,
      );
      return [];
    }
  }

  async findPoolsByInvestor(investorAddress: Address): Promise<Pool[]> {
    try {
      // Use GraphQL to get staked events by user
      const response: { stakeds: any[] } = await this.graphqlRequest(
        STAKED_EVENTS_BY_USER_QUERY,
        { user: investorAddress },
      );

      // Get unique pool IDs
      const poolIds = [
        ...new Set(response.stakeds.map((event) => event.operationId)),
      ].filter((id) => id);

      // Fetch all pools
      const pools = await Promise.all(
        poolIds.map((id) => this.getPoolById(id)),
      );

      return pools.filter((pool: any) => pool !== null);
    } catch (error) {
      console.error(
        `[PoolRepository.findPoolsByInvestor] Error fetching pools for investor ${investorAddress}:`,
        error,
      );
      throw new Error(
        `Failed to fetch pools for investor ${investorAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findPoolsByProvider(providerAddress: Address): Promise<Pool[]> {
    try {
      // Use GraphQL to get operation created events
      const response: { operationCreateds: any[] } = await this.graphqlRequest(
        OPERATION_CREATED_QUERY,
      );

      // Fetch all pools and filter by provider
      const pools = await Promise.all(
        response.operationCreateds.map((event) =>
          this.getPoolById(event.operationId),
        ),
      );

      return pools.filter(
        (pool: any) =>
          pool !== null && pool.providerAddress === providerAddress,
      );
    } catch (error) {
      console.error(
        `[PoolRepository.findPoolsByProvider] Error fetching pools for provider ${providerAddress}:`,
        error,
      );
      throw new Error(
        `Failed to fetch pools for provider ${providerAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getAllPools(): Promise<Pool[]> {
    try {
      // Use GraphQL to get all operation created events
      const response: { operationCreateds: any[] } = await this.graphqlRequest(
        OPERATION_CREATED_QUERY,
      );

      // Fetch all pools
      const pools = await Promise.all(
        response.operationCreateds.map((event) =>
          this.getPoolById(event.operationId),
        ),
      );

      return pools.filter((pool: any) => pool !== null);
    } catch (error) {
      console.error(
        `[PoolRepository.getAllPools] Error fetching all pools:`,
        error,
      );
      throw new Error(
        `Failed to fetch all pools: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPoolWithDynamicData(
    id: string,
  ): Promise<(Pool & PoolDynamicData) | null> {
    try {
      const pool = await this.getPoolById(id);
      const stakeHistory = await this.getPoolStakeHistory(id);
      const dynamicData = await this.calculatePoolDynamicData(
        pool,
        stakeHistory,
      );

      return { ...pool, ...dynamicData };
    } catch (error) {
      console.error(
        `[PoolRepository.getPoolWithDynamicData] Error fetching pool with dynamic data ${id}:`,
        error,
      );
      return null;
    }
  }

  async getAllPoolsWithDynamicData(): Promise<(Pool & PoolDynamicData)[]> {
    try {
      const pools = await this.getAllPools();

      const poolsWithDynamicData = await Promise.all(
        pools.map(async (pool) => {
          const stakeHistory = await this.getPoolStakeHistory(pool.id);
          const dynamicData = await this.calculatePoolDynamicData(
            pool,
            stakeHistory,
          );
          return { ...pool, ...dynamicData };
        }),
      );

      return poolsWithDynamicData;
    } catch (error) {
      console.error(
        `[PoolRepository.getAllPoolsWithDynamicData] Error fetching all pools with dynamic data:`,
        error,
      );
      throw new Error(
        `Failed to fetch all pools with dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getUserPoolsWithDynamicData(
    stakerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]> {
    try {
      const pools = await this.findPoolsByInvestor(stakerAddress);

      const poolsWithDynamicData = await Promise.all(
        pools.map(async (pool) => {
          const stakeHistory = await this.getPoolStakeHistory(pool.id);
          const dynamicData = await this.calculatePoolDynamicData(
            pool,
            stakeHistory,
          );
          return { ...pool, ...dynamicData };
        }),
      );

      return poolsWithDynamicData;
    } catch (error) {
      console.error(
        `[PoolRepository.getUserPoolsWithDynamicData] Error fetching user pools with dynamic data:`,
        error,
      );
      throw new Error(
        `Failed to fetch user pools with dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getProviderPoolsWithDynamicData(
    providerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]> {
    try {
      const pools = await this.findPoolsByProvider(providerAddress);

      const poolsWithDynamicData = await Promise.all(
        pools.map(async (pool) => {
          const stakeHistory = await this.getPoolStakeHistory(pool.id);
          const dynamicData = await this.calculatePoolDynamicData(
            pool,
            stakeHistory,
          );
          return { ...pool, ...dynamicData };
        }),
      );

      return poolsWithDynamicData;
    } catch (error) {
      console.error(
        `[PoolRepository.getProviderPoolsWithDynamicData] Error fetching provider pools with dynamic data:`,
        error,
      );
      throw new Error(
        `Failed to fetch provider pools with dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
            grouped.hourly[key] = (
              BigInt(grouped.hourly[key] || '0') + BigInt(stake.amount)
            ).toString();
            break;
          case '1D':
            key = date.toISOString().substring(0, 10); // YYYY-MM-DD
            if (!grouped.daily) grouped.daily = {};
            grouped.daily[key] = (
              BigInt(grouped.daily[key] || '0') + BigInt(stake.amount)
            ).toString();
            break;
          case '1W':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().substring(0, 10);
            if (!grouped.weekly) grouped.weekly = {};
            grouped.weekly[key] = (
              BigInt(grouped.weekly[key] || '0') + BigInt(stake.amount)
            ).toString();
            break;
          case '1M':
            key = date.toISOString().substring(0, 7); // YYYY-MM
            if (!grouped.monthly) grouped.monthly = {};
            grouped.monthly[key] = (
              BigInt(grouped.monthly[key] || '0') + BigInt(stake.amount)
            ).toString();
            break;
          case '1Y':
            key = date.toISOString().substring(0, 4); // YYYY
            if (!grouped.yearly) grouped.yearly = {};
            grouped.yearly[key] = (
              BigInt(grouped.yearly[key] || '0') + BigInt(stake.amount)
            ).toString();
            break;
        }
      }

      return grouped;
    } catch (error) {
      console.error(
        `[PoolRepository.getGroupedStakeHistory] Error grouping stake history:`,
        error,
      );
      throw new Error(
        `Failed to group stake history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async calculatePoolDynamicData(
    pool: Pool,
    stakeHistory?: StakeEvent[],
  ): Promise<PoolDynamicData> {
    try {
      const history = stakeHistory || (await this.getPoolStakeHistory(pool.id));

      // Calculate current time and pool end time
      const currentTime = Math.floor(Date.now() / 1000);
      const poolEndTime = pool.startDate + pool.durationDays * 24 * 60 * 60;

      // Calculate progress percentage
      const fundingProgress =
        (BigInt(pool.totalValueLocked) * BigInt(100)) /
        BigInt(pool.fundingGoal);
      const timeProgress = Math.min(
        100,
        Math.max(
          0,
          ((currentTime - pool.startDate) / (poolEndTime - pool.startDate)) *
            100,
        ),
      );

      // Calculate time remaining
      const timeRemainingSeconds = Math.max(0, poolEndTime - currentTime);

      // Calculate 24h volume
      const oneDayAgo = currentTime - 24 * 60 * 60;
      const volume24h = history
        .filter((stake) => stake.timestamp >= oneDayAgo)
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
        volumeChangePercentage: '+0.0%', // Would need historical data to calculate
        apy,
        tvlFormatted,
        fundingGoalFormatted,
        rewardFormatted,
      };
    } catch (error) {
      console.error(
        `[PoolRepository.calculatePoolDynamicData] Error calculating dynamic data:`,
        error,
      );
      throw new Error(
        `Failed to calculate dynamic data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapContractOperationToPool(
    operation: AuStakeContract.OperationStructOutput,
  ): Pool {
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
      totalValueLocked: operation.tokenTvl?.toString() || '0',
      startDate: currentTime, // Contract doesn't store start date, using current time
      durationDays: Math.ceil((deadline - currentTime) / (24 * 60 * 60)),
      rewardRate: Number(operation.reward) / 100, // Assuming reward is in basis points
      assetPrice: operation.assetPrice.toString(), // Asset price from contract
      status,
    };
  }

  private formatCurrency(value: BigNumberString): string {
    const num = parseFloat(ethers.formatEther(value));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  // Additional methods required by IPoolRepository interface
  async getAllPoolIds(): Promise<string[]> {
    try {
      // Use GraphQL to get all operation created events
      const response: { operationCreateds: any[] } = await this.graphqlRequest(
        OPERATION_CREATED_QUERY,
      );

      return response.operationCreateds
        .map((event) => event.operationId)
        .filter((id) => id) as string[];
    } catch (error) {
      console.error(
        `[PoolRepository.getAllPoolIds] Error fetching pool IDs:`,
        error,
      );
      throw new Error(
        `Failed to fetch pool IDs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findPoolsByStaker(stakerAddress: Address): Promise<Pool[]> {
    return this.findPoolsByInvestor(stakerAddress);
  }

  async getTokenDecimals(tokenAddress: Address): Promise<number> {
    try {
      await this.ensureInitialized();
      // Create ERC20 contract instance
      const erc20Abi = ['function decimals() view returns (uint8)'];
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        this.readProvider,
      );

      const decimals = await tokenContract.decimals();
      return Number(decimals);
    } catch (error) {
      console.error(
        `[PoolRepository.getTokenDecimals] Error fetching decimals for token ${tokenAddress}:`,
        error,
      );
      // Default to 18 decimals if unable to fetch
      return 18;
    }
  }
}
