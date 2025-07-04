import {
  IPoolService,
  PoolCreationData,
  Address,
  BigNumberString,
} from '@/domain/pool';
import {
  AuStake as AuStakeContract,
  AuStake__factory,
} from '@/typechain-types';
import {
  BigNumberish,
  ContractTransactionResponse,
  ethers,
  Provider,
  Signer,
} from 'ethers';
import { NEXT_PUBLIC_AUSTAKE_ADDRESS } from '@/chain-constants';

/**
 * Business logic service for Pool operations.
 * Handles smart contract interactions for pool creation, staking, and reward management.
 */
export class PoolService implements IPoolService {
  private contract: AuStakeContract;
  private signer: Signer;
  private provider: Provider;

  constructor(
    provider: Provider,
    signer: Signer,
    contractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ) {
    if (!contractAddress) {
      throw new Error('[PoolService] Pool contract address is undefined');
    }
    this.provider = provider;
    this.signer = signer;
    this.contract = AuStake__factory.connect(contractAddress, signer);
  }

  async createPool(
    data: PoolCreationData,
    creatorAddress: Address,
  ): Promise<{ poolId: string; transactionHash: string }> {
    try {
      // Validate input data
      this.validatePoolCreationData(data);

      // Convert duration to deadline timestamp
      const deadline = BigInt(
        Math.floor(Date.now() / 1000) + data.durationDays * 24 * 60 * 60,
      );

      // Create operation on smart contract
      const txResponse: ContractTransactionResponse =
        await this.contract.createOperation(
          data.name,
          data.description,
          data.tokenAddress,
          creatorAddress, // provider
          deadline,
          BigInt(data.rewardRate * 100), // Convert to basis points
          data.assetName,
          BigInt(data.fundingGoal),
          BigInt(data.assetPrice),
        );

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for pool creation');
      }

      // Extract pool ID from OperationCreated event
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

      // Note: The current contract doesn't have a specific closePool function
      // This would need to be implemented based on the actual contract functionality
      // For now, we'll use unlockReward as a proxy for closing
      const txResponse = await this.contract.unlockReward(
        ethers.ZeroAddress, // token address (needs to be determined)
        poolId,
      );

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
      // Validate input
      if (!amount || BigInt(amount) <= 0) {
        throw new Error('Invalid stake amount');
      }

      // Validate that the caller is the investor
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== investorAddress.toLowerCase()) {
        throw new Error('Signer must match investor address');
      }

      // Get pool information to determine token address
      const operation = await this.contract.getOperation(poolId);
      if (!operation || operation.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const tokenAddress = operation.token;

      // Handle ERC20 approval
      await this.handleTokenApproval(tokenAddress, amount);

      // Execute stake transaction
      const txResponse = await this.contract.stake(
        tokenAddress,
        poolId,
        BigInt(amount),
      );

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

      // Get pool information to determine token address
      const operation = await this.contract.getOperation(poolId);
      if (!operation || operation.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const tokenAddress = operation.token;

      // Execute claim reward transaction
      const txResponse = await this.contract.claimReward(
        tokenAddress,
        poolId,
        address,
      );

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

      // Get pool information to determine token address
      const operation = await this.contract.getOperation(poolId);
      if (!operation || operation.id === ethers.ZeroHash) {
        throw new Error('Pool not found');
      }

      const tokenAddress = operation.token;

      // Execute unlock reward transaction
      const txResponse = await this.contract.unlockReward(tokenAddress, poolId);

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
    if (data.rewardRate < 0) {
      throw new Error('Reward rate cannot be negative');
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
        'function approve(address spender, uint256 amount) nonpayable returns (bool)',
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
      // Look for OperationCreated event
      const eventSignature =
        this.contract.interface.getEvent('OperationCreated').topicHash;
      const eventLog = txReceipt.logs?.find(
        (log: any) => log.topics[0] === eventSignature,
      );

      if (eventLog) {
        const parsedLog = this.contract.interface.parseLog(eventLog);
        if (parsedLog && parsedLog.args.operationId) {
          return parsedLog.args.operationId;
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
