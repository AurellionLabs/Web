// @ts-nocheck - File with type issues that need deeper refactoring
import {
  IPoolService,
  IPoolRepository,
  PoolCreationData,
  Address,
  BigNumberString,
  Pool,
  PoolDynamicData,
  StakeEvent,
  GroupedStakes,
} from '@/domain/pool';
import {
  RWYStakingFacet__factory,
  type RWYStakingFacet as RWYStakingFacetContract,
} from '@/lib/contracts';
import { ContractTransactionResponse, ethers, Provider, Signer } from 'ethers';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

/**
 * Business logic service for Pool operations.
 * Handles smart contract interactions for pool creation, staking, and reward management.
 */
export class PoolService implements IPoolService {
  private contract: RWYStakingFacetContract;
  private signer: Signer;
  private provider: Provider;
  private repositoryContext: RepositoryContext;

  constructor(
    provider: Provider,
    signer: Signer,
    repositoryContext: RepositoryContext,
    contractAddress: string = NEXT_PUBLIC_DIAMOND_ADDRESS,
  ) {
    if (!contractAddress) {
      throw new Error('[PoolService] Pool contract address is undefined');
    }
    this.provider = provider;
    this.signer = signer;
    this.repositoryContext = repositoryContext;
    this.contract = RWYStakingFacet__factory.connect(contractAddress, signer);
  }

  async createPool(
    data: PoolCreationData,
    creatorAddress: Address,
  ): Promise<{ poolId: string; transactionHash: string }> {
    try {
      // Validate input data
      this.validatePoolCreationData(data);

      // Convert duration to deadline timestamp (7 days from now for funding deadline)
      const fundingDeadline = BigInt(
        Math.floor(Date.now() / 1000) + data.durationDays * 24 * 60 * 60,
      );

      const txResponse: ContractTransactionResponse =
        await this.contract.createOpportunity(
          data.name,
          data.description,
          data.tokenAddress,
          0, // inputTokenId - not used for ERC20
          BigInt(data.fundingGoal),
          ethers.ZeroAddress, // outputToken - not known at creation
          0, // expectedOutputAmount - not known at creation
          BigInt(data.rewardRate), // promisedYieldBps
          BigInt(data.operatorFeeBps || 500), // operatorFeeBps - default 5%
          BigInt(data.minSalePrice), // minSalePrice - required
          BigInt(data.durationDays), // fundingDays
          BigInt(data.processingDays || data.durationDays), // processingDays - defaults to duration
          data.tokenAddress, // collateralToken - defaults to input token
          0, // collateralTokenId - ERC20 mode
          BigInt(data.collateralAmount), // collateralAmount - required
        );
      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for pool creation');
      }

      // Extract pool ID from OpportunityCreated event
      const poolId = await this.extractPoolIdFromReceipt(txReceipt);

      return {
        poolId,
        transactionHash: txReceipt.hash,
      };
    } catch (error) {
      console.error('[PoolService.createPool] Error creating pool:', error);
      throw new Error(
        `Failed to create pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async closePool(poolId: string, providerAddress: Address): Promise<string> {
    try {
      // Validate that the caller is the provider
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== providerAddress.toLowerCase()) {
        throw new Error('Only the pool provider can close the pool');
      }

      // Use unlockReward as a proxy for closing in RWYStakingFacet
      const txResponse = await this.contract.unlockReward(poolId);

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for pool closing');
      }

      return txReceipt.hash;
    } catch (error) {
      console.error('[PoolService.closePool] Error closing pool:', error);
      throw new Error(
        `Failed to close pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async stake(
    poolId: string,
    amount: BigNumberString,
    investorAddress: Address,
  ): Promise<string> {
    try {
      // Convert decimal amount to wei and validate
      const amountInWei = ethers.parseEther(amount);
      if (!amount || amountInWei <= 0) {
        throw new Error('Invalid stake amount');
      }

      // Validate that the caller is the investor
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== investorAddress.toLowerCase()) {
        throw new Error('Signer must match investor address');
      }

      // Get opportunity information to determine token address
      const opportunity = await this.contract.getOpportunity(poolId);
      if (!opportunity || opportunity.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const tokenAddress = opportunity.inputToken;

      // Handle ERC20 approval
      await this.handleTokenApproval(tokenAddress, amountInWei.toString());

      // Execute stake transaction - stake(bytes32 opportunityId, uint256 amount)
      const txResponse = await this.contract.stake(poolId, amountInWei);

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for stake');
      }

      return txReceipt.hash;
    } catch (error) {
      console.error('[PoolService.stake] Error staking:', error);
      throw new Error(
        `Failed to stake: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async claimReward(poolId: string, address: Address): Promise<string> {
    try {
      // Validate that the caller is the claimant
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signer must match claimant address');
      }

      // Execute claim reward transaction - claimProfits(bytes32 opportunityId)
      const txResponse = await this.contract.claimProfits(poolId);

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for claim reward');
      }

      return txReceipt.hash;
    } catch (error) {
      console.error('[PoolService.claimReward] Error claiming reward:', error);
      throw new Error(
        `Failed to claim reward: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async unlockReward(
    poolId: string,
    providerAddress: Address,
  ): Promise<string> {
    try {
      // Validate that the caller is the provider
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== providerAddress.toLowerCase()) {
        throw new Error('Only the pool provider can unlock rewards');
      }

      // Get opportunity information
      const opportunity = await this.contract.getOpportunity(poolId);
      if (!opportunity || opportunity.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const tokenAddress = opportunity.inputToken;

      // Calculate total rewards needed (simplified calculation)
      // In RWYStakingFacet, the reward calculation may differ
      const totalRewardsNeeded = opportunity.targetAmount;

      console.log(
        '[PoolService.unlockReward] Approving tokens for reward unlock:',
        {
          tokenAddress,
          totalRewardsNeeded: totalRewardsNeeded.toString(),
          poolId,
        },
      );

      // Handle ERC20 approval for the reward amount
      await this.handleTokenApproval(
        tokenAddress,
        totalRewardsNeeded.toString(),
      );

      // Execute unlock reward transaction
      const txResponse = await this.contract.unlockReward(poolId);

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for unlock reward');
      }

      return txReceipt.hash;
    } catch (error) {
      console.error(
        '[PoolService.unlockReward] Error unlocking reward:',
        error,
      );
      throw new Error(
        `Failed to unlock reward: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Business logic methods that combine repository calls with calculations
  async getPoolWithDynamicData(
    id: string,
  ): Promise<(Pool & PoolDynamicData) | null> {
    const poolRepository = this.repositoryContext.getPoolRepository();
    const pool = await poolRepository.getPoolById(id);
    if (!pool) return null;

    const stakeHistory = await poolRepository.getPoolStakeHistory(id);
    const dynamicData = await this.calculatePoolDynamicData(pool, stakeHistory);

    return { ...pool, ...dynamicData };
  }

  async getAllPoolsWithDynamicData(): Promise<(Pool & PoolDynamicData)[]> {
    const poolRepository = this.repositoryContext.getPoolRepository();
    const pools = await poolRepository.getAllPools();

    const poolsWithDynamicData = await Promise.all(
      pools.map(async (pool) => {
        const stakeHistory = await poolRepository.getPoolStakeHistory(pool.id);
        const dynamicData = await this.calculatePoolDynamicData(
          pool,
          stakeHistory,
        );
        return { ...pool, ...dynamicData };
      }),
    );

    return poolsWithDynamicData;
  }

  async getUserPoolsWithDynamicData(
    stakerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]> {
    const poolRepository = this.repositoryContext.getPoolRepository();
    const pools = await poolRepository.findPoolsByInvestor(stakerAddress);

    const poolsWithDynamicData = await Promise.all(
      pools.map(async (pool: Pool) => {
        const stakeHistory = await poolRepository.getPoolStakeHistory(pool.id);
        const dynamicData = await this.calculatePoolDynamicData(
          pool,
          stakeHistory,
        );
        return { ...pool, ...dynamicData };
      }),
    );

    return poolsWithDynamicData;
  }

  async getProviderPoolsWithDynamicData(
    providerAddress: Address,
  ): Promise<(Pool & PoolDynamicData)[]> {
    const poolRepository = this.repositoryContext.getPoolRepository();
    const pools = await poolRepository.findPoolsByProvider(providerAddress);

    const poolsWithDynamicData = await Promise.all(
      pools.map(async (pool) => {
        const stakeHistory = await poolRepository.getPoolStakeHistory(pool.id);
        const dynamicData = await this.calculatePoolDynamicData(
          pool,
          stakeHistory,
        );
        return { ...pool, ...dynamicData };
      }),
    );

    return poolsWithDynamicData;
  }

  async getGroupedStakeHistory(
    poolId: string,
    interval: '1H' | '1D' | '1W' | '1M' | '1Y',
  ): Promise<GroupedStakes> {
    const poolRepository = this.repositoryContext.getPoolRepository();
    const stakeHistory = await poolRepository.getPoolStakeHistory(poolId);

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
  }

  async calculatePoolDynamicData(
    pool: Pool,
    stakeHistory?: StakeEvent[],
  ): Promise<PoolDynamicData> {
    const poolRepository = this.repositoryContext.getPoolRepository();
    const history =
      stakeHistory || (await poolRepository.getPoolStakeHistory(pool.id));

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
      console.error('funding goal is zero');
    }

    // Calculate time remaining
    const timeRemainingSeconds = Math.max(0, poolEndTime - currentTime);

    // Calculate 24h volume
    const oneDayAgo = currentTime - 24 * 60 * 60;
    const volume24h = history
      .filter((stake) => stake.timestamp >= oneDayAgo)
      .reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0))
      .toString();

    // Calculate 48h volume for comparison (if we have enough history)
    const twoDaysAgo = currentTime - 48 * 60 * 60;
    const volume48h = history
      .filter(
        (stake) => stake.timestamp >= twoDaysAgo && stake.timestamp < oneDayAgo,
      )
      .reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0));

    // Calculate volume change percentage
    let volumeChangePercentage = '+0.0%';
    if (volume48h > 0) {
      const change =
        ((BigInt(volume24h) - volume48h) * BigInt(10000)) / volume48h;
      const changePercent = Number(change) / 100;
      volumeChangePercentage =
        changePercent >= 0
          ? `+${changePercent.toFixed(1)}%`
          : `${changePercent.toFixed(1)}%`;
    }

    // Calculate APY (simplified calculation)

    return {
      progressPercentage: Math.min(100, fundingProgress),
      timeRemainingSeconds,
      volume24h,
      volumeChangePercentage,
      rewardRate: pool.rewardRate,
      tvl: pool.totalValueLocked,
      fundingGoal: pool.fundingGoal,
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

  private validatePoolCreationData(data: PoolCreationData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Pool name is required');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Pool description is required');
    }
    if (!data.assetName || data.assetName.trim().length === 0) {
      throw new Error('Asset name is required');
    }
    if (!data.tokenAddress || !ethers.isAddress(data.tokenAddress)) {
      throw new Error('Valid token address is required');
    }
    if (!data.fundingGoal || BigInt(data.fundingGoal) <= 0) {
      throw new Error('Funding goal must be greater than 0');
    }
    if (!data.assetPrice || BigInt(data.assetPrice) <= 0) {
      throw new Error('Asset price must be greater than 0');
    }
    if (!data.durationDays || data.durationDays <= 0) {
      throw new Error('Duration must be greater than 0 days');
    }
    if (data.rewardRate < 0 || data.rewardRate > 10000) {
      throw new Error(
        'Reward rate must be between 0 and 10000 basis points (0-100%)',
      );
    }
  }

  private async handleTokenApproval(
    tokenAddress: string,
    amount: BigNumberString,
  ): Promise<void> {
    try {
      // Create ERC20 contract instance
      const erc20Abi = [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
      ];
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        this.signer,
      );

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(
        await this.signer.getAddress(),
        await this.contract.getAddress(),
      );

      // Approve if insufficient allowance
      if (BigInt(currentAllowance.toString()) < BigInt(amount)) {
        const approveTx = await tokenContract.approve(
          await this.contract.getAddress(),
          amount,
        );
        await approveTx.wait();
      }
    } catch (error) {
      console.error(
        '[PoolService.handleTokenApproval] Error handling token approval:',
        error,
      );
      throw new Error(
        `Failed to approve token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async extractPoolIdFromReceipt(txReceipt: any): Promise<string> {
    try {
      // Look for OpportunityCreated event
      const eventSignature =
        this.contract.interface.getEvent('OpportunityCreated').topicHash;
      const eventLog = txReceipt.logs?.find(
        (log: any) => log.topics[0] === eventSignature,
      );

      if (eventLog) {
        const parsedLog = this.contract.interface.parseLog(eventLog);
        if (parsedLog && parsedLog.args.id) {
          return parsedLog.args.id;
        }
      }

      throw new Error('Could not extract pool ID from transaction receipt');
    } catch (error) {
      console.error(
        '[PoolService.extractPoolIdFromReceipt] Error extracting pool ID:',
        error,
      );
      throw new Error(
        `Failed to extract pool ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
