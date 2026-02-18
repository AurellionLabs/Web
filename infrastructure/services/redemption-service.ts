'use client';

import { ethers } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';
import { Order, OrderStatus } from '@/domain/orders/order';
import { ParcelData } from '@/domain/shared';
import { RouteCalculationService } from './route-calculation-service';

/**
 * Parameters for requesting a redemption
 */
export interface RedemptionParams {
  tokenId: string;
  quantity: bigint;
  deliveryAddress: string;
  originNode: string; // The node where the physical asset is stored
  confirmationLevel: number; // Number of nodes in the route (1-5)
  destinationLat: number; // Customer delivery latitude
  destinationLng: number; // Customer delivery longitude
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

// Diamond AssetsFacet ABI subset for redemption (burns tokens and releases custody)
const DIAMOND_ASSET_ABI = [
  'function redeem(uint256 tokenId, uint256 amount, address custodian) external',
  'function getCustodyInfo(uint256 tokenId, address custodian) external view returns (uint256 amount)',
  'function getTotalCustodyAmount(uint256 tokenId) external view returns (uint256 amount)',
  'function isInCustody(uint256 tokenId) external view returns (bool)',
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
  private routeCalculationService: RouteCalculationService;

  constructor() {
    this.repositoryContext = RepositoryContext.getInstance();
    this.serviceContext = ServiceContext.getInstance();
    this.routeCalculationService = new RouteCalculationService();
  }

  /**
   * Request redemption of tokenized assets for physical delivery
   *
   * @param params - Redemption parameters
   * @returns Result with order and journey IDs
   */
  async requestRedemption(params: RedemptionParams): Promise<RedemptionResult> {
    const {
      tokenId,
      quantity,
      deliveryAddress,
      originNode,
      confirmationLevel,
      destinationLat,
      destinationLng,
    } = params;

    try {
      console.log('[RedemptionService] Starting redemption request:', {
        tokenId,
        quantity: quantity.toString(),
        deliveryAddress,
        originNode,
        confirmationLevel,
        destination: { lat: destinationLat, lng: destinationLng },
      });

      const signer = this.repositoryContext.getSigner();
      const signerAddress = await signer.getAddress();

      // Step 1: Verify user owns enough tokens
      const diamondAssetContract = new ethers.Contract(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        DIAMOND_ASSET_ABI,
        signer,
      );

      const balance = await diamondAssetContract.balanceOf(
        signerAddress,
        tokenId,
      );
      if (BigInt(balance) < quantity) {
        throw new Error(
          `Insufficient token balance. Have: ${balance.toString()}, Need: ${quantity.toString()}`,
        );
      }

      console.log(
        '[RedemptionService] Token balance verified:',
        balance.toString(),
      );

      // Step 2: Calculate the delivery route through nodes
      console.log('[RedemptionService] Calculating delivery route...');
      const route = await this.routeCalculationService.calculateRoute(
        originNode,
        destinationLat,
        destinationLng,
        confirmationLevel,
      );

      console.log('[RedemptionService] Route calculated:', {
        nodes: route.nodes,
        totalDistance: `${route.totalDistance.toFixed(2)} km`,
        estimatedDays: route.estimatedDays,
      });

      // Step 3: Redeem the tokens (burns tokens and releases custody)
      // This calls the redeem() function which:
      // - Burns the caller's tokens
      // - Releases custody from the specified custodian (origin node)
      // - Emits CustodyReleased event (used to trigger physical delivery)
      console.log(
        '[RedemptionService] Redeeming tokens (burn + release custody)...',
      );
      const redeemTx = await diamondAssetContract.redeem(
        tokenId,
        quantity,
        originNode,
      );
      const redeemReceipt = await redeemTx.wait();
      console.log(
        '[RedemptionService] Tokens redeemed, custody released. Tx:',
        redeemReceipt.hash,
      );

      // Step 4: Get origin node location for parcel data
      const originNodeLocation =
        await this.routeCalculationService.getNodeLocation(originNode);

      // Build parcel data with actual coordinates
      const parcelData: ParcelData = {
        startLocation: originNodeLocation
          ? {
              lat: originNodeLocation.lat.toString(),
              lng: originNodeLocation.lng.toString(),
            }
          : { lat: '0', lng: '0' },
        endLocation: {
          lat: destinationLat.toString(),
          lng: destinationLng.toString(),
        },
        startName:
          originNodeLocation?.addressName || originNode || 'Origin Node',
        endName: deliveryAddress,
      };

      // Step 5: Calculate redemption fee based on route
      const totalFee = this.calculateRedemptionFee(
        quantity,
        route.nodes.length,
      );

      // Build the order with the calculated route
      const order: Order = {
        id: '', // Will be assigned by contract
        token: NEXT_PUBLIC_DIAMOND_ADDRESS,
        tokenId: tokenId,
        tokenQuantity: quantity.toString(),
        price: totalFee.toString(), // Redemption fee
        txFee: (totalFee / 10n).toString(), // 10% to nodes
        buyer: signerAddress,
        seller: originNode || signerAddress, // Origin node is the "seller" in redemption context
        journeyIds: [],
        nodes: route.nodes, // All nodes in the delivery route
        locationData: parcelData,
        currentStatus: OrderStatus.CREATED,
        contractualAgreement: '',
      };

      // Step 6: Create the logistics order via OrderService
      const orderService = this.serviceContext.getOrderService();
      console.log('[RedemptionService] Creating logistics order...');
      const orderId = await orderService.createOrder(order);
      console.log('[RedemptionService] Order created:', orderId);

      // Step 7: Create journeys for each leg of the route
      // For now, create a single journey from origin to destination
      // In the future, this could create multiple journeys for each node hop
      if (route.nodes.length > 0) {
        console.log('[RedemptionService] Creating initial journey...');

        // Calculate driver bounty (portion of the fee distributed across nodes)
        const bountyPerNode = totalFee / BigInt(route.nodes.length) / 5n; // 20% of fee per node

        // Calculate ETA based on route
        const etaMs = Date.now() + route.estimatedDays * 24 * 60 * 60 * 1000;

        const journeyId = await orderService.createOrderJourney(
          orderId,
          route.nodes[0], // First node (origin) is the sender
          signerAddress, // Receiver is the customer
          parcelData,
          bountyPerNode,
          BigInt(etaMs),
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
   * Calculate the redemption fee for a given quantity and node count
   *
   * @param quantity - Number of units to redeem
   * @param nodeCount - Number of nodes in the route (default 1)
   * @returns Fee in USDC (6 decimals)
   */
  calculateRedemptionFee(quantity: bigint, nodeCount: number = 1): bigint {
    const baseRedemptionFee = 5_000_000n; // $5 in USDC (6 decimals)
    const perNodeFee = 3_000_000n; // $3 per intermediate node
    const perUnitFee = 2_000_000n; // $2 per unit

    // Fee increases with more nodes (more security = higher cost)
    const intermediateNodes = Math.max(0, nodeCount - 1);
    return (
      baseRedemptionFee +
      perNodeFee * BigInt(intermediateNodes) +
      perUnitFee * quantity
    );
  }

  /**
   * Get the estimated delivery time based on route
   *
   * @param nodeCount - Number of nodes in the delivery route
   * @returns Estimated delivery time in days
   */
  estimateDeliveryTime(nodeCount: number): number {
    // Base 2 days + 1 day per node in route
    return nodeCount + 2;
  }

  /**
   * Get route calculation service for external use (e.g., previewing routes)
   */
  getRouteCalculationService(): RouteCalculationService {
    return this.routeCalculationService;
  }
}

export default RedemptionService;
