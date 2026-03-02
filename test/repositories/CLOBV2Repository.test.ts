// File: test/repositories/CLOBV2Repository.test.ts

import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';
import {
  CLOBOrderStatus,
  CLOBOrderType,
  TimeInForce,
  CircuitBreakerStatus,
} from '@/domain/clob/clob';

// =============================================================================
// MOCKS
// =============================================================================

const graphqlRequestMock = vi.fn();

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: unknown[]) => graphqlRequestMock(...args),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AURUM_SUBGRAPH_URL: 'https://indexer.test/graphql',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamond',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0xQuoteToken',
}));

import { CLOBV2Repository } from '@/infrastructure/repositories/clob-v2-repository';

// =============================================================================
// TEST CONSTANTS
// =============================================================================

const BASE_TOKEN = '0x1234567890abcdef1234567890abcdef12345678';
const BASE_TOKEN_ID = '1';
const QUOTE_TOKEN = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const USER_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c';
const ORDER_ID_1 = '0xOrder1' as `0x${string}`;
const ORDER_ID_2 = '0xOrder2' as `0x${string}`;
const TRADE_ID_1 = '0xTrade1' as `0x${string}`;
const MARKET_ID_1 = '0xMarket1' as `0x${string}`;
const COMMITMENT_ID_1 = '0xCommit1';

// =============================================================================
// FIXTURE FACTORIES
// =============================================================================

function makePlacedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'placed-1',
    order_id: ORDER_ID_1,
    maker: USER_ADDRESS,
    base_token: BASE_TOKEN,
    base_token_id: BASE_TOKEN_ID,
    quote_token: QUOTE_TOKEN,
    price: '1000000000000000000',
    amount: '10',
    is_buy: true,
    order_type: 0,
    block_timestamp: '1700000000',
    transaction_hash: '0xTxHash1',
    ...overrides,
  };
}

function makeCancelEvent(overrides: Record<string, unknown> = {}) {
  return {
    order_id: ORDER_ID_1,
    maker: USER_ADDRESS,
    remaining_amount: '10',
    reason: 'user_cancelled',
    block_timestamp: '1700000100',
    ...overrides,
  };
}

function makeFillEvent(overrides: Record<string, unknown> = {}) {
  return {
    order_id: ORDER_ID_1,
    trade_id: TRADE_ID_1,
    fill_amount: '5',
    fill_price: '1000000000000000000',
    remaining_amount: '5',
    cumulative_filled: '5',
    block_timestamp: '1700000050',
    ...overrides,
  };
}

function makeTradeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trade-1',
    trade_id: TRADE_ID_1,
    taker_order_id: ORDER_ID_1,
    maker_order_id: ORDER_ID_2,
    taker: USER_ADDRESS,
    maker: '0xMaker1234567890123456789012345678901234',
    market_id: MARKET_ID_1,
    price: '1000000000000000000',
    amount: '5',
    quote_amount: '5000000000000000000',
    taker_fee: '50000000000000000',
    maker_fee: '25000000000000000',
    timestamp: '1700000050',
    taker_is_buy: true,
    block_timestamp: '1700000050',
    transaction_hash: '0xTradeTxHash',
    ...overrides,
  };
}

function makeMarketEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'market-1',
    market_id: MARKET_ID_1,
    base_token: BASE_TOKEN,
    base_token_id: BASE_TOKEN_ID,
    quote_token: QUOTE_TOKEN,
    block_timestamp: '1700000000',
    transaction_hash: '0xMarketTxHash',
    ...overrides,
  };
}

function makeCircuitBreakerConfigured(overrides: Record<string, unknown> = {}) {
  return {
    market_id: MARKET_ID_1,
    price_change_threshold: '500',
    cooldown_period: '3600',
    is_enabled: true,
    block_timestamp: '1700000000',
    ...overrides,
  };
}

function makeCircuitBreakerTripped(overrides: Record<string, unknown> = {}) {
  return {
    market_id: MARKET_ID_1,
    trigger_price: '2000000000000000000',
    previous_price: '1000000000000000000',
    change_percent: '100',
    cooldown_until: '1700010000',
    block_timestamp: '1700000500',
    ...overrides,
  };
}

function makeCommittedEvent(overrides: Record<string, unknown> = {}) {
  return {
    commitment_id: COMMITMENT_ID_1,
    committer: USER_ADDRESS.toLowerCase(),
    commit_block: '100',
    block_timestamp: '1700000000',
    ...overrides,
  };
}

// =============================================================================
// EMPTY RESPONSES
// =============================================================================

const EMPTY_ORDER_BOOK_RESPONSE = {
  placedOrders: { items: [] },
  routerPlacedOrders: { items: [] },
  cancelledOrders: { items: [] },
  filledOrders: { items: [] },
};

const EMPTY_ORDER_BY_ID_RESPONSE = {
  placedOrders: { items: [] },
  routerPlacedOrders: { items: [] },
  cancellations: { items: [] },
  fills: { items: [] },
};

// =============================================================================
// TEST SUITE
// =============================================================================

describe('CLOBV2Repository', () => {
  let repo: CLOBV2Repository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CLOBV2Repository();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // getOrderById
  // ===========================================================================

  describe('getOrderById', () => {
    it('should return null when no placed order events found', async () => {
      graphqlRequestMock.mockResolvedValueOnce(EMPTY_ORDER_BY_ID_RESPONSE);

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).toBeNull();
    });

    it('should return OPEN order when no fill or cancel events', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.OPEN);
      expect(result!.id).toBe(ORDER_ID_1);
      expect(result!.filledAmount).toBe('0');
      expect(result!.remainingAmount).toBe('10');
    });

    it('should return PARTIAL status when partially filled', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: {
          items: [
            makeFillEvent({ cumulative_filled: '5', remaining_amount: '5' }),
          ],
        },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.PARTIAL);
      expect(result!.filledAmount).toBe('5');
      expect(result!.remainingAmount).toBe('5');
    });

    it('should return FILLED status when fully filled', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: {
          items: [
            makeFillEvent({ cumulative_filled: '10', remaining_amount: '0' }),
          ],
        },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.FILLED);
      expect(result!.filledAmount).toBe('10');
      expect(result!.remainingAmount).toBe('0');
    });

    it('should return CANCELLED status when cancel event exists', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [makeCancelEvent()] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.CANCELLED);
    });

    it('should prioritize CANCELLED over FILLED when both events exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder()] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [makeCancelEvent()] },
        fills: {
          items: [
            makeFillEvent({ cumulative_filled: '10', remaining_amount: '0' }),
          ],
        },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.CANCELLED);
    });

    it('should resolve order from routerPlacedOrders when direct is empty', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [] },
        routerPlacedOrders: { items: [makePlacedOrder()] },
        cancellations: { items: [] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CLOBOrderStatus.OPEN);
    });

    it('should map sell order correctly', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder({ is_buy: false })] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
        fills: { items: [] },
      });

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).not.toBeNull();
      expect(result!.isBuy).toBe(false);
    });

    it('should return null on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getOrderById(ORDER_ID_1);
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getOrderBook
  // ===========================================================================

  describe('getOrderBook', () => {
    it('should return empty order book when no orders exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce(EMPTY_ORDER_BOOK_RESPONSE);

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids).toEqual([]);
      expect(result.asks).toEqual([]);
      expect(result.bestBid).toBeNull();
      expect(result.bestAsk).toBeNull();
      expect(result.spread).toBe('0');
      expect(result.spreadPercent).toBe(0);
    });

    it('should aggregate placed and router orders into bids and asks', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xBid1', is_buy: true, price: '100' }),
          ],
        },
        routerPlacedOrders: {
          items: [
            makePlacedOrder({
              order_id: '0xAsk1',
              is_buy: false,
              price: '110',
            }),
          ],
        },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids.length).toBe(1);
      expect(result.asks.length).toBe(1);
      expect(result.bids[0].price).toBe('100');
      expect(result.asks[0].price).toBe('110');
    });

    it('should filter out cancelled orders', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xBid1', is_buy: true }),
            makePlacedOrder({ order_id: '0xBid2', is_buy: true }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [makeCancelEvent({ order_id: '0xBid1' })] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids.length).toBe(1);
    });

    it('should filter out fully filled orders (remaining = 0)', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xBid1', is_buy: true }),
            makePlacedOrder({ order_id: '0xBid2', is_buy: true }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: {
          items: [makeFillEvent({ order_id: '0xBid1', remaining_amount: '0' })],
        },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      // Only 0xBid2 remains
      expect(result.bids.length).toBe(1);
    });

    it('should keep partially filled orders (remaining > 0)', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [makePlacedOrder({ order_id: '0xBid1', is_buy: true })],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: {
          items: [makeFillEvent({ order_id: '0xBid1', remaining_amount: '3' })],
        },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids.length).toBe(1);
    });

    it('should calculate spread and midPrice correctly', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xBid1', is_buy: true, price: '100' }),
            makePlacedOrder({
              order_id: '0xAsk1',
              is_buy: false,
              price: '110',
            }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bestBid).toBe('100');
      expect(result.bestAsk).toBe('110');
      expect(result.spread).toBe('10'); // 110 - 100
      expect(result.midPrice).toBe('105'); // (100 + 110) / 2
    });

    it('should aggregate multiple orders at the same price level', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({
              order_id: '0xBid1',
              is_buy: true,
              price: '100',
              amount: '5',
            }),
            makePlacedOrder({
              order_id: '0xBid2',
              is_buy: true,
              price: '100',
              amount: '3',
            }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids.length).toBe(1);
      expect(result.bids[0].quantity).toBe('8'); // 5 + 3
      expect(result.bids[0].orderCount).toBe(2);
    });

    it('should lowercase baseToken in query variables', async () => {
      graphqlRequestMock.mockResolvedValueOnce(EMPTY_ORDER_BOOK_RESPONSE);

      const checksummed = '0xabCDEF1234567890ABcDEF1234567890aBCDeF12';
      await repo.getOrderBook(checksummed, BASE_TOKEN_ID, QUOTE_TOKEN);
      const vars = graphqlRequestMock.mock.calls[0][2] as Record<
        string,
        unknown
      >;
      expect(vars.baseToken).toBe(checksummed.toLowerCase());
    });

    it('should return empty order book on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getOrderBook(
        BASE_TOKEN,
        BASE_TOKEN_ID,
        QUOTE_TOKEN,
      );
      expect(result.bids).toEqual([]);
      expect(result.asks).toEqual([]);
      expect(result.bestBid).toBeNull();
      expect(result.bestAsk).toBeNull();
    });
  });

  // ===========================================================================
  // getBestPrices
  // ===========================================================================

  describe('getBestPrices', () => {
    it('should return null for both when market not found', async () => {
      // getMarket call returns no market
      graphqlRequestMock.mockResolvedValueOnce({
        markets: { items: [] },
      });

      const result = await repo.getBestPrices(MARKET_ID_1);
      expect(result.bestBid).toBeNull();
      expect(result.bestAsk).toBeNull();
    });

    it('should return best bid and ask prices from order book', async () => {
      // First call: getMarket
      graphqlRequestMock.mockResolvedValueOnce({
        markets: { items: [makeMarketEvent()] },
      });
      // Second call: getOrderBook
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xBid1', is_buy: true, price: '100' }),
            makePlacedOrder({
              order_id: '0xAsk1',
              is_buy: false,
              price: '120',
            }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getBestPrices(MARKET_ID_1);
      expect(result.bestBid).not.toBeNull();
      expect(result.bestBid!.price).toBe('100');
      expect(result.bestAsk).not.toBeNull();
      expect(result.bestAsk!.price).toBe('120');
    });

    it('should return null on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getBestPrices(MARKET_ID_1);
      expect(result.bestBid).toBeNull();
      expect(result.bestAsk).toBeNull();
    });
  });

  // ===========================================================================
  // getCircuitBreaker
  // ===========================================================================

  describe('getCircuitBreaker', () => {
    it('should return null when no configured event exists', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        configured: { items: [] },
        tripped: { items: [] },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID_1);
      expect(result).toBeNull();
    });

    it('should return ACTIVE status when configured but never tripped', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        configured: { items: [makeCircuitBreakerConfigured()] },
        tripped: { items: [] },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CircuitBreakerStatus.ACTIVE);
      expect(result!.marketId).toBe(MARKET_ID_1);
      expect(result!.priceChangeThreshold).toBe(500);
      expect(result!.cooldownPeriod).toBe(3600);
      expect(result!.isEnabled).toBe(true);
    });

    it('should return TRIPPED status when tripped and cooldown not expired', async () => {
      const futureCooldown = Math.floor(Date.now() / 1000) + 9999;
      graphqlRequestMock.mockResolvedValueOnce({
        configured: { items: [makeCircuitBreakerConfigured()] },
        tripped: {
          items: [
            makeCircuitBreakerTripped({
              cooldown_until: String(futureCooldown),
            }),
          ],
        },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CircuitBreakerStatus.TRIPPED);
      expect(result!.lastPrice).toBe('2000000000000000000');
    });

    it('should return COOLDOWN status when tripped and cooldown expired but not reset', async () => {
      const pastCooldown = Math.floor(Date.now() / 1000) - 9999;
      graphqlRequestMock.mockResolvedValueOnce({
        configured: { items: [makeCircuitBreakerConfigured()] },
        tripped: {
          items: [
            makeCircuitBreakerTripped({ cooldown_until: String(pastCooldown) }),
          ],
        },
        reset: { items: [] },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CircuitBreakerStatus.COOLDOWN);
    });

    it('should return ACTIVE status when reset event is after trip event', async () => {
      const futureCooldown = Math.floor(Date.now() / 1000) + 9999;
      graphqlRequestMock.mockResolvedValueOnce({
        configured: { items: [makeCircuitBreakerConfigured()] },
        tripped: {
          items: [
            makeCircuitBreakerTripped({
              block_timestamp: '1700000500',
              cooldown_until: String(futureCooldown),
            }),
          ],
        },
        reset: {
          items: [
            {
              market_id: MARKET_ID_1,
              reset_at: '1700001000',
              block_timestamp: '1700001000',
            },
          ],
        },
      });

      const result = await repo.getCircuitBreaker(MARKET_ID_1);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(CircuitBreakerStatus.ACTIVE);
    });
  });

  // ===========================================================================
  // getMarket / getAllMarkets
  // ===========================================================================

  describe('getMarket', () => {
    it('should return null when market not found', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        markets: { items: [] },
      });

      const result = await repo.getMarket(MARKET_ID_1);
      expect(result).toBeNull();
    });

    it('should return mapped domain market object', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        markets: { items: [makeMarketEvent()] },
      });

      const result = await repo.getMarket(MARKET_ID_1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(MARKET_ID_1);
      expect(result!.baseToken).toBe(BASE_TOKEN);
      expect(result!.baseTokenId).toBe(BASE_TOKEN_ID);
      expect(result!.quoteToken).toBe(QUOTE_TOKEN);
      expect(result!.active).toBe(true);
      expect(result!.createdAt).toBe(1700000000 * 1000);
    });

    it('should return null on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getMarket(MARKET_ID_1);
      expect(result).toBeNull();
    });
  });

  describe('getAllMarkets', () => {
    it('should return empty array when no markets exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        markets: { items: [] },
      });

      const result = await repo.getAllMarkets();
      expect(result).toEqual([]);
    });

    it('should return array of mapped market objects', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        markets: {
          items: [
            makeMarketEvent({ market_id: '0xMarket1' }),
            makeMarketEvent({ market_id: '0xMarket2', base_token_id: '2' }),
          ],
        },
      });

      const result = await repo.getAllMarkets();
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('0xMarket1');
      expect(result[1].id).toBe('0xMarket2');
    });

    it('should return empty array on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getAllMarkets();
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getCommitment
  // ===========================================================================

  describe('getCommitment', () => {
    it('should return null when commitment not found', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        committed: { items: [] },
        revealed: { items: [] },
      });

      const result = await repo.getCommitment(COMMITMENT_ID_1);
      expect(result).toBeNull();
    });

    it('should return PENDING commitment (not revealed)', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        committed: { items: [makeCommittedEvent()] },
        revealed: { items: [] },
      });

      const result = await repo.getCommitment(COMMITMENT_ID_1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(COMMITMENT_ID_1);
      expect(result!.revealed).toBe(false);
      expect(result!.commitBlock).toBe(100);
      expect(result!.revealDeadline).toBe(110); // 100 + 10
      expect(result!.committer).toBe(USER_ADDRESS.toLowerCase());
    });

    it('should return REVEALED commitment when reveal event exists', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        committed: { items: [makeCommittedEvent()] },
        revealed: {
          items: [{ commitment_id: COMMITMENT_ID_1, order_id: ORDER_ID_1 }],
        },
      });

      const result = await repo.getCommitment(COMMITMENT_ID_1);
      expect(result).not.toBeNull();
      expect(result!.revealed).toBe(true);
    });
  });

  // ===========================================================================
  // getUserCommitments
  // ===========================================================================

  describe('getUserCommitments', () => {
    it('should return empty array when no commitments', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        committed: { items: [] },
        revealed: { items: [] },
      });

      const result = await repo.getUserCommitments(USER_ADDRESS);
      expect(result).toEqual([]);
    });

    it('should return array of commitments with reveal status', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        committed: {
          items: [
            makeCommittedEvent({
              commitment_id: 'commit-A',
              commit_block: '50',
            }),
            makeCommittedEvent({
              commitment_id: 'commit-B',
              commit_block: '60',
            }),
          ],
        },
        revealed: {
          items: [{ commitment_id: 'commit-A', order_id: ORDER_ID_1 }],
        },
      });

      const result = await repo.getUserCommitments(USER_ADDRESS);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('commit-A');
      expect(result[0].revealed).toBe(true);
      expect(result[0].revealDeadline).toBe(60); // 50 + 10
      expect(result[1].id).toBe('commit-B');
      expect(result[1].revealed).toBe(false);
      expect(result[1].revealDeadline).toBe(70); // 60 + 10
    });

    it('should lowercase the user address in query', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        committed: { items: [] },
        revealed: { items: [] },
      });

      await repo.getUserCommitments('0xABCDEF');
      const vars = graphqlRequestMock.mock.calls[0][2] as Record<
        string,
        unknown
      >;
      expect(vars.committer).toBe('0xabcdef');
    });
  });

  // ===========================================================================
  // getMarketId
  // ===========================================================================

  describe('getMarketId', () => {
    it('should return a deterministic keccak256 hash', () => {
      const id1 = repo.getMarketId(BASE_TOKEN, BASE_TOKEN_ID, QUOTE_TOKEN);
      const id2 = repo.getMarketId(BASE_TOKEN, BASE_TOKEN_ID, QUOTE_TOKEN);
      expect(id1).toBe(id2);
      expect(id1.startsWith('0x')).toBe(true);
      expect(id1.length).toBe(66); // 0x + 64 hex chars
    });

    it('should produce different hashes for different inputs', () => {
      const id1 = repo.getMarketId(BASE_TOKEN, '1', QUOTE_TOKEN);
      const id2 = repo.getMarketId(BASE_TOKEN, '2', QUOTE_TOKEN);
      expect(id1).not.toBe(id2);
    });
  });

  // ===========================================================================
  // getOpenOrders
  // ===========================================================================

  describe('getOpenOrders', () => {
    it('should return empty array when no orders exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce(EMPTY_ORDER_BOOK_RESPONSE);

      const result = await repo.getOpenOrders(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result).toEqual([]);
    });

    it('should combine placed and router orders', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder({ order_id: '0xA' })] },
        routerPlacedOrders: { items: [makePlacedOrder({ order_id: '0xB' })] },
        cancelledOrders: { items: [] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOpenOrders(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result.length).toBe(2);
    });

    it('should exclude cancelled orders', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xA' }),
            makePlacedOrder({ order_id: '0xB' }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [makeCancelEvent({ order_id: '0xA' })] },
        filledOrders: { items: [] },
      });

      const result = await repo.getOpenOrders(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('0xB');
    });

    it('should exclude fully filled orders', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder({ order_id: '0xA' })] },
        routerPlacedOrders: { items: [] },
        cancelledOrders: { items: [] },
        filledOrders: {
          items: [makeFillEvent({ order_id: '0xA', remaining_amount: '0' })],
        },
      });

      const result = await repo.getOpenOrders(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result).toEqual([]);
    });

    it('should return empty array on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getOpenOrders(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getUserOrders
  // ===========================================================================

  describe('getUserOrders', () => {
    it('should return empty array when no orders exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [] },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [] },
      });

      const result = await repo.getUserOrders(USER_ADDRESS);
      expect(result).toEqual([]);
    });

    it('should combine placed and router orders for user', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: { items: [makePlacedOrder({ order_id: '0xA' })] },
        routerPlacedOrders: { items: [makePlacedOrder({ order_id: '0xB' })] },
        cancellations: { items: [] },
      });

      const result = await repo.getUserOrders(USER_ADDRESS);
      expect(result.length).toBe(2);
    });

    it('should exclude cancelled orders', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        placedOrders: {
          items: [
            makePlacedOrder({ order_id: '0xA' }),
            makePlacedOrder({ order_id: '0xB' }),
          ],
        },
        routerPlacedOrders: { items: [] },
        cancellations: { items: [makeCancelEvent({ order_id: '0xA' })] },
      });

      const result = await repo.getUserOrders(USER_ADDRESS);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('0xB');
    });

    it('should return empty array on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getUserOrders(USER_ADDRESS);
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getTrades / getTradeById / getUserTrades
  // ===========================================================================

  describe('getTradeById', () => {
    it('should return null when trade not found', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        trades: { items: [] },
      });

      const result = await repo.getTradeById(TRADE_ID_1);
      expect(result).toBeNull();
    });

    it('should return mapped trade domain object', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        trades: { items: [makeTradeEvent()] },
      });

      const result = await repo.getTradeById(TRADE_ID_1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(TRADE_ID_1);
      expect(result!.price).toBe('1000000000000000000');
      expect(result!.amount).toBe('5');
      expect(result!.takerIsBuy).toBe(true);
    });

    it('should return null on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getTradeById(TRADE_ID_1);
      expect(result).toBeNull();
    });
  });

  describe('getTrades', () => {
    it('should return empty array when no trades', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        trades: { items: [] },
      });

      const result = await repo.getTrades(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result).toEqual([]);
    });

    it('should return mapped trades', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        trades: {
          items: [
            makeTradeEvent({ trade_id: '0xT1' }),
            makeTradeEvent({ trade_id: '0xT2' }),
          ],
        },
      });

      const result = await repo.getTrades(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result.length).toBe(2);
    });

    it('should return empty array on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getTrades(BASE_TOKEN, BASE_TOKEN_ID);
      expect(result).toEqual([]);
    });
  });

  describe('getUserTrades', () => {
    it('should return empty array when no trades', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        takerTrades: { items: [] },
        makerTrades: { items: [] },
      });

      const result = await repo.getUserTrades(USER_ADDRESS);
      expect(result).toEqual([]);
    });

    it('should combine and deduplicate taker and maker trades', async () => {
      const sharedTrade = makeTradeEvent({
        id: 'shared-trade',
        trade_id: '0xShared',
      });
      graphqlRequestMock.mockResolvedValueOnce({
        takerTrades: {
          items: [
            sharedTrade,
            makeTradeEvent({ id: 'taker-only', trade_id: '0xTaker' }),
          ],
        },
        makerTrades: { items: [sharedTrade] },
      });

      const result = await repo.getUserTrades(USER_ADDRESS);
      // The shared trade should be deduped by id
      expect(result.length).toBe(2);
    });

    it('should sort trades by timestamp descending', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        takerTrades: {
          items: [
            makeTradeEvent({
              id: 'old',
              trade_id: '0xOld',
              timestamp: '1000',
              block_timestamp: '1000',
            }),
          ],
        },
        makerTrades: {
          items: [
            makeTradeEvent({
              id: 'new',
              trade_id: '0xNew',
              timestamp: '2000',
              block_timestamp: '2000',
            }),
          ],
        },
      });

      const result = await repo.getUserTrades(USER_ADDRESS);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('0xNew');
      expect(result[1].id).toBe('0xOld');
    });

    it('should lowercase user address in query', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        takerTrades: { items: [] },
        makerTrades: { items: [] },
      });

      await repo.getUserTrades('0xABCDEF');
      const vars = graphqlRequestMock.mock.calls[0][2] as Record<
        string,
        unknown
      >;
      expect(vars.user).toBe('0xabcdef');
    });

    it('should return empty array on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getUserTrades(USER_ADDRESS);
      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // getUserTradingStats
  // ===========================================================================

  describe('getUserTradingStats', () => {
    it('should return null when user has no trades', async () => {
      // getUserTrades is called internally which calls graphqlRequest
      graphqlRequestMock.mockResolvedValueOnce({
        takerTrades: { items: [] },
        makerTrades: { items: [] },
      });

      const result = await repo.getUserTradingStats(USER_ADDRESS);
      expect(result).toBeNull();
    });

    it('should return computed stats from trade history', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        takerTrades: {
          items: [
            makeTradeEvent({
              id: 't1',
              trade_id: '0xT1',
              taker: USER_ADDRESS.toLowerCase(),
              maker: '0xOtherMaker',
              quote_amount: '1000',
              timestamp: '100',
            }),
            makeTradeEvent({
              id: 't2',
              trade_id: '0xT2',
              taker: USER_ADDRESS.toLowerCase(),
              maker: '0xOtherMaker',
              quote_amount: '2000',
              timestamp: '200',
            }),
          ],
        },
        makerTrades: { items: [] },
      });

      const result = await repo.getUserTradingStats(USER_ADDRESS);
      expect(result).not.toBeNull();
      expect(result!.user).toBe(USER_ADDRESS);
      expect(result!.totalOrdersFilled).toBe('2');
    });
  });

  // ===========================================================================
  // getMarketStats
  // ===========================================================================

  describe('getMarketStats', () => {
    it('should return empty stats when no trades exist', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        trades: { items: [] },
      });

      const result = await repo.getMarketStats(MARKET_ID_1);
      expect(result.marketId).toBe(MARKET_ID_1);
      expect(result.lastPrice).toBe('0');
      expect(result.tradeCount).toBe(0);
      expect(result.volume24h).toBe('0');
    });

    it('should compute stats from trades', async () => {
      graphqlRequestMock.mockResolvedValueOnce({
        trades: {
          items: [
            makeTradeEvent({ price: '150', amount: '10', timestamp: '2000' }),
            makeTradeEvent({
              id: 't2',
              trade_id: '0xT2',
              price: '100',
              amount: '5',
              timestamp: '1000',
            }),
          ],
        },
      });

      const result = await repo.getMarketStats(MARKET_ID_1);
      expect(result.tradeCount).toBe(2);
      expect(result.lastPrice).toBe('150');
      expect(result.high24h).toBe('150');
      expect(result.low24h).toBe('100');
    });

    it('should return empty stats on GraphQL error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getMarketStats(MARKET_ID_1);
      expect(result.lastPrice).toBe('0');
      expect(result.tradeCount).toBe(0);
    });
  });

  // ===========================================================================
  // getVolumeByBaseTokenId
  // ===========================================================================

  describe('getVolumeByBaseTokenId', () => {
    it('should return empty map when no markets or trades', async () => {
      // First call: getAllMarkets
      graphqlRequestMock.mockResolvedValueOnce({ markets: { items: [] } });
      // Second call: getTrades
      graphqlRequestMock.mockResolvedValueOnce({ trades: { items: [] } });

      const result = await repo.getVolumeByBaseTokenId();
      expect(result.size).toBe(0);
    });

    it('should aggregate volumes by base token id', async () => {
      // First call: getAllMarkets
      graphqlRequestMock.mockResolvedValueOnce({
        markets: {
          items: [
            makeMarketEvent({ market_id: '0xM1', base_token_id: '1' }),
            makeMarketEvent({ market_id: '0xM2', base_token_id: '2' }),
          ],
        },
      });
      // Second call: getTrades
      graphqlRequestMock.mockResolvedValueOnce({
        trades: {
          items: [
            makeTradeEvent({ market_id: '0xM1', quote_amount: '500' }),
            makeTradeEvent({
              id: 't2',
              market_id: '0xM1',
              quote_amount: '300',
            }),
            makeTradeEvent({
              id: 't3',
              market_id: '0xM2',
              quote_amount: '200',
            }),
          ],
        },
      });

      const result = await repo.getVolumeByBaseTokenId();
      expect(result.get('1')).toBe(800n);
      expect(result.get('2')).toBe(200n);
    });

    it('should return empty map on error', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await repo.getVolumeByBaseTokenId();
      expect(result.size).toBe(0);
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('Constructor', () => {
    it('should initialize with mocked constants', () => {
      expect(repo).toBeInstanceOf(CLOBV2Repository);
    });
  });
});
