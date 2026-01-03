import { graphqlRequest } from './shared/graph';
import {
  GET_CLOB_OPEN_ORDERS,
  GET_CLOB_TRADES,
  GET_CLOB_USER_ORDERS,
  GET_CLOB_USER_TRADES,
  GET_CLOB_BEST_PRICES,
  type CLOBOrderGraphResponse,
  type CLOBTradeGraphResponse,
  type CLOBBestPricesResponse,
} from '../shared/graph-queries';
import { NEXT_PUBLIC_AURUM_SUBGRAPH_URL, NEXT_PUBLIC_CLOB_ADDRESS, NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } from '@/chain-constants';
import { formatEther, parseEther } from 'viem';
import { ethers } from 'ethers';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

/**
 * Order side type
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type
 */
export type OrderType = 'limit' | 'market';

/**
 * Order status
 */
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled';

/**
 * CLOB Order domain model
 */
export interface CLOBOrder {
  id: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: number;
  amount: number;
  filledAmount: number;
  remainingAmount: number;
  isBuy: boolean;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: number;
}

/**
 * CLOB Trade domain model
 */
export interface CLOBTrade {
  id: string;
  takerOrderId: string;
  makerOrderId: string;
  taker: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: number;
  amount: number;
  quoteAmount: number;
  timestamp: number;
  transactionHash: string;
}

/**
 * Order book side data
 */
export interface OrderBookSide {
  price: number;
  quantity: number;
  total: number;
}

/**
 * Aggregated order book data
 */
export interface OrderBookData {
  bids: OrderBookSide[];
  asks: OrderBookSide[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  lastUpdate: number;
}

/**
 * Market statistics
 */
export interface MarketStats {
  baseToken: string;
  baseTokenId: string;
  lastPrice: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  totalVolume: number;
  tradeCount: number;
}

/**
 * Parameters for placing a limit order
 */
export interface PlaceLimitOrderParams {
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: bigint; // Price per unit in wei
  amount: bigint; // Amount of base tokens
  isBuy: boolean; // true for buy order, false for sell order
}

/**
 * Parameters for placing a market order
 */
export interface PlaceMarketOrderParams {
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  amount: bigint; // Amount of base tokens
  isBuy: boolean; // true for buy order, false for sell order
  maxPrice: bigint; // Maximum price willing to pay (for buys) or minimum (for sells)
}

/**
 * Result of order placement
 */
export interface OrderPlacementResult {
  success: boolean;
  orderId?: string;
  transactionHash?: string;
  error?: string;
}

/**
 * CLOB Repository - Manages CLOB trading data from Ponder indexer
 * and handles on-chain order placement via CLOB smart contract
 */
export class CLOBRepository {
  private graphQLEndpoint: string;
  private repositoryContext: RepositoryContext;
  private clobAddress: string;
  private quoteTokenAddress: string;

  constructor() {
    this.graphQLEndpoint = NEXT_PUBLIC_AURUM_SUBGRAPH_URL;
    this.repositoryContext = RepositoryContext.getInstance();
    this.clobAddress = NEXT_PUBLIC_CLOB_ADDRESS;
    this.quoteTokenAddress = NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS || '0x...';

  /**
   * Get open orders for a market
   */
  async getOpenOrders(
    baseToken: string,
    baseTokenId: string,
    limit = 50,
  ): Promise<CLOBOrder[]> {
    try {
      const response = await graphqlRequest<{
        clobOrderss: { items: CLOBOrderGraphResponse[] };
      }>(this.graphQLEndpoint, GET_CLOB_OPEN_ORDERS, {
        baseToken: baseToken.toLowerCase(),
        baseTokenId,
        limit,
      });

      return (response.clobOrderss?.items || []).map(this.mapOrderToDomain);
    } catch (error) {
      console.error('[CLOBRepository] Failed to get open orders:', error);
      return [];
    }
  }

  /**
   * Get recent trades for a market
   */
  async getTrades(
    baseToken: string,
    baseTokenId: string,
    limit: number = 50,
  ): Promise<CLOBTrade[]> {
    try {
      const response = await graphqlRequest<{
        clobTradess: { items: CLOBTradeGraphResponse[] };
      }>(this.graphQLEndpoint, GET_CLOB_TRADES, {
        baseToken: baseToken.toLowerCase(),
        baseTokenId,
        limit,
      });

      return (response.clobTradess?.items || []).map(this.mapTradeToDomain);
    } catch (error) {
      console.error('[CLOBRepository] Failed to get trades:', error);
      return [];
    }
  }

  /**
   * Get user's order history
   */
  async getUserOrders(maker: string, limit: number = 50): Promise<CLOBOrder[]> {
    try {
      const response = await graphqlRequest<{
        clobOrderss: { items: CLOBOrderGraphResponse[] };
      }>(this.graphQLEndpoint, GET_CLOB_USER_ORDERS, {
        maker: maker.toLowerCase(),
        limit,
      });

      return (response.clobOrderss?.items || []).map(this.mapOrderToDomain);
    } catch (error) {
      console.error('[CLOBRepository] Failed to get user orders:', error);
      return [];
    }
  }

  /**
   * Get user's trade history
   */
  async getUserTrades(user: string, limit: number = 50): Promise<CLOBTrade[]> {
    try {
      const response = await graphqlRequest<{
        clobTradess: { items: CLOBTradeGraphResponse[] };
      }>(this.graphQLEndpoint, GET_CLOB_USER_TRADES, {
        user: user.toLowerCase(),
        limit,
      });

      return (response.clobTradess?.items || []).map(this.mapTradeToDomain);
    } catch (error) {
      console.error('[CLOBRepository] Failed to get user trades:', error);
      return [];
    }
  }

  /**
   * Get best bid and ask for a market
   */
  async getBestPrices(
    baseToken: string,
    baseTokenId: string,
  ): Promise<{ bestBid: OrderBookSide | null; bestAsk: OrderBookSide | null }> {
    try {
      const response = await graphqlRequest<CLOBBestPricesResponse>(
        this.graphQLEndpoint,
        GET_CLOB_BEST_PRICES,
        {
          baseToken: baseToken.toLowerCase(),
          baseTokenId,
        },
      );

      const bestBidRaw = response.bestBids?.items?.[0];
      const bestAskRaw = response.bestAsks?.items?.[0];

      return {
        bestBid: bestBidRaw
          ? {
              price: Number(bestBidRaw.price) / 1e18,
              quantity: Number(bestBidRaw.amount),
              total: Number(bestBidRaw.remainingAmount),
            }
          : null,
        bestAsk: bestAskRaw
          ? {
              price: Number(bestAskRaw.price) / 1e18,
              quantity: Number(bestAskRaw.amount),
              total: Number(bestAskRaw.remainingAmount),
            }
          : null,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to get best prices:', error);
      return { bestBid: null, bestAsk: null };
    }
  }

  /**
   * Get aggregated order book for a market
   */
  async getOrderBook(
    baseToken: string,
    baseTokenId: string,
    levels: number = 10,
  ): Promise<OrderBookData> {
    try {
      const orders = await this.getOpenOrders(baseToken, baseTokenId, 100);

      // Separate bids and asks
      const bids = orders
        .filter((o) => o.isBuy)
        .sort((a, b) => b.price - a.price)
        .slice(0, levels);
      const asks = orders
        .filter((o) => !o.isBuy)
        .sort((a, b) => a.price - b.price)
        .slice(0, levels);

      // Calculate cumulative totals
      let bidTotal = 0;
      const bidsWithTotal = bids.map((bid) => {
        bidTotal += bid.remainingAmount;
        return {
          price: bid.price,
          quantity: bid.remainingAmount,
          total: bidTotal,
        };
      });

      let askTotal = 0;
      const asksWithTotal = asks.map((ask) => {
        askTotal += ask.remainingAmount;
        return {
          price: ask.price,
          quantity: ask.remainingAmount,
          total: askTotal,
        };
      });

      // Calculate spread and mid price
      const bestBid = bidsWithTotal[0]?.price || 0;
      const bestAsk = asksWithTotal[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice =
        bestBid > 0 && bestAsk > 0
          ? (bestBid + bestAsk) / 2
          : bestBid || bestAsk || 0;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      return {
        bids: bidsWithTotal,
        asks: asksWithTotal,
        spread,
        spreadPercent,
        midPrice,
        lastUpdate: Date.now(),
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to get order book:', error);
      return {
        bids: [],
        asks: [],
        spread: 0,
        spreadPercent: 0,
        midPrice: 0,
        lastUpdate: Date.now(),
      };
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(
    baseToken: string,
    baseTokenId: string,
  ): Promise<MarketStats> {
    try {
      const trades = await this.getTrades(baseToken, baseTokenId, 100);

      if (trades.length === 0) {
        return {
          baseToken,
          baseTokenId,
          lastPrice: 0,
          change24h: 0,
          volume24h: 0,
          high24h: 0,
          low24h: 0,
          totalVolume: 0,
          tradeCount: 0,
        };
      }

      // Calculate statistics from recent trades
      let high24h = 0;
      let low24h = Infinity;
      let totalVolume = 0;
      let totalQuoteVolume = 0;

      trades.forEach((trade) => {
        if (trade.price > high24h) high24h = trade.price;
        if (trade.price < low24h) low24h = trade.price;
        totalVolume += trade.amount;
        totalQuoteVolume += trade.quoteAmount;
      });

      const lastPrice = trades[0].price;
      const oldestPrice = trades[trades.length - 1].price;
      const change24h =
        oldestPrice > 0 ? ((lastPrice - oldestPrice) / oldestPrice) * 100 : 0;

      return {
        baseToken,
        baseTokenId,
        lastPrice,
        change24h,
        volume24h: totalVolume,
        high24h,
        low24h: low24h === Infinity ? lastPrice : low24h,
        totalVolume: totalQuoteVolume,
        tradeCount: trades.length,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to get market stats:', error);
      return {
        baseToken,
        baseTokenId,
        lastPrice: 0,
        change24h: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        totalVolume: 0,
        tradeCount: 0,
      };
    }
  }

  // ============================================================================
  // WRITE METHODS - On-chain order operations
  // ============================================================================

  /**
   * Get the CLOB contract instance with signer
   */
  private async getContractWithSigner(): Promise<ethers.Contract> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();
    
    // Get CLOB ABI (minimal interface for trading)
    const clobABI = [
      'function placeLimitOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint256 price, uint256 amount, bool isBuy) external returns (bytes32)',
      'function placeMarketOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint256 amount, bool isBuy, uint256 maxPrice) external returns (bytes32)',
      'function cancelOrder(bytes32 orderId) external',
      'function orders(bytes32 orderId) external view returns (bytes32 id, address maker, address baseToken, uint256 baseTokenId, address quoteToken, uint256 price, uint256 amount, uint256 filledAmount, bool isBuy, uint8 orderType, uint8 status, uint256 createdAt, uint256 updatedAt)',
    ];

    const clobContract = new ethers.Contract(
      this.clobAddress,
      clobABI,
      provider,
    );

    return clobContract.connect(signer);
  }

  /**
   * Get quote token contract with signer
   */
  private async getQuoteTokenWithSigner(): Promise<ethers.Contract> {
    const signer = this.repositoryContext.getSigner();
    const provider = this.repositoryContext.getProvider();
    
    const erc20ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)',
    ];

    return new ethers.Contract(
      this.quoteTokenAddress,
      erc20ABI,
      provider,
    ).connect(signer);
  }

  /**
   * Ensure quote token allowance for CLOB contract
   */
  private async ensureQuoteTokenApproval(
    quoteToken: ethers.Contract,
    amount: bigint,
  ): Promise<void> {
    const signerAddress = await this.repositoryContext.getSignerAddress();
    const currentAllowance = await quoteToken.allowance(
      signerAddress,
      this.clobAddress,
    );

    if (currentAllowance < amount) {
      console.log('[CLOBRepository] Approving quote token for CLOB...');
      const tx = await quoteToken.approve(this.clobAddress, amount);
      await tx.wait();
      console.log('[CLOBRepository] Quote token approved:', tx.hash);
    }
  }

  /**
   * Place a limit order on the CLOB
   * @param params Order placement parameters
   * @returns Order placement result
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<OrderPlacementResult> {
    try {
      console.log('[CLOBRepository] Placing limit order:', params);

      const [clobContract, quoteToken] = await Promise.all([
        this.getContractWithSigner(),
        this.getQuoteTokenWithSigner(),
      ]);

      // Calculate total cost (price * amount) for buy orders
      if (params.isBuy) {
        const totalCost = params.price * params.amount;
        await this.ensureQuoteTokenApproval(quoteToken, totalCost);
      }

      // Place the order
      const tx = await clobContract.placeLimitOrder(
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.price,
        params.amount,
        params.isBuy,
      );

      const receipt = await tx.wait();
      console.log('[CLOBRepository] Limit order placed, tx:', receipt.hash);

      // Parse order ID from transaction logs (simplified - would need actual event parsing)
      const orderId = this.extractOrderIdFromTransaction(receipt, params.isBuy);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to place limit order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Place a market order on the CLOB
   * @param params Order placement parameters
   * @returns Order placement result
   */
  async placeMarketOrder(params: PlaceMarketOrderParams): Promise<OrderPlacementResult> {
    try {
      console.log('[CLOBRepository] Placing market order:', params);

      const [clobContract, quoteToken] = await Promise.all([
        this.getContractWithSigner(),
        this.getQuoteTokenWithSigner(),
      ]);

      // Calculate total cost (maxPrice * amount) for buy orders
      if (params.isBuy) {
        const totalCost = params.maxPrice * params.amount;
        await this.ensureQuoteTokenApproval(quoteToken, totalCost);
      }

      // Place the order
      const tx = await clobContract.placeMarketOrder(
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.amount,
        params.isBuy,
        params.maxPrice,
      );

      const receipt = await tx.wait();
      console.log('[CLOBRepository] Market order placed, tx:', receipt.hash);

      const orderId = this.extractOrderIdFromTransaction(receipt, params.isBuy);

      return {
        success: true,
        orderId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('[CLOBRepository] Failed to place market order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an existing order on the CLOB
   * @param orderId The order ID to cancel
   * @returns Cancellation result
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CLOBRepository] Cancelling order:', orderId);

      const clobContract = await this.getContractWithSigner();
      const tx = await clobContract.cancelOrder(orderId);
      const receipt = await tx.wait();

      console.log('[CLOBRepository] Order cancelled, tx:', receipt.hash);

      return { success: true };
    } catch (error) {
      console.error('[CLOBRepository] Failed to cancel order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract order ID from transaction receipt
   * @param receipt Transaction receipt
   * @param isBuy Whether this was a buy order
   * @returns Order ID as hex string
   */
  private extractOrderIdFromTransaction(
    receipt: ethers.TransactionReceipt,
    isBuy: boolean,
  ): string {
    // In a real implementation, you would parse the OrderPlaced event
    // For now, we'll return a placeholder that the indexer will track
    // The actual orderId comes from the contract event
    
    // Try to find OrderPlaced or BuyOrderPlaced/NodeSellOrderPlaced event
    const eventSignature = isBuy
      ? 'BuyOrderPlaced(bytes32,address,address,uint256,address,uint256,uint256)'
      : 'OrderPlaced(bytes32,address,address,uint256,address,uint256,uint256)';
    
    const topic = ethers.id(eventSignature);
    
    for (const log of receipt.logs) {
      if (log.topics[0] === topic) {
        // Order ID is in topics[1]
        return log.topics[1];
      }
    }

    // Fallback: generate from transaction hash and index
    // This won't match the actual contract-generated ID but works for tracking
    console.warn('[CLOBRepository] Could not extract order ID from logs');
    return `0x${receipt.hash.slice(2, 34)}`;
  }

  // ============================================================================
  // Mapping Methods
  // ============================================================================

  /**
   * Map GraphQL order response to domain model
   */
  private mapOrderToDomain(order: CLOBOrderGraphResponse): CLOBOrder {
    const statusNum = Number(order.status);
    let status: OrderStatus;
    if (statusNum === 0) status = 'open';
    else if (statusNum === 1) status = 'partial';
    else if (statusNum === 2) status = 'filled';
    else if (statusNum === 3) status = 'cancelled';
    else status = 'open';

    return {
      id: order.id,
      maker: order.maker,
      baseToken: order.baseToken,
      baseTokenId: order.baseTokenId,
      quoteToken: order.quoteToken,
      price: Number(order.price) / 1e18, // Convert from wei
      amount: Number(order.amount),
      filledAmount: Number(order.filledAmount),
      remainingAmount: Number(order.remainingAmount),
      isBuy: order.isBuy,
      orderType: order.orderType === '0' ? 'limit' : 'market',
      status,
      createdAt: Number(order.createdAt) * 1000,
    };
  }

  /**
   * Map GraphQL trade response to domain model
   */
  private mapTradeToDomain(trade: CLOBTradeGraphResponse): CLOBTrade {
    return {
      id: trade.id,
      takerOrderId: trade.takerOrderId,
      makerOrderId: trade.makerOrderId,
      taker: trade.taker,
      maker: trade.maker,
      baseToken: trade.baseToken,
      baseTokenId: trade.baseTokenId,
      quoteToken: trade.quoteToken,
      price: Number(trade.price) / 1e18,
      amount: Number(trade.amount),
      quoteAmount: Number(trade.quoteAmount) / 1e18,
      timestamp: Number(trade.timestamp) * 1000,
      transactionHash: trade.transactionHash,
    };
  }
}

// Export singleton instance
export const clobRepository = new CLOBRepository();
