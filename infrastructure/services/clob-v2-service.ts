/**
 * @module infrastructure/services/clob-v2-service
 * @description CLOB V2 Service Implementation
 *
 * Implements ICLOBService interface for production-ready CLOB trading.
 * Handles order placement, cancellation, and MEV protection via Diamond contract.
 */

import { ethers } from 'ethers';
import {
  type ICLOBService,
  type PlaceLimitOrderParams,
  type PlaceMarketOrderParams,
  type CommitOrderParams,
  type RevealOrderParams,
  type OrderPlacementResult,
  type OrderCancellationResult,
  TimeInForce,
} from '@/domain/clob/clob';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
} from '@/chain-constants';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { keccak256, encodePacked, toBytes } from 'viem';

// =============================================================================
// ABI FRAGMENTS
// =============================================================================

const CLOB_CORE_ABI = [
  // Order Placement
  'function placeLimitOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, bool isBuy, uint8 timeInForce, uint40 expiry) external returns (bytes32 orderId)',
  'function placeNodeSellOrderV2(address nodeOwner, address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, uint8 timeInForce, uint40 expiry) external returns (bytes32 orderId)',

  // Order Cancellation
  'function cancelOrder(bytes32 orderId) external',
  'function cancelOrders(bytes32[] calldata orderIds) external',

  // MEV Protection
  'function commitOrder(bytes32 commitment) external',
  'function revealOrder(bytes32 commitmentId, address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, bool isBuy, uint8 timeInForce, uint40 expiry, bytes32 salt) external returns (bytes32 orderId)',

  // Configuration
  'function initializeCLOBV2(uint16 takerFeeBps, uint16 makerFeeBps, uint256 defaultPriceChangeThreshold, uint256 defaultCooldownPeriod, uint256 emergencyTimelock) external',

  // Events
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed marketId, address indexed maker, uint256 price, uint256 amount, bool isBuy, uint8 orderType, uint8 timeInForce, uint256 expiry, uint256 nonce)',
  'event OrderCancelled(bytes32 indexed orderId, address indexed maker, uint256 remainingAmount, uint8 reason)',
  'event OrderCommitted(bytes32 indexed commitmentId, address indexed committer, uint256 commitBlock)',
  'event OrderRevealed(bytes32 indexed commitmentId, bytes32 indexed orderId, address indexed maker)',
];

const CLOB_ADMIN_ABI = [
  // Fee Management
  'function updateFees(uint16 takerFeeBps, uint16 makerFeeBps, uint16 lpFeeBps) external',
  'function getFeeConfig() external view returns (uint16 takerFeeBps, uint16 makerFeeBps, uint16 lpFeeBps, address feeRecipient)',

  // MEV Protection
  'function updateMEVProtection(uint8 minRevealDelay, uint256 commitmentThreshold) external',
  'function getMEVConfig() external view returns (uint8 minRevealDelay, uint256 commitmentThreshold)',

  // Pause
  'function isPaused() external view returns (bool)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

const ERC1155_ABI = [
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address account, address operator) external view returns (bool)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
];

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

/**
 * CLOB V2 Service
 *
 * Production-ready implementation of ICLOBService.
 * Handles all write operations via Diamond contract.
 */
export class CLOBV2Service implements ICLOBService {
  private diamondAddress: string;
  private quoteTokenAddress: string;
  private repositoryContext: RepositoryContext;

  constructor() {
    this.diamondAddress = NEXT_PUBLIC_DIAMOND_ADDRESS;
    this.quoteTokenAddress =
      NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS ||
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    this.repositoryContext = RepositoryContext.getInstance();
  }

  // ============================================================================
  // ORDER PLACEMENT
  // ============================================================================

  async placeLimitOrder(
    params: PlaceLimitOrderParams,
  ): Promise<OrderPlacementResult> {
    try {
      console.log('[CLOBV2Service] Placing limit order:', params);

      const contract = await this.getCLOBContract();

      // Handle token approvals
      if (params.isBuy) {
        await this.ensureQuoteTokenApproval(params.price * params.amount);
      } else {
        await this.ensureBaseTokenApproval(params.baseToken);
      }

      // Convert TimeInForce enum to number
      const tifNum = this.timeInForceToNumber(params.timeInForce);
      const expiry = params.expiry || 0;

      const tx = await contract.placeLimitOrder(
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.price,
        params.amount,
        params.isBuy,
        tifNum,
        expiry,
      );

      const receipt = await tx.wait();
      const orderId = this.extractOrderIdFromReceipt(receipt);

      console.log('[CLOBV2Service] Order placed:', orderId);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to place limit order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async placeMarketOrder(
    params: PlaceMarketOrderParams,
  ): Promise<OrderPlacementResult> {
    try {
      console.log('[CLOBV2Service] Placing market order:', params);

      // Market orders are placed as IOC limit orders with slippage
      // The matching engine will fill what it can immediately
      const limitParams: PlaceLimitOrderParams = {
        baseToken: params.baseToken,
        baseTokenId: params.baseTokenId,
        quoteToken: params.quoteToken,
        price: 0n, // Will be calculated based on order book
        amount: params.amount,
        isBuy: params.isBuy,
        timeInForce: TimeInForce.IOC,
      };

      // TODO: Get current market price and apply slippage
      // For now, use a high/low price based on direction
      if (params.isBuy) {
        limitParams.price = BigInt(2) ** BigInt(96) - 1n; // Max price for buys
      } else {
        limitParams.price = 1n; // Min price for sells
      }

      return this.placeLimitOrder(limitParams);
    } catch (error) {
      console.error('[CLOBV2Service] Failed to place market order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async placeNodeSellOrder(
    nodeHash: string,
    params: PlaceLimitOrderParams,
  ): Promise<OrderPlacementResult> {
    try {
      console.log('[CLOBV2Service] Placing node sell order:', {
        nodeHash,
        ...params,
      });

      const contract = await this.getCLOBContract();
      const signerAddress = await this.repositoryContext.getSignerAddress();

      const tifNum = this.timeInForceToNumber(params.timeInForce);
      const expiry = params.expiry || 0;

      const tx = await contract.placeNodeSellOrderV2(
        signerAddress, // nodeOwner
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.price,
        params.amount,
        tifNum,
        expiry,
      );

      const receipt = await tx.wait();
      const orderId = this.extractOrderIdFromReceipt(receipt);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to place node sell order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  async cancelOrder(orderId: string): Promise<OrderCancellationResult> {
    try {
      console.log('[CLOBV2Service] Cancelling order:', orderId);

      const contract = await this.getCLOBContract();
      const tx = await contract.cancelOrder(orderId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to cancel order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cancelOrders(orderIds: string[]): Promise<OrderCancellationResult[]> {
    try {
      console.log('[CLOBV2Service] Cancelling orders:', orderIds);

      const contract = await this.getCLOBContract();
      const tx = await contract.cancelOrders(orderIds);
      const receipt = await tx.wait();

      return orderIds.map(() => ({
        success: true,
        transactionHash: receipt.hash,
      }));
    } catch (error) {
      console.error('[CLOBV2Service] Failed to cancel orders:', error);
      return orderIds.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  // ============================================================================
  // MEV PROTECTION
  // ============================================================================

  async commitOrder(
    params: CommitOrderParams,
  ): Promise<{ commitmentId: string }> {
    try {
      console.log('[CLOBV2Service] Committing order:', params);

      const contract = await this.getCLOBContract();

      // Create commitment hash
      const commitment = keccak256(
        encodePacked(
          ['bytes32', 'uint96', 'uint96', 'bool', 'uint8', 'uint40', 'bytes32'],
          [
            params.marketId as `0x${string}`,
            params.price,
            params.amount,
            params.isBuy,
            this.timeInForceToNumber(params.timeInForce),
            BigInt(params.expiry || 0),
            params.salt as `0x${string}`,
          ],
        ),
      );

      const tx = await contract.commitOrder(commitment);
      const receipt = await tx.wait();

      // Extract commitment ID from event
      const commitmentId = this.extractCommitmentIdFromReceipt(receipt);

      return { commitmentId };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to commit order:', error);
      throw error;
    }
  }

  async revealOrder(params: RevealOrderParams): Promise<OrderPlacementResult> {
    try {
      console.log('[CLOBV2Service] Revealing order:', params);

      const contract = await this.getCLOBContract();

      // Handle token approvals
      if (params.isBuy) {
        await this.ensureQuoteTokenApproval(params.price * params.amount);
      } else {
        await this.ensureBaseTokenApproval(params.baseToken);
      }

      const tx = await contract.revealOrder(
        params.commitmentId,
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.price,
        params.amount,
        params.isBuy,
        this.timeInForceToNumber(params.timeInForce),
        params.expiry || 0,
        params.salt,
      );

      const receipt = await tx.wait();
      const orderId = this.extractOrderIdFromReceipt(receipt);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to reveal order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // QUOTE CALCULATION
  // ============================================================================

  calculateQuoteAmount(price: bigint, amount: bigint): bigint {
    return (price * amount) / BigInt(10 ** 18);
  }

  async requiresCommitReveal(quoteAmount: bigint): Promise<boolean> {
    try {
      const config = await this.getMEVConfig();
      return quoteAmount >= BigInt(config.commitmentThreshold);
    } catch {
      // Default threshold: 10,000 quote tokens
      return quoteAmount >= BigInt(10000) * BigInt(10 ** 18);
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  async getFeeConfig(): Promise<{
    takerFeeBps: number;
    makerFeeBps: number;
    lpFeeBps: number;
    feeRecipient: string;
  }> {
    try {
      const contract = await this.getCLOBAdminContract();
      const [takerFeeBps, makerFeeBps, lpFeeBps, feeRecipient] =
        await contract.getFeeConfig();

      return {
        takerFeeBps: Number(takerFeeBps),
        makerFeeBps: Number(makerFeeBps),
        lpFeeBps: Number(lpFeeBps),
        feeRecipient,
      };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to get fee config:', error);
      return {
        takerFeeBps: 30, // 0.3%
        makerFeeBps: 10, // 0.1%
        lpFeeBps: 20, // 0.2%
        feeRecipient: ethers.ZeroAddress,
      };
    }
  }

  async getMEVConfig(): Promise<{
    minRevealDelay: number;
    commitmentThreshold: string;
  }> {
    try {
      const contract = await this.getCLOBAdminContract();
      const [minRevealDelay, commitmentThreshold] =
        await contract.getMEVConfig();

      return {
        minRevealDelay: Number(minRevealDelay),
        commitmentThreshold: commitmentThreshold.toString(),
      };
    } catch (error) {
      console.error('[CLOBV2Service] Failed to get MEV config:', error);
      return {
        minRevealDelay: 2,
        commitmentThreshold: (BigInt(10000) * BigInt(10 ** 18)).toString(),
      };
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      const contract = await this.getCLOBAdminContract();
      return await contract.isPaused();
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getCLOBContract(): Promise<ethers.Contract> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();

    const contract = new ethers.Contract(
      this.diamondAddress,
      CLOB_CORE_ABI,
      provider,
    );

    return contract.connect(signer) as ethers.Contract;
  }

  private async getCLOBAdminContract(): Promise<ethers.Contract> {
    const provider = this.repositoryContext.getProvider();
    return new ethers.Contract(this.diamondAddress, CLOB_ADMIN_ABI, provider);
  }

  private async ensureQuoteTokenApproval(amount: bigint): Promise<void> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();
    const signerAddress = await this.repositoryContext.getSignerAddress();

    const quoteToken = new ethers.Contract(
      this.quoteTokenAddress,
      ERC20_ABI,
      provider,
    ).connect(signer) as ethers.Contract;

    const allowance = await quoteToken.allowance(
      signerAddress,
      this.diamondAddress,
    );

    if (allowance < amount) {
      console.log('[CLOBV2Service] Approving quote token...');
      const tx = await quoteToken.approve(this.diamondAddress, amount);
      await tx.wait();
    }
  }

  private async ensureBaseTokenApproval(baseToken: string): Promise<void> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();
    const signerAddress = await this.repositoryContext.getSignerAddress();

    const token = new ethers.Contract(baseToken, ERC1155_ABI, provider).connect(
      signer,
    ) as ethers.Contract;

    const isApproved = await token.isApprovedForAll(
      signerAddress,
      this.diamondAddress,
    );

    if (!isApproved) {
      console.log('[CLOBV2Service] Approving base token...');
      const tx = await token.setApprovalForAll(this.diamondAddress, true);
      await tx.wait();
    }
  }

  private timeInForceToNumber(tif: TimeInForce): number {
    switch (tif) {
      case TimeInForce.GTC:
        return 0;
      case TimeInForce.IOC:
        return 1;
      case TimeInForce.FOK:
        return 2;
      case TimeInForce.GTD:
        return 3;
      default:
        return 0;
    }
  }

  private extractOrderIdFromReceipt(
    receipt: ethers.TransactionReceipt,
  ): string {
    const orderCreatedTopic = ethers.id(
      'OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)',
    );

    for (const log of receipt.logs) {
      if (log.topics[0] === orderCreatedTopic && log.topics.length >= 2) {
        return log.topics[1];
      }
    }

    return receipt.hash;
  }

  private extractCommitmentIdFromReceipt(
    receipt: ethers.TransactionReceipt,
  ): string {
    const commitTopic = ethers.id('OrderCommitted(bytes32,address,uint256)');

    for (const log of receipt.logs) {
      if (log.topics[0] === commitTopic && log.topics.length >= 2) {
        return log.topics[1];
      }
    }

    throw new Error('Commitment ID not found in receipt');
  }
}

// Export singleton instance
export const clobV2Service = new CLOBV2Service();
