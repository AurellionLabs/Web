// @ts-nocheck - File with type issues that need deeper refactoring
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
  AuStake__factory,
  type AuStake as AuStakeContract,
} from '@/lib/contracts';
import {
  BigNumberish,
  BytesLike,
  ethers,
  Contract,
  Provider,
  Signer,
} from 'ethers';
import {
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_INDEXER_URL,
} from '@/chain-constants';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { readContract } from 'viem/actions';
import { gql, request } from 'graphql-request';
import {
  GET_COMMODITY_STAKED_EVENTS,
  GET_COMMODITY_STAKED_BY_STAKER,
  GET_OPPORTUNITY_CREATED_EVENTS,
  GET_PROFIT_DISTRIBUTED_EVENTS,
  GET_PROFIT_BY_STAKER,
  type CommodityStakedEventsResponse,
  type OpportunityCreatedEventsResponse,
  type ProfitDistributedEventsResponse,
} from '@/infrastructure/shared/graph-queries';
import { formatWeiToCurrency } from '@/lib/utils';
import NodeCache from 'node-cache';

// ABI for RWYStakingFacet's getOpportunity function on the Diamond
// Must match RWYStorage.Opportunity struct exactly
const RWY_STAKING_ABI = [
  'function getOpportunity(bytes32 opportunityId) view returns (tuple(bytes32 id, address operator, string name, string description, address inputToken, uint256 inputTokenId, uint256 targetAmount, uint256 stakedAmount, address outputToken, uint256 outputTokenId, uint256 expectedOutputAmount, uint256 promisedYieldBps, uint256 operatorFeeBps, uint256 minSalePrice, uint256 fundingDeadline, uint256 processingDeadline, uint256 createdAt, uint256 fundedAt, uint256 completedAt, uint8 status, tuple(address token, uint256 tokenId, uint256 amount) collateral))',
];

/**
 * Blockchain-based implementation of IPoolRepository.
 * Handles all data persistence and retrieval operations for Pools via smart contract interaction.
 * Uses dedicated RPC for read operations and user's signer for write operations.
 */
export class PoolRepository implements IPoolRepository {
  private readContract: AuStakeContract;
  private writeContract: AuStakeContract;
  private diamondContract: Contract; // For RWY opportunities on Diamond
  private signer: Signer;
  private readProvider: Provider;
  private userProvider: Provider;
  private contractAddress: string;
  private diamondAddress: string;
  private isInitialized = false;
  private graphqlEndpoint = NEXT_PUBLIC_INDEXER_URL;

  // NodeCache for GraphQL responses (30 second TTL)
  private cache = new NodeCache({
    stdTTL: 30, // 30 seconds default TTL
    checkperiod: 10, // Check for expired keys every 10 seconds
    useClones: false, // Don't clone objects for better performance
  });

  // Rate limiting protection
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second minimum between requests

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
    this.diamondAddress = NEXT_PUBLIC_DIAMOND_ADDRESS;

    // Initialize with user provider as fallback
    this.readProvider = userProvider;
    this.readContract = AuStake__factory.connect(contractAddress, userProvider);
    this.writeContract = AuStake__factory.connect(contractAddress, signer);

    // Initialize Diamond contract for RWY opportunities
    this.diamondContract = new Contract(
      this.diamondAddress,
      RWY_STAKING_ABI,
      userProvider,
    );

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

      // Update Diamond contract with dedicated RPC provider
      this.diamondContract = new Contract(
        this.diamondAddress,
        RWY_STAKING_ABI,
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

  private getCacheKey(query: string, variables?: any): string {
    return JSON.stringify({ query, variables });
  }

  private getFromCache<T>(key: string): T | null {
    const cachedData = this.cache.get<T>(key);
    if (cachedData) {
      console.log(
        '[PoolRepository] Cache HIT for:',
        key.substring(0, 50) + '...',
      );
      return cachedData;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, data);
    console.log(
      '[PoolRepository] Cached response, total cache entries:',
      this.cache.keys().length,
    );
  }

  // Debug methods for cache management
  public clearCache(): void {
    this.cache.flushAll();
    console.log('[PoolRepository] Cache cleared');
  }

  public getCacheStats(): { size: number; keys: string[] } {
    const keys = this.cache.keys();
    return {
      size: keys.length,
      keys: keys.map(
        (key) => key.substring(0, 100) + (key.length > 100 ? '...' : ''),
      ),
    };
  }

  private async graphqlRequest<T>(query: string, variables?: any): Promise<T> {
    const cacheKey = this.getCacheKey(query, variables);

    // Try to get from cache first
    const cached = this.getFromCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    console.log('[PoolRepository] Cache MISS, making GraphQL request...');

    // Rate limiting protection - ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(
        `[PoolRepository] Rate limiting: waiting ${waitTime}ms before request`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const apiKey = process.env.NEXT_PUBLIC_THEGRAPH_API_KEY;
    console.log('[PoolRepository] API Key Debug:', {
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) + '...',
      endpoint: this.graphqlEndpoint,
    });

    const headers = {
      Authorization: `Bearer ${apiKey}`,
    };

    try {
      this.lastRequestTime = Date.now();
      const result = await request<T>(
        this.graphqlEndpoint,
        query,
        variables,
        headers,
      );

      // Cache the successful result
      this.setCache<T>(cacheKey, result);
      console.log('[PoolRepository] ✅ Successfully cached GraphQL response');

      return result;
    } catch (error) {
      console.error('[PoolRepository] ❌ GraphQL request failed:', error);

      // Log specific error details for 429 errors
      if (error instanceof Error && error.message.includes('429')) {
        console.error(
          '[PoolRepository] Rate limit error - API key might be invalid or quota exceeded',
        );
      }

      throw error;
    }
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

      // First try to fetch from Diamond (RWY opportunities)
      try {
        const opportunity = await this.retryOnRateLimit(
          () => this.diamondContract.getOpportunity(id),
          `getOpportunity for pool ${id}`,
        );

        if (
          opportunity &&
          opportunity.id !== ethers.ZeroHash &&
          opportunity.operator !== ethers.ZeroAddress
        ) {
          console.log(
            `[PoolRepository.getPoolById] Found RWY opportunity on Diamond: ${id}`,
          );
          return this.mapDiamondOpportunityToPool(opportunity);
        }
      } catch (diamondError: any) {
        // If Diamond call fails, fall back to legacy AuStake contract
        console.log(
          `[PoolRepository.getPoolById] Diamond lookup failed for ${id}, trying legacy AuStake:`,
          diamondError?.message || diamondError,
        );
      }

      // Fall back to legacy AuStake contract
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
      const response = await this.graphqlRequest<CommodityStakedEventsResponse>(
        GET_COMMODITY_STAKED_EVENTS,
        { limit: 100 },
      );

      const items = response.diamondCommodityStakedEventss?.items || [];

      // Filter by opportunity_id (poolId)
      const filteredItems = items.filter(
        (event) => event.opportunity_id?.toLowerCase() === poolId.toLowerCase(),
      );

      return filteredItems.map((event) => ({
        poolId,
        stakerAddress: event.staker as Address,
        amount: event.amount,
        timestamp: Number(event.block_timestamp),
        transactionHash: event.transaction_hash,
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
      const response = await this.graphqlRequest<CommodityStakedEventsResponse>(
        GET_COMMODITY_STAKED_BY_STAKER,
        { staker: investorAddress, limit: 100 },
      );

      const items = response.diamondCommodityStakedEventss?.items || [];

      // Get unique opportunity IDs (pool IDs)
      const poolIds = [
        ...new Set(items.map((event) => event.opportunity_id)),
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
      const response =
        await this.graphqlRequest<OpportunityCreatedEventsResponse>(
          GET_OPPORTUNITY_CREATED_EVENTS,
          { limit: 100 },
        );

      const items = response.diamondOpportunityCreatedEventss?.items || [];

      // Filter by operator (provider)
      const providerItems = items.filter(
        (event) =>
          event.operator?.toLowerCase() === providerAddress.toLowerCase(),
      );

      // Fetch all pools
      const pools = await Promise.all(
        providerItems.map((event) => this.getPoolById(event.event_id)),
      );

      return pools.filter((pool: any) => pool !== null);
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
      const response =
        await this.graphqlRequest<OpportunityCreatedEventsResponse>(
          GET_OPPORTUNITY_CREATED_EVENTS,
          { limit: 100 },
        );

      const items = response.diamondOpportunityCreatedEventss?.items || [];

      if (items.length === 0) {
        console.log('[PoolRepository] No opportunities found');
        return [];
      }

      // Fetch all pools
      const pools = await Promise.all(
        items.map((event) => this.getPoolById(event.event_id)),
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

      // Calculate progress percentage with division by zero protection
      let fundingProgress = 0;
      if (BigInt(pool.fundingGoal) > 0) {
        const progress =
          (BigInt(pool.totalValueLocked) * BigInt(10000)) /
          BigInt(pool.fundingGoal);
        fundingProgress = Number(progress) / 100; // Convert back from basis points for better precision
        console.log('funding goal is not zero', pool.fundingGoal);
      } else {
        console.error('warning funding goal is zero');
      }

      // Calculate time progress (now actually used)
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
      let volume24h: string = '0';
      try {
        volume24h = history
          .filter((stake) => stake.timestamp >= oneDayAgo)
          .reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0))
          .toString();
      } catch (e) {
        console.error('unable to calcate 24h volume');
      }

      // Calculate 48h volume for comparison (if we have enough history)
      const twoDaysAgo = currentTime - 48 * 60 * 60;

      let volume48h: bigint = BigInt(0);
      try {
        volume48h = history
          .filter(
            (stake) =>
              stake.timestamp >= twoDaysAgo && stake.timestamp < oneDayAgo,
          )
          .reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0));
      } catch (e) {
        console.error('unable to calcate 48h volume');
      }

      // Calculate volume change percentage
      let volumeChangePercentage = '+0.0%';
      if (volume48h > 0 && BigInt(volume24h) > 0) {
        const change =
          ((BigInt(volume24h) - volume48h) * BigInt(10000)) / volume48h;
        const changePercent = Number(change) / 100;
        volumeChangePercentage =
          changePercent >= 0
            ? `+${changePercent.toFixed(1)}%`
            : `${changePercent.toFixed(1)}%`;
      }

      // Calculate APY (simplified calculation)
      const apy = pool.rewardRate;

      // Format reward rate as percentage string
      const rewardFormatted = `${apy.toFixed(2)}%`;

      // Format values

      return {
        progressPercentage: Math.min(100, fundingProgress),
        timeRemainingSeconds,
        volume24h,
        volumeChangePercentage,
        rewardRate: pool.rewardRate,
        tvl: pool.totalValueLocked,
        fundingGoal: pool.fundingGoal,
        reward: rewardFormatted,
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
    const actualStartDate = Number(operation.startDate);

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
      startDate: actualStartDate, // Use actual start date from contract
      durationDays: Math.ceil((deadline - actualStartDate) / (24 * 60 * 60)), // Calculate original duration
      rewardRate: Number(operation.reward) / 100, // Assuming reward is in basis points
      assetPrice: operation.assetPrice.toString(), // Asset price from contract
      status,
    };
  }

  /**
   * Map Diamond RWY opportunity to Pool domain model
   */
  private mapDiamondOpportunityToPool(opportunity: any): Pool {
    const currentTime = Math.floor(Date.now() / 1000);
    const fundingDeadline = Number(opportunity.fundingDeadline);
    const createdAt = Number(opportunity.createdAt);
    const oppStatus = Number(opportunity.status);

    // Map RWY status to PoolStatus
    // RWY Status: 0=PENDING, 1=FUNDING, 2=FUNDED, 3=IN_TRANSIT, 4=PROCESSING, 5=SELLING, 6=DISTRIBUTING, 7=COMPLETED, 8=CANCELLED
    let status: PoolStatus;
    switch (oppStatus) {
      case 0: // PENDING
        status = PoolStatus.PENDING;
        break;
      case 1: // FUNDING
        status = PoolStatus.ACTIVE;
        break;
      case 2: // FUNDED
      case 3: // IN_TRANSIT
      case 4: // PROCESSING
      case 5: // SELLING
      case 6: // DISTRIBUTING
        status = PoolStatus.ACTIVE;
        break;
      case 7: // COMPLETED
        status = PoolStatus.COMPLETE;
        break;
      case 8: // CANCELLED
        status = PoolStatus.COMPLETE;
        break;
      default:
        status = PoolStatus.ACTIVE;
    }

    // Calculate duration in days from funding deadline
    const durationDays = Math.max(
      1,
      Math.ceil((fundingDeadline - createdAt) / (24 * 60 * 60)),
    );

    // Convert promisedYieldBps (basis points) to percentage for display
    // e.g., 1500 bps = 15%
    const rewardRatePercentage = (
      Number(opportunity.promisedYieldBps) / 100
    ).toFixed(2);

    return {
      id: opportunity.id,
      name: opportunity.name || 'Unnamed Opportunity',
      description: opportunity.description || '',
      assetName: 'RWY Asset',
      tokenAddress: opportunity.inputToken as Address,
      providerAddress: opportunity.operator as Address,
      fundingGoal: opportunity.targetAmount.toString(),
      totalValueLocked: opportunity.stakedAmount.toString(),
      startDate: createdAt,
      durationDays,
      rewardRate: parseFloat(rewardRatePercentage),
      assetPrice: opportunity.minSalePrice.toString(),
      status,
    };
  }

  // Additional methods required by IPoolRepository interface
  async getAllPoolIds(): Promise<string[]> {
    try {
      // Use GraphQL to get all opportunity created events
      const response: OpportunityCreatedEventsResponse =
        await this.graphqlRequest(GET_OPPORTUNITY_CREATED_EVENTS);

      const items = response.diamondOpportunityCreatedEventss?.items || [];

      return items
        .map((event) => event.event_id)
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
