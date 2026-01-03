'use client';

import { ethers } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import {
  clobRepository,
  PlaceLimitOrderParams,
  PlaceMarketOrderParams,
  OrderPlacementResult,
} from '@/infrastructure/repositories/clob-repository';
import {
  NEXT_PUBLIC_CLOB_ADDRESS,
  NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
} from '@/chain-constants';

/**
 * Unified order status - tracks complete lifecycle from trade to delivery
 */
export enum UnifiedOrderStatus {
  NONE = 'none',
  PENDING_TRADE = 'pending_trade', // Order placed on CLOB, waiting for match
  TRADE_MATCHED = 'trade_matched', // Trade executed, awaiting logistics
  LOGISTICS_CREATED = 'logistics_created', // Ausys order created
  IN_TRANSIT = 'in_transit', // Package picked up
  DELIVERED = 'delivered', // Package delivered
  SETTLED = 'settled', // All payments distributed
  CANCELLED = 'cancelled', // Order cancelled
}

/**
 * Delivery location data
 */
export interface DeliveryLocation {
  lat: string;
  lng: string;
  name: string;
}

/**
 * Unified order data - combines CLOB trading with Ausys logistics
 */
export interface UnifiedOrder {
  id: string; // Unified order ID
  clobOrderId: string; // CLOB order ID
  clobTradeId: string; // CLOB trade ID (when matched)
  ausysOrderId: string; // Ausys order ID
  journeyIds: string[]; // Ausys journey IDs
  buyer: string;
  seller: string;
  sellerNode: string;
  token: string;
  tokenId: string;
  tokenQuantity: string;
  price: string; // Total price in quote token
  bounty: string; // Driver bounty
  deliveryData: DeliveryLocation;
  status: UnifiedOrderStatus;
  createdAt: number;
  matchedAt: number; // When trade executed
  deliveredAt: number; // When package delivered
  settledAt: number; // When funds distributed
}

/**
 * Parameters for creating a unified order
 */
export interface CreateUnifiedOrderParams {
  clobOrderId: string;
  sellerNode: string;
  deliveryData: DeliveryLocation;
}

/**
 * Result of unified order creation
 */
export interface UnifiedOrderResult {
  success: boolean;
  unifiedOrderId?: string;
  error?: string;
}

/**
 * Result of bridging trade to logistics
 */
export interface BridgeTradeResult {
  success: boolean;
  ausysOrderId?: string;
  journeyIds?: string[];
  error?: string;
}

/**
 * OrderBridgeService - Orchestrates unified order flow: CLOB trading → Ausys logistics
 *
 * This service provides the bridge layer that connects:
 * - CLOB for trading and price discovery
 * - Ausys for multi-node logistics and delivery
 *
 * Unified workflow:
 * 1. Place order on CLOB (price discovery, matching)
 * 2. Trade executes → Bridge auto-creates Ausys logistics order
 * 3. Multi-node journey handles physical delivery
 * 4. Settlement releases funds when delivery confirmed
 */
export class OrderBridgeService {
  private repositoryContext: RepositoryContext;
  private serviceContext: ServiceContext;
  private clobAddress: string;
  private bridgeAddress: string;
  private quoteTokenAddress: string;

  constructor() {
    this.repositoryContext = RepositoryContext.getInstance();
    this.serviceContext = ServiceContext.getInstance();
    this.clobAddress = NEXT_PUBLIC_CLOB_ADDRESS;
    this.bridgeAddress = NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS;
    this.quoteTokenAddress = NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS;
  }

  /**
   * Get the CLOB repository instance
   */
  getCLOBRepository() {
    return clobRepository;
  }

  /**
   * Place a limit order on CLOB and optionally bridge to logistics
   * @param params Order placement parameters
   * @param bridgeToLogistics Whether to immediately bridge to Ausys logistics
   * @param deliveryData Delivery location for logistics (required if bridging)
   * @returns Unified order result
   */
  async placeLimitOrderAndBridge(
    params: PlaceLimitOrderParams,
    bridgeToLogistics: boolean = false,
    deliveryData?: DeliveryLocation,
  ): Promise<UnifiedOrderResult> {
    try {
      console.log(
        '[OrderBridgeService] Placing limit order with bridge:',
        params,
      );

      // Step 1: Place order on CLOB
      const orderResult = await clobRepository.placeLimitOrder(params);

      if (!orderResult.success || !orderResult.orderId) {
        return {
          success: false,
          error: orderResult.error || 'Failed to place CLOB order',
        };
      }

      console.log(
        '[OrderBridgeService] CLOB order placed:',
        orderResult.orderId,
      );

      // Step 2: If bridging enabled, create unified order with Ausys logistics
      if (bridgeToLogistics && deliveryData) {
        return await this.createUnifiedOrder({
          clobOrderId: orderResult.orderId,
          sellerNode: params.isBuy ? '' : '', // Will be set when trade matches
          deliveryData,
        });
      }

      // Return result without bridging
      return {
        success: true,
        unifiedOrderId: orderResult.orderId,
      };
    } catch (error) {
      console.error('[OrderBridgeService] Error placing order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Place a market order on CLOB
   * @param params Order placement parameters
   * @returns Order placement result
   */
  async placeMarketOrder(
    params: PlaceMarketOrderParams,
  ): Promise<OrderPlacementResult> {
    try {
      console.log('[OrderBridgeService] Placing market order:', params);

      // Market orders are executed immediately, so we bridge to logistics
      const result = await clobRepository.placeMarketOrder(params);

      if (result.success) {
        console.log(
          '[OrderBridgeService] Market order executed:',
          result.orderId,
        );
      }

      return result;
    } catch (error) {
      console.error('[OrderBridgeService] Error placing market order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a unified order that bridges CLOB trading with Ausys logistics
   * @param params Unified order creation parameters
   * @returns Unified order result
   */
  async createUnifiedOrder(
    params: CreateUnifiedOrderParams,
  ): Promise<UnifiedOrderResult> {
    try {
      console.log('[OrderBridgeService] Creating unified order:', params);

      const signer = this.repositoryContext.getSigner();
      const signerAddress = await signer.getAddress();

      // Get OrderBridge contract
      const bridgeABI = [
        'function createUnifiedOrder(bytes32 clobOrderId, address sellerNode, (uint256 lat, uint256 lng, string startName, string endName) deliveryData) external returns (bytes32 unifiedOrderId)',
        'function bridgeTradeToLogistics(bytes32 unifiedOrderId) external',
        'function getUnifiedOrder(bytes32 unifiedOrderId) external view returns (bytes32 id, bytes32 clobOrderId, bytes32 clobTradeId, bytes32 ausysOrderId, address buyer, address seller, address sellerNode, address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, uint256 bounty, uint8 status, uint8 logisticsStatus, uint256 createdAt, uint256 matchedAt, uint256 deliveredAt, uint256 settledAt)',
        'function unifiedOrders(bytes32) external view returns (bytes32 id, bytes32 clobOrderId, bytes32 clobTradeId, bytes32 ausysOrderId, address buyer, address seller, address sellerNode, address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, uint256 bounty, uint8 status, uint8 logisticsStatus, uint256 createdAt, uint256 matchedAt, uint256 deliveredAt, uint256 settledAt)',
      ];

      const bridgeContract = new ethers.Contract(
        this.bridgeAddress,
        bridgeABI,
        signer,
      );

      // Format delivery data
      const deliveryData = {
        lat: BigInt(Math.round(parseFloat(params.deliveryData.lat) * 1e6)),
        lng: BigInt(Math.round(parseFloat(params.deliveryData.lng) * 1e6)),
        startName: params.deliveryData.name,
        endName: params.deliveryData.name, // Simplified - would have separate fields
      };

      // Create unified order
      const tx = await bridgeContract.createUnifiedOrder(
        params.clobOrderId,
        params.sellerNode,
        deliveryData,
      );

      const receipt = await tx.wait();
      console.log(
        '[OrderBridgeService] Unified order created, tx:',
        receipt.hash,
      );

      // Extract unified order ID from transaction
      const unifiedOrderId = this.extractUnifiedOrderId(receipt);

      return {
        success: true,
        unifiedOrderId,
      };
    } catch (error) {
      console.error(
        '[OrderBridgeService] Error creating unified order:',
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Bridge a matched trade to Ausys logistics
   * @param unifiedOrderId The unified order to bridge
   * @returns Bridge result
   */
  async bridgeTradeToLogistics(
    unifiedOrderId: string,
  ): Promise<BridgeTradeResult> {
    try {
      console.log(
        '[OrderBridgeService] Bridging trade to logistics:',
        unifiedOrderId,
      );

      const signer = this.repositoryContext.getSigner();

      // Get OrderBridge contract
      const bridgeABI = [
        'function bridgeTradeToLogistics(bytes32 unifiedOrderId) external',
        'function getUnifiedOrder(bytes32 unifiedOrderId) external view returns (bytes32 id, bytes32 clobOrderId, bytes32 clobTradeId, bytes32 ausysOrderId, address buyer, address seller, address sellerNode, address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, uint256 bounty, uint8 status, uint8 logisticsStatus, uint256 createdAt, uint256 matchedAt, uint256 deliveredAt, uint256 settledAt)',
      ];

      const bridgeContract = new ethers.Contract(
        this.bridgeAddress,
        bridgeABI,
        signer,
      );

      // Bridge the trade
      const tx = await bridgeContract.bridgeTradeToLogistics(unifiedOrderId);
      const receipt = await tx.wait();

      console.log(
        '[OrderBridgeService] Trade bridged to logistics, tx:',
        receipt.hash,
      );

      // Get the updated unified order to get Ausys order ID
      const order = await bridgeContract.getUnifiedOrder(unifiedOrderId);

      return {
        success: true,
        ausysOrderId: order.ausysOrderId,
        journeyIds: [], // Would be populated from order.journeyIds
      };
    } catch (error) {
      console.error('[OrderBridgeService] Error bridging trade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get unified order details
   * @param unifiedOrderId The unified order ID
   * @returns Unified order data or null
   */
  async getUnifiedOrder(unifiedOrderId: string): Promise<UnifiedOrder | null> {
    try {
      const signer = this.repositoryContext.getSigner();
      const provider = this.repositoryContext.getProvider();

      const bridgeABI = [
        'function getUnifiedOrder(bytes32 unifiedOrderId) external view returns (bytes32 id, bytes32 clobOrderId, bytes32 clobTradeId, bytes32 ausysOrderId, address buyer, address seller, address sellerNode, address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, uint256 bounty, uint8 status, uint8 logisticsStatus, uint256 createdAt, uint256 matchedAt, uint256 deliveredAt, uint256 settledAt)',
      ];

      const bridgeContract = new ethers.Contract(
        this.bridgeAddress,
        bridgeABI,
        provider,
      );

      const order = await bridgeContract.getUnifiedOrder(unifiedOrderId);

      if (order.id === ethers.ZeroHash) {
        return null;
      }

      // Map contract status to unified status
      const status = this.mapContractStatus(
        order.status,
        order.logisticsStatus,
      );

      return {
        id: order.id,
        clobOrderId: order.clobOrderId,
        clobTradeId: order.clobTradeId,
        ausysOrderId: order.ausysOrderId,
        journeyIds: [],
        buyer: order.buyer,
        seller: order.seller,
        sellerNode: order.sellerNode,
        token: order.token,
        tokenId: order.tokenId.toString(),
        tokenQuantity: order.tokenQuantity.toString(),
        price: order.price.toString(),
        bounty: order.bounty.toString(),
        deliveryData: {
          lat: '0',
          lng: '0',
          name: '',
        },
        status,
        createdAt: Number(order.createdAt) * 1000,
        matchedAt: Number(order.matchedAt) * 1000,
        deliveredAt: Number(order.deliveredAt) * 1000,
        settledAt: Number(order.settledAt) * 1000,
      };
    } catch (error) {
      console.error('[OrderBridgeService] Error getting unified order:', error);
      return null;
    }
  }

  /**
   * Get all unified orders for a buyer
   * @param buyerAddress The buyer's wallet address
   * @returns Array of unified order IDs
   */
  async getBuyerOrders(buyerAddress: string): Promise<string[]> {
    try {
      const signer = this.repositoryContext.getSigner();
      const provider = this.repositoryContext.getProvider();

      const bridgeABI = [
        'function getBuyerOrders(address buyer) external view returns (bytes32[])',
      ];

      const bridgeContract = new ethers.Contract(
        this.bridgeAddress,
        bridgeABI,
        provider,
      );

      const orderIds = await bridgeContract.getBuyerOrders(buyerAddress);
      return orderIds.map((id: string) => id);
    } catch (error) {
      console.error('[OrderBridgeService] Error getting buyer orders:', error);
      return [];
    }
  }

  /**
   * Cancel a unified order
   * @param unifiedOrderId The order to cancel
   * @returns Success status
   */
  async cancelUnifiedOrder(
    unifiedOrderId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(
        '[OrderBridgeService] Cancelling unified order:',
        unifiedOrderId,
      );

      const signer = this.repositoryContext.getSigner();

      const bridgeABI = [
        'function cancelUnifiedOrder(bytes32 unifiedOrderId) external',
      ];

      const bridgeContract = new ethers.Contract(
        this.bridgeAddress,
        bridgeABI,
        signer,
      );

      const tx = await bridgeContract.cancelUnifiedOrder(unifiedOrderId);
      await tx.wait();

      console.log('[OrderBridgeService] Unified order cancelled');
      return { success: true };
    } catch (error) {
      console.error('[OrderBridgeService] Error cancelling order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get order status display text
   */
  getStatusDisplayText(status: UnifiedOrderStatus): string {
    const statusMap: Record<UnifiedOrderStatus, string> = {
      [UnifiedOrderStatus.NONE]: 'Unknown',
      [UnifiedOrderStatus.PENDING_TRADE]: 'Order Placed',
      [UnifiedOrderStatus.TRADE_MATCHED]: 'Trade Matched',
      [UnifiedOrderStatus.LOGISTICS_CREATED]: 'Preparing Delivery',
      [UnifiedOrderStatus.IN_TRANSIT]: 'In Transit',
      [UnifiedOrderStatus.DELIVERED]: 'Delivered',
      [UnifiedOrderStatus.SETTLED]: 'Settled',
      [UnifiedOrderStatus.CANCELLED]: 'Cancelled',
    };
    return statusMap[status] || 'Unknown';
  }

  /**
   * Get order status color for UI
   */
  getStatusColor(status: UnifiedOrderStatus): string {
    const colorMap: Record<UnifiedOrderStatus, string> = {
      [UnifiedOrderStatus.NONE]: 'text-gray-500',
      [UnifiedOrderStatus.PENDING_TRADE]: 'text-blue-500',
      [UnifiedOrderStatus.TRADE_MATCHED]: 'text-purple-500',
      [UnifiedOrderStatus.LOGISTICS_CREATED]: 'text-yellow-500',
      [UnifiedOrderStatus.IN_TRANSIT]: 'text-orange-500',
      [UnifiedOrderStatus.DELIVERED]: 'text-green-500',
      [UnifiedOrderStatus.SETTLED]: 'text-emerald-500',
      [UnifiedOrderStatus.CANCELLED]: 'text-red-500',
    };
    return colorMap[status] || 'text-gray-500';
  }

  /**
   * Extract unified order ID from transaction receipt
   */
  private extractUnifiedOrderId(receipt: ethers.TransactionReceipt): string {
    // Look for UnifiedOrderCreated event
    const eventSignature =
      'UnifiedOrderCreated(bytes32,bytes32,address,address,address,uint256,uint256,uint256)';
    const topic = ethers.id(eventSignature);

    for (const log of receipt.logs) {
      if (log.topics[0] === topic) {
        return log.topics[1];
      }
    }

    // Fallback
    return `0x${receipt.hash.slice(2, 34)}`;
  }

  /**
   * Map contract status to unified status
   */
  private mapContractStatus(
    tradingStatus: number,
    logisticsStatus: number,
  ): UnifiedOrderStatus {
    // Trading status: 0=None, 1=PendingTrade, 2=TradeMatched, 3=LogisticsCreated, 4=Settled, 5=Cancelled
    // Logistics status: 0=None, 1=Pending, 2=InTransit, 3=Delivered

    if (tradingStatus === 5) return UnifiedOrderStatus.CANCELLED;
    if (tradingStatus === 4) return UnifiedOrderStatus.SETTLED;
    if (tradingStatus === 3) return UnifiedOrderStatus.LOGISTICS_CREATED;
    if (tradingStatus === 2) return UnifiedOrderStatus.TRADE_MATCHED;
    if (tradingStatus === 1) return UnifiedOrderStatus.PENDING_TRADE;

    // Check logistics status for in-transit/delivered
    if (logisticsStatus === 3) return UnifiedOrderStatus.DELIVERED;
    if (logisticsStatus === 2) return UnifiedOrderStatus.IN_TRANSIT;

    return UnifiedOrderStatus.NONE;
  }
}

// Export singleton instance
export const orderBridgeService = new OrderBridgeService();
