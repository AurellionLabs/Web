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
          ethers.parseEther(data.fundingGoal), // Convert funding goal to wei (18 decimals)
          ethers.ZeroAddress, // outputToken - not known at creation
          0, // expectedOutputAmount - not known at creation
          BigInt(data.rewardRate), // promisedYieldBps
          BigInt(data.operatorFeeBps || 500), // operatorFeeBps - default 5%
          BigInt(data.minSalePrice), // minSalePrice in USD (no 18 decimals)
          BigInt(data.durationDays), // fundingDays
          BigInt(data.processingDays || data.durationDays), // processingDays - defaults to duration
          data.tokenAddress, // collateralToken - defaults to input token
          0, // collateralTokenId - ERC20 mode
          ethers.parseEther(data.collateralAmount), // Convert to wei (18 decimals)
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
      const amountInWei = ethers.parseEther(amount);
      if (!amount || amountInWei <= 0n) {
        throw new Error('Invalid stake amount');
      }

      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== investorAddress.toLowerCase()) {
        throw new Error('Signer must match investor address');
      }

      const opportunity = await this.contract.getOpportunity(poolId);
      if (!opportunity || opportunity.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const targetAmount = opportunity.targetAmount;
      const stakedAmount = opportunity.stakedAmount;
      const remainingCapacity = targetAmount - stakedAmount;

      if (amountInWei > remainingCapacity) {
        const remainingFormatted = ethers.formatEther(remainingCapacity);
        const requestedFormatted = ethers.formatEther(amountInWei);
        throw new Error(
          `Stake amount exceeds remaining pool capacity. Requested: ${requestedFormatted}, Remaining: ${remainingFormatted}`,
        );
      }

      const tokenAddress = opportunity.inputToken;
      const tokenId = Number(opportunity.inputTokenId);

      // Handle approval based on token type: ERC20 (tokenId == 0) or ERC1155 (tokenId > 0)
      if (tokenId === 0) {
        // ERC20 token - use standard approval
        await this.handleERC20ApprovalAndBalance(
          tokenAddress,
          amountInWei.toString(),
          signerAddress,
        );
      } else {
        // ERC1155 token - use setApprovalForAll
        await this.handleTokenApprovalAndBalance(
          tokenAddress,
          tokenId,
          amountInWei.toString(),
          signerAddress,
        );
      }

      const txResponse = await this.contract.stake(poolId, amountInWei);

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for stake');
      }

      return txReceipt.hash;
    } catch (error) {
      const decodedError = this.decodeStakeError(error);
      console.error('[PoolService.stake] Error staking:', decodedError.message);
      throw decodedError;
    }
  }

  async getPoolCapacity(poolId: string): Promise<{
    targetAmount: string;
    stakedAmount: string;
    remainingCapacity: string;
    fundingDeadline: number;
    status: number;
    isFunding: boolean;
  }> {
    try {
      const opportunity = await this.contract.getOpportunity(poolId);
      if (!opportunity || opportunity.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const targetAmount = opportunity.targetAmount;
      const stakedAmount = opportunity.stakedAmount;
      const remainingCapacity = targetAmount - stakedAmount;

      return {
        targetAmount: targetAmount.toString(),
        stakedAmount: stakedAmount.toString(),
        remainingCapacity: remainingCapacity.toString(),
        fundingDeadline: Number(opportunity.fundingDeadline),
        status: Number(opportunity.status),
        isFunding: Number(opportunity.status) === 1,
      };
    } catch (error) {
      console.error('[PoolService.getPoolCapacity] Error:', error);
      throw new Error(
        `Failed to get pool capacity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async validateStakeAmount(
    poolId: string,
    amount: BigNumberString,
  ): Promise<{
    isValid: boolean;
    error?: string;
    remainingCapacity?: string;
    userBalance?: string;
  }> {
    try {
      const amountInWei = ethers.parseEther(amount);
      if (!amount || amountInWei <= 0n) {
        return {
          isValid: false,
          error: 'Invalid stake amount',
        };
      }

      const capacity = await this.getPoolCapacity(poolId);

      if (!capacity.isFunding) {
        return {
          isValid: false,
          error:
            'Pool is not accepting stakes. The pool may be funded, cancelled, or already completed.',
          remainingCapacity: capacity.remainingCapacity,
        };
      }

      if (BigInt(Date.now() / 1000) >= BigInt(capacity.fundingDeadline)) {
        return {
          isValid: false,
          error: 'Pool funding deadline has passed',
          remainingCapacity: capacity.remainingCapacity,
        };
      }

      if (amountInWei > BigInt(capacity.remainingCapacity)) {
        const remainingFormatted = ethers.formatEther(
          capacity.remainingCapacity,
        );
        return {
          isValid: false,
          error: `Stake amount exceeds remaining pool capacity. Maximum stake: ${remainingFormatted}`,
          remainingCapacity: capacity.remainingCapacity,
        };
      }

      return {
        isValid: true,
        remainingCapacity: capacity.remainingCapacity,
      };
    } catch (error) {
      console.error('[PoolService.validateStakeAmount] Error:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private decodeStakeError(error: unknown): Error {
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes('execution reverted')) {
        const match = errorMessage.match(/data="([^"]+)"/);
        if (match) {
          const errorData = match[1];
          const decodedError = this.decodeCustomError(errorData);
          if (decodedError) {
            return new Error(decodedError);
          }
        }

        if (errorMessage.includes('ExceedsTarget')) {
          return new Error(
            'Stake amount exceeds the pool funding goal. Please reduce your stake amount.',
          );
        }
        if (errorMessage.includes('InvalidAmount')) {
          return new Error('Stake amount cannot be zero');
        }
        if (errorMessage.includes('InvalidStatus')) {
          return new Error(
            'Pool is not accepting stakes. The pool may be funded, cancelled, or already completed.',
          );
        }
        if (errorMessage.includes('FundingDeadlinePassed')) {
          return new Error(
            'Pool funding deadline has passed. You can no longer stake in this pool.',
          );
        }
      }

      if (
        errorMessage.includes('ERC1155') ||
        errorMessage.includes('insufficient balance') ||
        errorMessage.includes('balance is')
      ) {
        return new Error(
          'Insufficient token balance. Please ensure you have enough tokens and they are approved for transfer.',
        );
      }

      return error;
    }

    return new Error('An unknown error occurred during staking');
  }

  private decodeCustomError(errorData: string): string | null {
    try {
      const errorSelectors: Record<string, string> = {
        '0x173b6d49':
          'ExceedsTarget - Stake amount exceeds remaining pool capacity',
        '0x4ec3b05f': 'InvalidStatus - Pool is not in FUNDING status',
        '0x36bdf1cd':
          'FundingDeadlinePassed - Pool funding deadline has passed',
        '0x6c231bdb': 'InvalidAmount - Stake amount cannot be zero',
        '0x08c379a0': 'Error(string) - Check error message for details',
      };

      for (const [selector, description] of Object.entries(errorSelectors)) {
        if (errorData.startsWith(selector)) {
          return description;
        }
      }

      if (errorData.startsWith('0x08c379a0')) {
        const abiCoder = new ethers.AbiCoder();
        try {
          const decoded = abiCoder.decode(
            ['string'],
            '0x' + errorData.slice(10),
          );
          return `Contract error: ${decoded[0]}`;
        } catch {
          return 'Contract reverted with an error';
        }
      }

      return null;
    } catch {
      return null;
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
      // Convert TVL from wei tokens to USD using assetPrice
      const assetPriceUsd = parseFloat(pool.assetPrice) || 0;
      const tvlWei = BigInt(pool.totalValueLocked);
      const tvlInUsd =
        assetPriceUsd > 0 ? (Number(tvlWei) / 1e18) * assetPriceUsd : 0;
      const progress = (tvlInUsd * 10000) / parseFloat(pool.fundingGoal);
      fundingProgress = progress / 100;
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

    // Format reward rate as percentage string
    const rewardFormatted = `${pool.rewardRate.toFixed(2)}%`;

    return {
      progressPercentage: Math.min(100, fundingProgress),
      timeRemainingSeconds,
      volume24h,
      volumeChangePercentage,
      tvl: pool.totalValueLocked,
      fundingGoal: pool.fundingGoal,
      reward: pool.rewardRate,
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
    if (Number(data.rewardRate) < 0 || Number(data.rewardRate) > 10000) {
      throw new Error(
        'Reward rate must be between 0 and 10000 basis points (0-100%)',
      );
    }
  }

  /**
   * Handle ERC20 token approval and balance check for staking
   */
  private async handleERC20ApprovalAndBalance(
    tokenAddress: string,
    amount: BigNumberString,
    userAddress: string,
  ): Promise<void> {
    try {
      const erc20Abi = [
        'function balanceOf(address account) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
      ];

      const erc20Contract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        this.signer,
      );

      // Check balance
      const balance = await erc20Contract.balanceOf(userAddress);
      if (BigInt(balance.toString()) < BigInt(amount)) {
        const balanceFormatted = ethers.formatEther(balance.toString());
        const amountFormatted = ethers.formatEther(amount);
        throw new Error(
          `Insufficient token balance. Your balance: ${balanceFormatted}, Requested: ${amountFormatted}`,
        );
      }

      // Check allowance and approve if needed
      const contractAddress = await this.contract.getAddress();
      const currentAllowance = await erc20Contract.allowance(
        userAddress,
        contractAddress,
      );

      if (BigInt(currentAllowance.toString()) < BigInt(amount)) {
        const approveTx = await erc20Contract.approve(
          contractAddress,
          ethers.MaxUint256, // Approve unlimited for convenience
        );
        await approveTx.wait();
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Insufficient token balance')
      ) {
        throw error;
      }
      console.error(
        '[PoolService.handleERC20ApprovalAndBalance] Error:',
        error,
      );
      throw new Error(
        `Failed to verify ERC20 token approval and balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle ERC1155 token approval and balance check for staking
   */
  private async handleTokenApprovalAndBalance(
    tokenAddress: string,
    tokenId: number,
    amount: BigNumberString,
    userAddress: string,
  ): Promise<void> {
    try {
      const erc1155Abi = [
        'function balanceOf(address account, uint256 id) view returns (uint256)',
        'function isApprovedForAll(address account, address operator) view returns (bool)',
        'function setApprovalForAll(address operator, bool approved)',
      ];

      const erc1155Contract = new ethers.Contract(
        tokenAddress,
        erc1155Abi,
        this.signer,
      );

      const balance = await erc1155Contract.balanceOf(userAddress, tokenId);
      if (BigInt(balance.toString()) < BigInt(amount)) {
        const balanceFormatted = ethers.formatEther(balance.toString());
        const amountFormatted = ethers.formatEther(amount);
        throw new Error(
          `Insufficient token balance. Your balance: ${balanceFormatted}, Requested: ${amountFormatted}`,
        );
      }

      const isApproved = await erc1155Contract.isApprovedForAll(
        userAddress,
        await this.contract.getAddress(),
      );

      if (!isApproved) {
        const approveTx = await erc1155Contract.setApprovalForAll(
          await this.contract.getAddress(),
          true,
        );
        await approveTx.wait();
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Insufficient token balance')
      ) {
        throw error;
      }
      console.error(
        '[PoolService.handleTokenApprovalAndBalance] Error:',
        error,
      );
      throw new Error(
        `Failed to verify ERC1155 token approval and balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleTokenApproval(
    tokenAddress: string,
    amount: BigNumberString,
  ): Promise<void> {
    try {
      const erc20Abi = [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
      ];
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        this.signer,
      );

      const currentAllowance = await tokenContract.allowance(
        await this.signer.getAddress(),
        await this.contract.getAddress(),
      );

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
      const eventFragment =
        this.contract.interface.getEvent('OpportunityCreated');
      if (!eventFragment)
        throw new Error('OpportunityCreated event not found in ABI');
      const eventSignature = eventFragment.topicHash;
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
