import {
  IAuStakeService,
  StakingOperation,
  // StakingOperationStatus, // No longer directly needed here for mapping if repo handles it
} from '@/domain/austake';
import { IAuStakeRepository } from '@/domain/austake'; // Import repository interface
// Typechain imports like AuStake, AuStake__factory, AuraGoat, AuraGoat__factory are no longer needed here
// if all contract interaction is through the repository.
import {
  BigNumberish,
  BytesLike,
  ContractTransactionReceipt,
  ethers, // Keep for Signer type if needed for getSignerAddress
} from 'ethers';
// NEXT_PUBLIC_ constants are not needed if repo handles contract address and token approval details
import { RepositoryContext } from '../contexts/repository-context'; // For signer address if needed

// Basic error handler, can be expanded
const handleServiceError = (error: any, methodName: string) => {
  console.error(`Error in AuStakeService.${methodName}:`, error);
  if (error instanceof Error) {
    throw new Error(`AuStakeService.${methodName} failed: ${error.message}`);
  }
  throw new Error(`AuStakeService.${methodName} failed with an unknown error.`);
};

export class AuStakeService implements IAuStakeService {
  private auStakeRepository: IAuStakeRepository;
  private repositoryContext: RepositoryContext; // To get signer for specific cases like triggerSelfRewardClaim

  constructor(
    auStakeRepository: IAuStakeRepository,
    repositoryContext: RepositoryContext, // Inject full RepositoryContext
  ) {
    this.auStakeRepository = auStakeRepository;
    this.repositoryContext = repositoryContext;
  }

  // Method to get current user's address, if needed by service logic
  private async getCurrentUserAddress(): Promise<string> {
    const signer = this.repositoryContext.getSigner(); // Assuming getSigner is synchronous or already resolved
    return signer.getAddress();
  }

  async createOperation(
    name: string,
    description: string,
    token: string,
    provider: string,
    deadline: BigNumberish,
    reward: BigNumberish,
    rwaName: string,
    fundingGoal: BigNumberish,
    assetPrice: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    // Service returns only receipt as per IAuStakeService
    const methodName = 'createOperation';
    try {
      const result = await this.auStakeRepository.createOperation(
        name,
        description,
        token,
        provider,
        deadline,
        reward,
        rwaName,
        fundingGoal,
        assetPrice,
      );
      // The service interface currently expects only the receipt,
      // but the repository provides operationId. We adapt here.
      return result?.txReceipt;
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async stake(
    tokenAddress: string,
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'stake';
    try {
      if (!amount || BigInt(amount.toString()) <= 0) {
        // This validation can stay in the service layer as a business rule
        throw new Error('Invalid stake amount');
      }
      return this.auStakeRepository.addStake(tokenAddress, operationId, amount);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async getOperation(
    operationId: BytesLike,
  ): Promise<StakingOperation | undefined> {
    const methodName = 'getOperation';
    try {
      return this.auStakeRepository.findOperationById(operationId);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async claimReward(
    token: string,
    operationId: BytesLike,
    user: string,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'claimReward';
    try {
      return this.auStakeRepository.claimReward(token, operationId, user);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async triggerSelfRewardClaim(
    token: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'triggerSelfRewardClaim';
    try {
      const walletAddress = await this.getCurrentUserAddress();
      return this.auStakeRepository.claimReward(
        token,
        operationId,
        walletAddress,
      );
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async unlockOperationRewards(
    token: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'unlockOperationRewards';
    try {
      return this.auStakeRepository.unlockRewards(token, operationId);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async setOperationReward(
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'setOperationReward';
    try {
      return this.auStakeRepository.updateOperationReward(operationId, amount);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async setLockPeriod(
    lockPeriod: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'setLockPeriod';
    try {
      return this.auStakeRepository.updateLockPeriod(lockPeriod);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async setAdmin(
    user: string,
    status: boolean,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'setAdmin';
    try {
      return this.auStakeRepository.updateAdminStatus(user, status);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async setProjectWallet(
    projectWallet: string,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'setProjectWallet';
    try {
      return this.auStakeRepository.updateProjectWallet(projectWallet);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }

  async burnStake(
    token: string,
    user: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'burnStake';
    try {
      return this.auStakeRepository.burnStake(token, user, operationId);
    } catch (error) {
      handleServiceError(error, methodName);
      return undefined;
    }
  }
}
