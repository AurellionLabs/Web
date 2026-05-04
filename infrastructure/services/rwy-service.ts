import { ethers, Contract, Signer, ContractTransactionReceipt } from 'ethers';
import {
  IRWYService,
  RWYOpportunityCreationData,
  Address,
  BigNumberString,
} from '../../domain/rwy';

// ABI for Diamond RWY staking functions.
const RWY_STAKING_ABI = [
  'function createOpportunity(string name, string description, address inputToken, uint256 inputTokenId, uint256 targetAmount, address outputToken, uint256 expectedOutputAmount, uint256 promisedYieldBps, uint256 operatorFeeBps, uint256 minSalePrice, uint256 fundingDays, uint256 processingDays) payable returns (bytes32)',
  'function stake(bytes32 opportunityId, uint256 amount)',
  'function unstake(bytes32 opportunityId, uint256 amount)',
  'function startDelivery(bytes32 opportunityId, bytes32 journeyId)',
  'function confirmDelivery(bytes32 opportunityId, uint256 deliveredAmount)',
  'function completeProcessing(bytes32 opportunityId, uint256 outputTokenId, uint256 actualOutputAmount)',
  'function claimProfits(bytes32 opportunityId)',
  'function emergencyClaim(bytes32 opportunityId)',
  'function cancelOpportunity(bytes32 opportunityId, string reason)',
  'event OpportunityCreated(bytes32 indexed opportunityId, address indexed operator, address inputToken, uint256 inputTokenId, uint256 targetAmount, uint256 promisedYieldBps)',
  'event CommodityStaked(bytes32 indexed opportunityId, address indexed staker, uint256 amount, uint256 totalStaked)',
  'event CommodityUnstaked(bytes32 indexed opportunityId, address indexed staker, uint256 amount)',
  'event DeliveryStarted(bytes32 indexed opportunityId, bytes32 journeyId)',
  'event DeliveryConfirmed(bytes32 indexed opportunityId, uint256 deliveredAmount)',
  'event ProcessingStarted(bytes32 indexed opportunityId)',
  'event ProcessingCompleted(bytes32 indexed opportunityId, uint256 outputAmount, uint256 outputTokenId)',
  'event ProfitDistributed(bytes32 indexed opportunityId, address indexed staker, uint256 principal, uint256 profit)',
  'event OpportunityCancelled(bytes32 indexed opportunityId, string reason)',
];

// ERC1155 ABI for approval
const ERC1155_ABI = [
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
];

/**
 * Service implementation for Diamond RWY staking business logic.
 */
export class RWYService implements IRWYService {
  private contract: Contract;
  private signer: Signer;
  private contractAddress: string;

  constructor(contractAddress: string, signer: Signer) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this.contract = new ethers.Contract(
      contractAddress,
      RWY_STAKING_ABI,
      signer,
    );
  }

  /**
   * Create a new RWY opportunity (operator only)
   */
  async createOpportunity(
    data: RWYOpportunityCreationData,
    _operator: Address,
  ): Promise<{ opportunityId: string; transactionHash: string }> {
    try {
      const tx = await this.contract.createOpportunity(
        data.name,
        data.description,
        data.inputToken,
        data.inputTokenId,
        data.targetAmount,
        data.outputToken,
        data.expectedOutputAmount,
        data.promisedYieldBps,
        data.operatorFeeBps,
        data.minSalePrice,
        data.fundingDays,
        data.processingDays,
        { value: data.collateralAmount },
      );

      const receipt = await tx.wait();

      // Extract opportunityId from event
      let opportunityId = '';
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === 'OpportunityCreated') {
            opportunityId = parsed.args.opportunityId;
            break;
          }
        } catch {
          // Skip logs that don't match our ABI
        }
      }

      return {
        opportunityId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  }

  /**
   * Stake commodities into an opportunity
   */
  async stake(
    opportunityId: string,
    amount: BigNumberString,
    _staker: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.stake(opportunityId, amount);
      return await tx.wait();
    } catch (error) {
      console.error('Error staking:', error);
      throw error;
    }
  }

  /**
   * Unstake commodities (only during funding or after cancellation)
   */
  async unstake(
    opportunityId: string,
    amount: BigNumberString,
    _staker: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.unstake(opportunityId, amount);
      return await tx.wait();
    } catch (error) {
      console.error('Error unstaking:', error);
      throw error;
    }
  }

  /**
   * Start delivery process (operator only)
   */
  async startDelivery(
    opportunityId: string,
    journeyId: string,
    _operator: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.startDelivery(opportunityId, journeyId);
      return await tx.wait();
    } catch (error) {
      console.error('Error starting delivery:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery of commodities (operator only)
   */
  async confirmDelivery(
    opportunityId: string,
    deliveredAmount: BigNumberString,
    _operator: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.confirmDelivery(
        opportunityId,
        deliveredAmount,
      );
      return await tx.wait();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      throw error;
    }
  }

  /**
   * Complete processing and mint output tokens (operator only)
   */
  async completeProcessing(
    opportunityId: string,
    outputTokenId: string,
    actualOutputAmount: BigNumberString,
    _operator: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.completeProcessing(
        opportunityId,
        outputTokenId,
        actualOutputAmount,
      );
      return await tx.wait();
    } catch (error) {
      console.error('Error completing processing:', error);
      throw error;
    }
  }

  /**
   * Claim profits after opportunity completion
   */
  async claimProfits(
    opportunityId: string,
    _staker: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.claimProfits(opportunityId);
      return await tx.wait();
    } catch (error) {
      console.error('Error claiming profits:', error);
      throw error;
    }
  }

  /**
   * Emergency claim for cancelled opportunities
   */
  async emergencyClaim(
    opportunityId: string,
    _staker: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.emergencyClaim(opportunityId);
      return await tx.wait();
    } catch (error) {
      console.error('Error emergency claiming:', error);
      throw error;
    }
  }

  /**
   * Cancel an opportunity (operator only, during funding)
   */
  async cancelOpportunity(
    opportunityId: string,
    reason: string,
    _operator: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tx = await this.contract.cancelOpportunity(opportunityId, reason);
      return await tx.wait();
    } catch (error) {
      console.error('Error cancelling opportunity:', error);
      throw error;
    }
  }

  /**
   * Approve ERC1155 tokens for staking
   */
  async approveTokensForStaking(
    tokenAddress: Address,
    _staker: Address,
  ): Promise<ContractTransactionReceipt | undefined> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC1155_ABI,
        this.signer,
      );
      const tx = await tokenContract.setApprovalForAll(
        this.contractAddress,
        true,
      );
      return await tx.wait();
    } catch (error) {
      console.error('Error approving tokens:', error);
      throw error;
    }
  }

  /**
   * Check if tokens are approved for staking
   */
  async isApprovedForStaking(
    tokenAddress: Address,
    owner: Address,
  ): Promise<boolean> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC1155_ABI,
        this.signer,
      );
      return await tokenContract.isApprovedForAll(owner, this.contractAddress);
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  }
}
