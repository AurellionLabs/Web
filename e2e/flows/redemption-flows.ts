/**
 * Redemption Flows - Domain-specific flow helpers for Redemption testing
 *
 * Provides high-level functions that mirror the exact UI flows
 * for asset redemption operations.
 */

import { ethers, Contract, ContractTransactionReceipt } from 'ethers';
import { FlowContext, TestUser } from './flow-context';
import { ActionSimulator, ActionResult } from './action-simulator';
import { getCoverageTracker } from '../coverage/coverage-tracker';
import { ParcelData } from './order-flows';

// =============================================================================
// TYPES
// =============================================================================

export interface RedemptionParams {
  tokenId: number;
  quantity: number;
  originNode: string;
  destinationLat: string;
  destinationLng: string;
  deliveryAddress: string;
  confirmationLevel: number; // 1-5
  routeNodes?: string[]; // Pre-calculated route nodes
}

export interface RedemptionResult {
  success: boolean;
  burnTxHash?: string;
  orderId?: string;
  journeyId?: string;
  error?: string;
}

export interface RouteCalculationResult {
  nodes: string[];
  totalDistance: number;
  estimatedDays: number;
  fee: bigint;
}

// =============================================================================
// REDEMPTION FLOWS CLASS
// =============================================================================

export class RedemptionFlows {
  private context: FlowContext;
  private simulator: ActionSimulator;
  private verbose: boolean;

  constructor(context: FlowContext, verbose: boolean = false) {
    this.context = context;
    this.simulator = new ActionSimulator(context, verbose);
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // Redemption Operations
  // ---------------------------------------------------------------------------

  /**
   * Execute full redemption flow:
   * 1. Verify token balance
   * 2. Burn tokens
   * 3. Create logistics order
   * 4. Create delivery journey
   */
  async executeRedemption(
    customer: TestUser,
    params: RedemptionParams,
  ): Promise<RedemptionResult> {
    this.log(`🔄 ${customer.name} initiating redemption`);
    this.log(`   Token ID: ${params.tokenId}, Quantity: ${params.quantity}`);
    this.log(`   Confirmation Level: ${params.confirmationLevel}`);

    try {
      // Step 1: Verify balance
      const auraAsset = this.context.getContractAs('AuraAsset', customer.name);
      const balance = await auraAsset.balanceOf(
        customer.address,
        params.tokenId,
      );

      if (BigInt(balance) < BigInt(params.quantity)) {
        return {
          success: false,
          error: `Insufficient balance. Have: ${balance}, Need: ${params.quantity}`,
        };
      }

      this.log(`✅ Balance verified: ${balance}`);

      // Step 2: Burn tokens
      const burnTx = await auraAsset.burn(
        customer.address,
        params.tokenId,
        params.quantity,
      );
      const burnReceipt = await burnTx.wait();

      this.log(`✅ Tokens burned. Tx: ${burnReceipt.hash}`);

      // Step 3: Calculate fee
      const fee = this.calculateRedemptionFee(
        BigInt(params.quantity),
        params.confirmationLevel,
      );

      // Step 4: Create logistics order
      const auraAssetAddress = this.context.getContractAddress('AuraAsset');
      const auSysAddress = this.context.getContractAddress('AuSys');

      // Approve payment
      const aura = this.context.getContractAs('Aura', customer.name);
      await (await aura.approve(auSysAddress, fee * 2n)).wait();

      const auSys = this.context.getContractAs('AuSys', customer.name);

      const parcelData: ParcelData = {
        startLocation: { lat: '0', lng: '0' }, // Will be filled by origin node
        endLocation: {
          lat: params.destinationLat,
          lng: params.destinationLng,
        },
        startName: params.originNode,
        endName: params.deliveryAddress,
      };

      const orderStruct = {
        id: ethers.ZeroHash,
        token: auraAssetAddress,
        tokenId: params.tokenId,
        tokenQuantity: params.quantity,
        price: fee,
        txFee: fee / 10n,
        buyer: customer.address,
        seller: params.originNode,
        journeyIds: [],
        nodes: params.routeNodes || [params.originNode],
        locationData: parcelData,
        currentStatus: 0,
        contractualAgreement: ethers.ZeroHash,
      };

      const orderTx = await auSys.orderCreation(orderStruct);
      const orderReceipt = await orderTx.wait();

      // Extract order ID
      const orderEvent = this.simulator.getEventsFromReceipt(
        orderReceipt,
        auSys,
        'OrderCreated',
      )[0];
      const orderId = orderEvent?.args?.orderId ?? ethers.ZeroHash;

      this.log(`✅ Order created: ${orderId}`);

      // Track coverage
      getCoverageTracker().mark('IOrderService', 'createOrder');

      // Step 5: Create journey
      const chainTimestamp = Math.floor(Date.now() / 1000);
      const eta =
        chainTimestamp + params.confirmationLevel * 24 * 3600 + 2 * 24 * 3600;

      const journeyTx = await auSys.orderJourneyCreation(
        orderId,
        params.originNode,
        customer.address,
        parcelData,
        fee / 5n, // 20% bounty
        eta,
        params.quantity,
        params.tokenId,
      );

      const journeyReceipt = await journeyTx.wait();

      // Extract journey ID
      const journeyEvent = this.simulator.getEventsFromReceipt(
        journeyReceipt,
        auSys,
        'JourneyCreated',
      )[0];
      const journeyId = journeyEvent?.args?.journeyId ?? ethers.ZeroHash;

      this.log(`✅ Journey created: ${journeyId}`);

      // Track coverage
      getCoverageTracker().mark('IOrderService', 'createOrderJourney');

      return {
        success: true,
        burnTxHash: burnReceipt.hash,
        orderId,
        journeyId,
      };
    } catch (error) {
      this.log(`❌ Redemption failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Burn ERC1155 tokens (standalone operation)
   */
  async burnTokens(
    user: TestUser,
    tokenId: number,
    quantity: number,
  ): Promise<ActionResult> {
    this.log(`🔥 ${user.name} burning ${quantity} tokens (ID: ${tokenId})`);

    const result = await this.simulator.executeWrite(
      'AuraAsset',
      'burn',
      [user.address, tokenId, quantity],
      user,
    );

    if (result.success) {
      this.log(`✅ Tokens burned`);
    }

    return result;
  }

  /**
   * Get user's token balance
   */
  async getTokenBalance(userAddress: string, tokenId: number): Promise<bigint> {
    const auraAsset = this.context.getContract('AuraAsset');
    const balance = await auraAsset.balanceOf(userAddress, tokenId);
    return BigInt(balance);
  }

  // ---------------------------------------------------------------------------
  // Fee Calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate redemption fee based on quantity and confirmation level
   * Mirrors RedemptionService.calculateRedemptionFee
   */
  calculateRedemptionFee(quantity: bigint, confirmationLevel: number): bigint {
    const baseRedemptionFee = 5_000_000n; // $5 in USDC (6 decimals)
    const perNodeFee = 3_000_000n; // $3 per intermediate node
    const perUnitFee = 2_000_000n; // $2 per unit

    const intermediateNodes = Math.max(0, confirmationLevel - 1);
    return (
      baseRedemptionFee +
      perNodeFee * BigInt(intermediateNodes) +
      perUnitFee * quantity
    );
  }

  /**
   * Estimate delivery time based on confirmation level
   */
  estimateDeliveryDays(confirmationLevel: number): number {
    return confirmationLevel + 2;
  }

  // ---------------------------------------------------------------------------
  // Route Simulation (for testing)
  // ---------------------------------------------------------------------------

  /**
   * Simulate route calculation for testing
   * In production, this would call RouteCalculationService
   */
  simulateRouteCalculation(
    originNode: string,
    availableNodes: string[],
    confirmationLevel: number,
  ): RouteCalculationResult {
    // Simple simulation: pick first N nodes
    const nodeCount = Math.min(confirmationLevel, availableNodes.length + 1);
    const nodes = [originNode, ...availableNodes.slice(0, nodeCount - 1)];

    return {
      nodes,
      totalDistance: nodeCount * 100, // Simulated distance
      estimatedDays: nodeCount + 2,
      fee: this.calculateRedemptionFee(1n, nodeCount),
    };
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[RedemptionFlows] ${message}`);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create Redemption flows helper
 */
export function createRedemptionFlows(
  context: FlowContext,
  verbose: boolean = false,
): RedemptionFlows {
  return new RedemptionFlows(context, verbose);
}
