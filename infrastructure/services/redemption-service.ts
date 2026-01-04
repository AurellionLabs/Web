'use client';

import { ethers, Signer } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
} from '@/chain-constants';
import { Order, OrderStatus } from '@/domain/orders/order';
import { ParcelData } from '@/domain/shared';

/**
 * Parameters for requesting a redemption
 */
export interface RedemptionParams {
  tokenId: string;
  quantity: bigint;
  deliveryAddress: string;
  originNode: string; // The node where the physical asset is stored
}

/**
 * Result of a redemption request
 */
export interface RedemptionResult {
  success: boolean;
  orderId?: string;
  journeyId?: string;
  error?: string;
}

// ERC1155 ABI for burning tokens
const ERC1155_BURNABLE_ABI = [
  'function burn(address account, uint256 id, uint256 value) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address account, address operator) external view returns (bool)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
];

// ERC20 ABI for fee payment
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

/**
 * RedemptionService - Handles the conversion of tokenized assets to physical deliveries
 *
 * Flow:
 * 1. Verify user owns the tokens
 * 2. Burn the ERC1155 tokens (user must approve)
 * 3. Create an Ausys logistics order
 * 4. Create the initial journey from origin node to customer
 *
 * This decouples CLOB trading (instant, digital) from physical delivery (on-demand)
 */
export class RedemptionService {
  private repositoryContext: RepositoryContext;
  private serviceContext: ServiceContext;

  constructor() {
    this.repositoryContext = RepositoryContext.getInstance();
    this.serviceContext = ServiceContext.getInstance();
  }

  /**
   * Request redemption of tokenized assets for physical delivery
   *
   * @param params - Redemption parameters
   * @returns Result with order and journey IDs
   */
  async requestRedemption(params: RedemptionParams): Promise<RedemptionResult> {
    const { tokenId, quantity, deliveryAddress, originNode } = params;

    try {
      console.log('[RedemptionService] Starting redemption request:', {
        tokenId,
        quantity: quantity.toString(),
        deliveryAddress,
        originNode,
      });

      const signer = this.repositoryContext.getSigner();
      const signerAddress = await signer.getAddress();

      // Step 1: Verify user owns enough tokens
      const auraAssetContract = new ethers.Contract(
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        ERC1155_BURNABLE_ABI,
        signer,
      );

      const balance = await auraAssetContract.balanceOf(signerAddress, tokenId);
      if (BigInt(balance) < quantity) {
        throw new Error(
          `Insufficient token balance. Have: ${balance.toString()}, Need: ${quantity.toString()}`,
        );
      }

      console.log(
        '[RedemptionService] Token balance verified:',
        balance.toString(),
      );

      // Step 2: Burn the tokens
      // The user burns their own tokens (ERC1155Burnable allows self-burn)
      console.log('[RedemptionService] Burning tokens...');
      const burnTx = await auraAssetContract.burn(
        signerAddress,
        tokenId,
        quantity,
      );
      const burnReceipt = await burnTx.wait();
      console.log('[RedemptionService] Tokens burned. Tx:', burnReceipt.hash);

      // Step 3: Create the logistics order via OrderService
      const orderService = this.serviceContext.getOrderService();

      // Build parcel data from delivery address
      // In production, this would geocode the address
      const parcelData: ParcelData = {
        startLocation: { lat: '0', lng: '0' }, // Origin node location (would be fetched)
        endLocation: { lat: '0', lng: '0' }, // Customer location (would be geocoded)
        startName: originNode || 'Origin Node',
        endName: deliveryAddress,
      };

      // Calculate redemption fee (simplified - would be based on distance/nodes)
      const baseRedemptionFee = 5_000_000n; // $5 in USDC (6 decimals)
      const perUnitFee = 2_000_000n; // $2 per unit
      const totalFee = baseRedemptionFee + perUnitFee * quantity;

      // Build the order
      const order: Order = {
        id: '', // Will be assigned by contract
        token: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        tokenId: tokenId,
        tokenQuantity: quantity.toString(),
        price: totalFee.toString(), // Redemption fee
        txFee: (totalFee / 10n).toString(), // 10% to nodes
        buyer: signerAddress,
        seller: originNode || signerAddress, // Origin node is the "seller" in redemption context
        journeyIds: [],
        nodes: originNode ? [originNode] : [],
        locationData: parcelData,
        currentStatus: OrderStatus.CREATED,
        contractualAgreement: '',
      };

      console.log('[RedemptionService] Creating logistics order...');
      const orderId = await orderService.createOrder(order);
      console.log('[RedemptionService] Order created:', orderId);

      // Step 4: Create the initial journey
      // The journey goes from the origin node to the customer
      if (originNode) {
        console.log('[RedemptionService] Creating initial journey...');

        // Calculate driver bounty (portion of the fee)
        const bounty = totalFee / 5n; // 20% of fee goes to driver

        const journeyId = await orderService.createOrderJourney(
          orderId,
          originNode, // Sender is the origin node
          signerAddress, // Receiver is the customer
          parcelData,
          bounty,
          BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000), // ETA: 7 days
          quantity,
          BigInt(tokenId),
        );

        console.log('[RedemptionService] Journey created:', journeyId);

        return {
          success: true,
          orderId,
          journeyId,
        };
      }

      return {
        success: true,
        orderId,
      };
    } catch (error) {
      console.error('[RedemptionService] Redemption failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redemption failed',
      };
    }
  }

  /**
   * Calculate the redemption fee for a given quantity
   *
   * @param quantity - Number of units to redeem
   * @returns Fee in USDC (6 decimals)
   */
  calculateRedemptionFee(quantity: bigint): bigint {
    const baseRedemptionFee = 5_000_000n; // $5 in USDC
    const perUnitFee = 2_000_000n; // $2 per unit
    return baseRedemptionFee + perUnitFee * quantity;
  }

  /**
   * Get the estimated delivery time based on origin node and destination
   *
   * @param originNode - Origin node address
   * @param destinationAddress - Delivery address
   * @returns Estimated delivery time in days
   */
  estimateDeliveryTime(
    _originNode: string,
    _destinationAddress: string,
  ): number {
    // Simplified - in production this would calculate based on:
    // - Distance between origin and destination
    // - Available node network for relay
    // - Historical delivery times
    return 5; // Default 5 days
  }
}

export default RedemptionService;
