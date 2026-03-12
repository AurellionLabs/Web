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
  originNode: string; // Backward-compatible fallback
  originCustodianAddress?: string;
  originNodeHash?: string;
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
  'function redeemFromNode(uint256 tokenId, uint256 amount, address custodian, bytes32 nodeHash) external',
  'function getCustodyInfo(uint256 tokenId, address custodian) external view returns (uint256 amount)',
  'function getNodeCustodyInfo(uint256 tokenId, bytes32 nodeHash) external view returns (uint256 amount)',
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
      originCustodianAddress,
      originNodeHash,
      confirmationLevel,
      destinationLat,
      destinationLng,
    } = params;

    try {
      const signer = this.repositoryContext.getSigner();
      const signerAddress = await signer.getAddress();

      // Step 1: Verify user owns enough tokens
      const diamondAssetContract = new ethers.Contract(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        DIAMOND_ASSET_ABI,
        signer,
      );

      const custodianAddress = (
        originCustodianAddress || originNode
      ).toLowerCase();
      const routeOriginNode = originNodeHash || originNode;

      if (!custodianAddress || custodianAddress === ethers.ZeroAddress) {
        throw new Error('No origin custody node provided for redemption');
      }

      // originNodeHash is required for redeemFromNode — it must be a bytes32 node hash,
      // not a wallet address. The node hash is what originNodeHash carries.
      if (!originNodeHash) {
        throw new Error(
          'originNodeHash is required for redemption — specify the exact node the asset is custodied at.',
        );
      }

      // Validate on-chain custody at the specific node (more precise than wallet-level check).
      const nodeCustodyAmount = await diamondAssetContract.getNodeCustodyInfo(
        tokenId,
        originNodeHash,
      );
      if (BigInt(nodeCustodyAmount) < quantity) {
        throw new Error(
          `Insufficient custody at node ${originNodeHash} for this redemption. ` +
            `Node has ${nodeCustodyAmount.toString()} in custody, need ${quantity.toString()}.`,
        );
      }

      if (custodianAddress === signerAddress.toLowerCase()) {
        throw new Error(
          'Custodian wallets cannot redeem assets from their own custody',
        );
      }

      const balance = await diamondAssetContract.balanceOf(
        signerAddress,
        tokenId,
      );
      if (BigInt(balance) < quantity) {
        throw new Error(
          `Insufficient token balance. Have: ${balance.toString()}, Need: ${quantity.toString()}`,
        );
      }

      // Step 2: Calculate the delivery route through nodes
      const route = await this.routeCalculationService.calculateRoute(
        routeOriginNode,
        destinationLat,
        destinationLng,
        confirmationLevel,
      );

      // Step 3: Redeem the tokens — burns tokens and releases custody at node level.
      // redeemFromNode() is preferred over redeem() because it correctly decrements
      // tokenNodeCustodyAmounts[nodeHash] in addition to the wallet-level
      // tokenCustodianAmounts[custodian]. Using plain redeem() left tokenNodeCustodyAmounts
      // stale (always showing original minted amount) causing the node dashboard to
      // display inflated capacity figures after redemptions.
      const redeemTx = await diamondAssetContract.redeemFromNode(
        tokenId,
        quantity,
        custodianAddress,
        originNodeHash,
      );
      const redeemReceipt = await redeemTx.wait();

      // Step 4: Get origin node location for parcel data
      const originNodeLocation =
        await this.routeCalculationService.getNodeLocation(routeOriginNode);

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
          originNodeLocation?.addressName || routeOriginNode || 'Origin Node',
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
        seller: routeOriginNode,
        journeyIds: [],
        nodes: route.nodes, // All nodes in the delivery route
        locationData: parcelData,
        currentStatus: OrderStatus.CREATED,
        contractualAgreement: '',
      };

      // Step 6: Create the logistics order via OrderService
      const orderService = this.serviceContext.getOrderService();
      const orderId = await orderService.createOrder(order);

      // Step 7: Create journeys for each leg of the route
      // For now, create a single journey from origin to destination
      // In the future, this could create multiple journeys for each node hop
      if (route.nodes.length > 0) {
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
