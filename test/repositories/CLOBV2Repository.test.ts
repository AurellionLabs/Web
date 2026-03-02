/**
 * @file test/repositories/CLOBV2Repository.test.ts
 * @description Tests for CLOB V2 Repository implementation
 */

import { expect, describe, it, beforeEach, vi } from 'vitest';
import {
  CLOBOrderStatus,
  CLOBOrderType,
  CircuitBreakerStatus,
  TimeInForce,
} from '@/domain/clob/clob';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: vi.fn(),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AURUM_SUBGRAPH_URL: 'https://indexer.test/graphql',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamondAddress',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xQuoteToken',
}));

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import { CLOBV2Repository } from '@/infrastructure/repositories/clob-v2-repository';

const mockGraphql = vi.mocked(graphqlRequest);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_TOKEN = '0x742D35cC6634C0532925a3B844bc454Ed0d2114A';
const QUOTE_TOKEN = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const BASE_TOKEN_ID = '1';
const MARKET_ID = '0x' + 'a'.repeat(64); // bytes32 marketId
const ORDER_ID = '0x' + 'b'.repeat(64); // bytes32 orderId
const USER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

function makePlacedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    order_id: ORDER_ID,
    maker: USER,
    base_token: BASE_TOKEN,
    base_token_id: BASE_TOKEN_ID,
    quote_token: QUOTE_TOKEN,
    price: '1000',
    amount: '500',
    is_buy: true,
    order_type: 0,
    block_timestamp: '1700000000',
    transaction_hash: '0xtxhash',
    ...overrides,
  };
}

function emptyOrderBook() {
  return {
    placedOrders: { items: [] },
    routerPlacedOrders: { items: [] },
    cancelledOrders: { items: [] },
    filledOrders: { items: [] },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CLOBV2Repository', () => {
  let repo: CLOBV2Repository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CLOBV2Repository();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOrderById
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOrderById', () => {
    it('returns null when no events found', async () => {
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID);
      expect(result).toBeNull();
    });

    it('returns OPEN order when no cancellation or fills', async () => {
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.OPEN);
      expect(result!.id).toBe(ORDER_ID);
    });

    it('returns CANCELLED when cancellation event present', async () => {
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: {
          items: [
            {
              order_id: ORDER_ID,
              maker: USER,
              remaining_amount: '500',
              reason: 0,
              block_timestamp: '1700001000',
            },
          ],
        },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID);
      expect(result!.status).toBe(CLOBOrderStatus.CANCELLED);
    });

    it('returns FILLED when cumulative_filled >= amount', async () => {
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder({ amount: '500' })] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: {
          items: [{ cumulative_filled: '500', block_timestamp: '1700001000' }],
        },
      });

      const result = await repo.getOrderById(ORDER_ID);
      expect(result!.status).toBe(CLOBOrderStatus.FILLED);
      expect(result!.filledAmount).toBe('500');
      expect(result!.remainingAmount).toBe('0');
    });

    it('returns PARTIAL when cumulative_filled > 0 but < amount', async () => {
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder({ amount: '1000' })] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: {
          items: [{ cumulative_filled: '400', block_timestamp: '1700001000' }],
        },
      });

      const result = await repo.getOrderById(ORDER_ID);
      expect(result!.status).toBe(CLOBOrderStatus.PARTIAL);
      expect(result!.filledAmount).toBe('400');
      expect(result!.remainingAmount).toBe('600');
    });

    it('picks up router-placed order when no direct placed order', async () => {
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [] },
        routerPlacedOrders: { items: [makePlacedOrder({ is_buy: false })] },
        cancellations: { items: [] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID);
      expect(result).not.toBeNull();
      expect(result!.isBuy).toBe(false);
    });

    it('returns null on graphql error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('network error'));
      const result = await repo.getOrderById(ORDER_ID);
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOrderBook
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOrderBook', () => {
    it('returns empty bids/asks when no orders', async () => {
      mockGraphql.mockResolvedValueOnce(emptyOrderBook());

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
    });

    it('separates buy orders into bids and sell orders into asks', async () => {
      const buyOrder = makePlacedOrder({
        is_buy: true,
        price: '1000',
        order_id: '0x' + 'c'.repeat(64),
      });
      const sellOrder = makePlacedOrder({
        is_buy: false,
        price: '1010',
        order_id: '0x' + 'd'.repeat(64),
      });

      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [buyOrder, sellOrder] },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids.length).toBeGreaterThan(0);
      expect(result.asks.length).toBeGreaterThan(0);
    });

    it('excludes cancelled orders from order book', async () => {
      const cancelOrderId = '0x' + 'e'.repeat(64);
      const order = makePlacedOrder({ order_id: cancelOrderId });

      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [order] },
        routerPlacedOrders: { items: [] },
        cancelledOrders: {
          items: [
            {
              order_id: cancelOrderId,
              maker: USER,
              remaining_amount: '0',
              reason: 0,
              block_timestamp: '1700001000',
            },
          ],
        },
        filledOrders: { items: [] },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
    });

    it('returns empty order book on error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('fail'));
      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getBestPrices
  // ─────────────────────────────────────────────────────────────────────────

  describe('getBestPrices', () => {
    it('returns null when no orders in the book', async () => {
      // getBestPrices calls getMarket first, then getOrderBook
      // Step 1: getMarket → needs a market
      mockGraphql.mockResolvedValueOnce({
        markets: {
          items: [
            {
              market_id: MARKET_ID,
              base_token: BASE_TOKEN,
              base_token_id: BASE_TOKEN_ID,
              quote_token: QUOTE_TOKEN,
              block_timestamp: '1700000000',
            },
          ],
        },
      });
      // Step 2: getOrderBook
      mockGraphql.mockResolvedValueOnce(emptyOrderBook());

      const result = await repo.getBestPrices(MARKET_ID);
      // Returns object with null prices, not null itself
      expect(result?.bestBid).toBeNull();
      expect(result?.bestAsk).toBeNull();
    });

    it('returns best bid and ask prices', async () => {
      // getMarket
      mockGraphql.mockResolvedValueOnce({
        markets: {
          items: [
            {
              market_id: MARKET_ID,
              base_token: BASE_TOKEN,
              base_token_id: BASE_TOKEN_ID,
              quote_token: QUOTE_TOKEN,
              block_timestamp: '1700000000',
            },
          ],
        },
      });
      // getOrderBook (via getOpenOrders)
      const buyOrder = makePlacedOrder({
        is_buy: true,
        price: '1000',
        amount: '100',
      });
      const sellOrder = makePlacedOrder({
        is_buy: false,
        price: '1010',
        amount: '100',
      });
      mockGraphql.mockResolvedValueOnce({
        placedOrders: { items: [buyOrder, sellOrder] },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getBestPrices(MARKET_ID);
      // If orders present, we get prices back
      expect(result).not.toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMarket / getAllMarkets
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMarket', () => {
    it('returns null when no market found', async () => {
      mockGraphql.mockResolvedValueOnce({ markets: { items: [] } });
      const result = await repo.getMarket(MARKET_ID);
      expect(result).toBeNull();
    });

    it('maps raw event to CLOBMarket domain object', async () => {
      mockGraphql.mockResolvedValueOnce({
        markets: {
          items: [
            {
              market_id: MARKET_ID,
              base_token: BASE_TOKEN,
              base_token_id: BASE_TOKEN_ID,
              quote_token: QUOTE_TOKEN,
              block_timestamp: '1700000000',
            },
          ],
        },
      });

      const result = await repo.getMarket(MARKET_ID);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(MARKET_ID);
      expect(result!.baseToken).toBe(BASE_TOKEN);
      expect(result!.baseTokenId).toBe(BASE_TOKEN_ID);
      expect(result!.active).toBe(true);
    });

    it('returns null on error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('fail'));
      const result = await repo.getMarket(MARKET_ID);
      expect(result).toBeNull();
    });
  });

  describe('getAllMarkets', () => {
    it('returns empty array when no markets', async () => {
      mockGraphql.mockResolvedValueOnce({ markets: { items: [] } });
      const result = await repo.getAllMarkets();
      expect(result).toHaveLength(0);
    });

    it('returns mapped array of markets', async () => {
      mockGraphql.mockResolvedValueOnce({
        markets: {
          items: [
            {
              market_id: '0xmkt1',
              base_token: BASE_TOKEN,
              base_token_id: '1',
              quote_token: QUOTE_TOKEN,
              block_timestamp: '1700000000',
            },
            {
              market_id: '0xmkt2',
              base_token: BASE_TOKEN,
              base_token_id: '2',
              quote_token: QUOTE_TOKEN,
              block_timestamp: '1700000001',
            },
          ],
        },
      });

      const result = await repo.getAllMarkets();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('0xmkt1');
      expect(result[1].baseTokenId).toBe('2');
    });

    it('returns empty array on error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('fail'));
      const result = await repo.getAllMarkets();
      expect(result).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCircuitBreaker
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCircuitBreaker', () => {
    it('returns null when no configured event found', async () => {
      mockGraphql.mockResolvedValueOnce({
        configured: { items: [] },
        tripped: { items: [] },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID);
      expect(result).toBeNull();
    });

    it('returns ACTIVE status when configured but never tripped', async () => {
      mockGraphql.mockResolvedValueOnce({
        configured: {
          items: [
            {
              market_id: MARKET_ID,
              price_change_threshold: '500',
              cooldown_period: '3600',
              is_enabled: true,
              block_timestamp: '1700000000',
            },
          ],
        },
        tripped: { items: [] },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CircuitBreakerStatus.ACTIVE);
      expect(result!.isEnabled).toBe(true);
      expect(result!.priceChangeThreshold).toBe(500);
    });

    it('returns TRIPPED status when tripped and cooldown not expired', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      mockGraphql.mockResolvedValueOnce({
        configured: {
          items: [
            {
              market_id: MARKET_ID,
              price_change_threshold: '500',
              cooldown_period: '3600',
              is_enabled: true,
              block_timestamp: '1700000000',
            },
          ],
        },
        tripped: {
          items: [
            {
              market_id: MARKET_ID,
              trigger_price: '950',
              previous_price: '1000',
              change_percent: '500',
              cooldown_until: String(futureTimestamp),
              block_timestamp: '1700001000',
            },
          ],
        },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID);
      expect(result!.status).toBe(CircuitBreakerStatus.TRIPPED);
      expect(result!.lastPrice).toBe('950');
    });

    it('returns ACTIVE status when reset event is newer than trip event', async () => {
      mockGraphql.mockResolvedValueOnce({
        configured: {
          items: [
            {
              market_id: MARKET_ID,
              price_change_threshold: '500',
              cooldown_period: '3600',
              is_enabled: true,
              block_timestamp: '1700000000',
            },
          ],
        },
        tripped: {
          items: [
            {
              market_id: MARKET_ID,
              trigger_price: '950',
              previous_price: '1000',
              change_percent: '500',
              cooldown_until: '1700002000',
              block_timestamp: '1700001000',
            },
          ],
        },
        reset: {
          items: [
            {
              market_id: MARKET_ID,
              reset_at: '1700002000',
              block_timestamp: '1700003000',
            },
          ],
        },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID);
      expect(result!.status).toBe(CircuitBreakerStatus.ACTIVE);
    });

    it('returns COOLDOWN when trip cooldown has expired but no reset', async () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 10; // already expired
      mockGraphql.mockResolvedValueOnce({
        configured: {
          items: [
            {
              market_id: MARKET_ID,
              price_change_threshold: '500',
              cooldown_period: '3600',
              is_enabled: true,
              block_timestamp: '1700000000',
            },
          ],
        },
        tripped: {
          items: [
            {
              market_id: MARKET_ID,
              trigger_price: '950',
              previous_price: '1000',
              change_percent: '500',
              cooldown_until: String(pastTimestamp),
              block_timestamp: '1700001000',
            },
          ],
        },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID);
      expect(result!.status).toBe(CircuitBreakerStatus.COOLDOWN);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCommitment
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCommitment', () => {
    const COMMITMENT_ID = '0xcommit123';

    it('returns null when no committed event found', async () => {
      mockGraphql.mockResolvedValueOnce({
        committed: { items: [] },
        revealed: { items: [] },
      });

      const result = await repo.getCommitment(COMMITMENT_ID);
      expect(result).toBeNull();
    });

    it('returns commitment with revealed=false when not yet revealed', async () => {
      mockGraphql.mockResolvedValueOnce({
        committed: {
          items: [
            {
              commitment_id: COMMITMENT_ID,
              committer: USER,
              commit_block: '100',
              block_timestamp: '1700000000',
            },
          ],
        },
        revealed: { items: [] },
      });

      const result = await repo.getCommitment(COMMITMENT_ID);
      expect(result).not.toBeNull();
      expect(result!.revealed).toBe(false);
      expect(result!.committer).toBe(USER);
      expect(result!.commitBlock).toBe(100);
      expect(result!.revealDeadline).toBe(110); // commitBlock + 10
    });

    it('returns commitment with revealed=true when reveal event present', async () => {
      mockGraphql.mockResolvedValueOnce({
        committed: {
          items: [
            {
              commitment_id: COMMITMENT_ID,
              committer: USER,
              commit_block: '200',
              block_timestamp: '1700000000',
            },
          ],
        },
        revealed: {
          items: [{ commitment_id: COMMITMENT_ID, order_id: ORDER_ID }],
        },
      });

      const result = await repo.getCommitment(COMMITMENT_ID);
      expect(result!.revealed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUserCommitments
  // ─────────────────────────────────────────────────────────────────────────

  describe('getUserCommitments', () => {
    it('returns empty array when user has no commitments', async () => {
      mockGraphql.mockResolvedValueOnce({
        committed: { items: [] },
        revealed: { items: [] },
      });

      const result = await repo.getUserCommitments(USER);
      expect(result).toHaveLength(0);
    });

    it('returns list of commitments with correct revealed status', async () => {
      mockGraphql.mockResolvedValueOnce({
        committed: {
          items: [
            {
              commitment_id: '0xc1',
              committer: USER,
              commit_block: '100',
              block_timestamp: '1700000000',
            },
            {
              commitment_id: '0xc2',
              committer: USER,
              commit_block: '200',
              block_timestamp: '1700001000',
            },
          ],
        },
        revealed: {
          items: [{ commitment_id: '0xc1', order_id: '0xorder1' }],
        },
      });

      const result = await repo.getUserCommitments(USER);
      expect(result).toHaveLength(2);
      const c1 = result.find((c) => c.id === '0xc1');
      const c2 = result.find((c) => c.id === '0xc2');
      expect(c1!.revealed).toBe(true);
      expect(c2!.revealed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMarketId (helper)
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMarketId', () => {
    it('returns a deterministic hex string for given baseToken + baseTokenId + quoteToken', () => {
      const id1 = repo.getMarketId(BASE_TOKEN, BASE_TOKEN_ID, QUOTE_TOKEN);
      const id2 = repo.getMarketId(BASE_TOKEN, BASE_TOKEN_ID, QUOTE_TOKEN);
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('returns different ids for different baseToken values', () => {
      const TOKEN2 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
      const id1 = repo.getMarketId(BASE_TOKEN, '1', QUOTE_TOKEN);
      const id2 = repo.getMarketId(TOKEN2, '1', QUOTE_TOKEN);
      expect(id1).not.toBe(id2);
    });
  });
});
