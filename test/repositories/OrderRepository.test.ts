// File: test/repositories/OrderRepository.test.ts
// Unit tests for OrderRepository — the production GraphQL-based order repository.

import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------
const graphqlRequestMock = vi.fn();

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: unknown[]) => graphqlRequestMock(...args),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL: 'https://indexer.test/graphql',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamond',
}));

vi.mock('@/utils/error-handler', () => ({
  handleContractError: vi.fn(),
}));

vi.mock('@/infrastructure/providers/rpc-provider-factory', () => ({
  RpcProviderFactory: { getProvider: vi.fn() },
}));

vi.mock('@/lib/contracts', () => ({
  Ausys__factory: { connect: vi.fn() },
}));

import { OrderRepository } from '@/infrastructure/repositories/orders-repository';
import { OrderStatus } from '@/domain/orders/order';

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------
const BUYER_ADDRESS = '0xBuyer1234'.toLowerCase();
const SELLER_ADDRESS = '0xSeller5678'.toLowerCase();
const USER_ADDRESS = '0xUser9abc'.toLowerCase();

// -------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------
function makeUnifiedOrderEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'evt-1',
    unified_order_id: '0xOrder1',
    clob_order_id: '0xClob1',
    buyer: BUYER_ADDRESS,
    seller: SELLER_ADDRESS,
    token: '0xToken1',
    token_id: '0xTokenId1',
    quantity: '100',
    price: '1000000000000000000',
    block_number: '100',
    block_timestamp: '1700000000',
    transaction_hash: '0xTx1',
    ...overrides,
  };
}

function makeLogisticsEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'log-1',
    unified_order_id: '0xOrder1',
    ausys_order_id: '0xAusys1',
    journey_ids: '0xJourney1',
    bounty: '100000000000000000',
    node: '0xNode1',
    block_number: '110',
    block_timestamp: '1700010000',
    transaction_hash: '0xTxLog1',
    ...overrides,
  };
}

function makeP2PCreatedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'p2p-1',
    order_id: '0xP2P1',
    creator: USER_ADDRESS,
    is_seller_initiated: true,
    token: '0xToken1',
    token_id: '0xTokenId1',
    token_quantity: '50',
    price: '500000000000000000',
    target_counterparty: '0xCounterparty',
    expires_at: '1700100000',
    block_number: '200',
    block_timestamp: '1700050000',
    transaction_hash: '0xTxP2P1',
    ...overrides,
  };
}

function makeP2PAcceptedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'p2p-accept-1',
    order_id: '0xP2P2',
    acceptor: USER_ADDRESS,
    is_seller_initiated: false,
    block_number: '250',
    block_timestamp: '1700060000',
    transaction_hash: '0xTxAccept1',
    ...overrides,
  };
}

// Empty responses
const EMPTY_UNIFIED = { diamondUnifiedOrderCreatedEventss: { items: [] } };
const EMPTY_LOGISTICS = {
  diamondLogisticsOrderCreatedEventss: { items: [] },
};
const EMPTY_P2P_CREATED = { diamondP2POfferCreatedEventss: { items: [] } };
const EMPTY_P2P_ACCEPTED = { diamondP2POfferAcceptedEventss: { items: [] } };
const EMPTY_STATUS = {
  diamondAuSysOrderStatusUpdatedEventss: { items: [] },
};
const EMPTY_JOURNEYS_BY_ORDER = {
  diamondJourneyCreatedEventss: { items: [] },
};
const EMPTY_JOURNEY_STATUS = {
  diamondAuSysJourneyStatusUpdatedEventss: { items: [] },
};

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------
describe('OrderRepository', () => {
  let repo: OrderRepository;

  const mockContract = {} as any;
  const mockProvider = {} as any;
  const mockSigner = {
    getAddress: vi.fn().mockResolvedValue(USER_ADDRESS),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new OrderRepository(mockContract, mockProvider, mockSigner);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =====================================================================
  // getBuyerOrders
  // =====================================================================
  describe('getBuyerOrders', () => {
    it('should return orders for the buyer', async () => {
      const orderEvent = makeUnifiedOrderEvent({ buyer: BUYER_ADDRESS });

      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondUnifiedOrderCreatedEventss: { items: [orderEvent] },
        })
        .mockResolvedValueOnce(EMPTY_LOGISTICS);

      const orders = await repo.getBuyerOrders(BUYER_ADDRESS);

      expect(orders.length).toBe(1);
      expect(orders[0].buyer).toBe(BUYER_ADDRESS);
    });

    it('should return empty array when no orders exist', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_UNIFIED)
        .mockResolvedValueOnce(EMPTY_LOGISTICS);

      const orders = await repo.getBuyerOrders(BUYER_ADDRESS);
      expect(orders).toEqual([]);
    });

    it('should attach logistics node data to orders', async () => {
      const orderEvent = makeUnifiedOrderEvent();
      const logEvent = makeLogisticsEvent({ node: '0xNodeABC' });

      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondUnifiedOrderCreatedEventss: { items: [orderEvent] },
        })
        .mockResolvedValueOnce({
          diamondLogisticsOrderCreatedEventss: { items: [logEvent] },
        });

      const orders = await repo.getBuyerOrders(BUYER_ADDRESS);

      expect(orders.length).toBe(1);
      expect(orders[0].nodes).toContain('0xNodeABC');
    });

    it('should handle GraphQL errors gracefully', async () => {
      graphqlRequestMock.mockRejectedValue(new Error('Network error'));

      const orders = await repo.getBuyerOrders(BUYER_ADDRESS);
      expect(orders).toEqual([]);
    });

    it('should lowercase the buyer address', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_UNIFIED)
        .mockResolvedValueOnce(EMPTY_LOGISTICS);

      await repo.getBuyerOrders('0xBUYER1234');

      const vars = graphqlRequestMock.mock.calls[0][2];
      expect(vars.buyer).toBe('0xbuyer1234');
    });
  });

  // =====================================================================
  // getSellerOrders
  // =====================================================================
  describe('getSellerOrders', () => {
    it('should return orders for the seller', async () => {
      const orderEvent = makeUnifiedOrderEvent({ seller: SELLER_ADDRESS });

      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondUnifiedOrderCreatedEventss: { items: [orderEvent] },
        })
        .mockResolvedValueOnce(EMPTY_LOGISTICS);

      const orders = await repo.getSellerOrders(SELLER_ADDRESS);

      expect(orders.length).toBe(1);
      expect(orders[0].seller).toBe(SELLER_ADDRESS);
    });

    it('should lowercase the seller address', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_UNIFIED)
        .mockResolvedValueOnce(EMPTY_LOGISTICS);

      await repo.getSellerOrders('0xSELLER5678');

      const vars = graphqlRequestMock.mock.calls[0][2];
      expect(vars.seller).toBe('0xseller5678');
    });

    it('should handle GraphQL errors gracefully', async () => {
      graphqlRequestMock.mockRejectedValue(new Error('Network error'));

      const orders = await repo.getSellerOrders(SELLER_ADDRESS);
      expect(orders).toEqual([]);
    });
  });

  // =====================================================================
  // getP2POrdersForUser
  // =====================================================================
  describe('getP2POrdersForUser', () => {
    it('should return P2P orders created by the user', async () => {
      const p2pCreated = makeP2PCreatedEvent();

      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondP2POfferCreatedEventss: { items: [p2pCreated] },
        })
        .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
        .mockResolvedValueOnce({
          diamondP2POfferCreatedEventss: { items: [p2pCreated] },
        })
        .mockResolvedValueOnce(EMPTY_STATUS)
        .mockResolvedValueOnce(EMPTY_JOURNEYS_BY_ORDER)
        .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

      const orders = await repo.getP2POrdersForUser(USER_ADDRESS);

      expect(orders.length).toBe(1);
      expect(orders[0].isP2P).toBe(true);
      expect(orders[0].id).toBe('0xP2P1');
    });

    it('should return P2P orders accepted by the user', async () => {
      const p2pAccepted = makeP2PAcceptedEvent({ order_id: '0xP2P2' });
      const p2pCreatedByOther = makeP2PCreatedEvent({
        order_id: '0xP2P2',
        creator: '0xOtherCreator',
        is_seller_initiated: false,
      });

      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_P2P_CREATED) // no created by user
        .mockResolvedValueOnce({
          diamondP2POfferAcceptedEventss: { items: [p2pAccepted] },
        })
        .mockResolvedValueOnce({
          diamondP2POfferCreatedEventss: { items: [p2pCreatedByOther] },
        })
        .mockResolvedValueOnce(EMPTY_STATUS)
        .mockResolvedValueOnce(EMPTY_JOURNEYS_BY_ORDER)
        .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

      const orders = await repo.getP2POrdersForUser(USER_ADDRESS);

      expect(orders.length).toBe(1);
      expect(orders[0].id).toBe('0xP2P2');
      expect(orders[0].isP2P).toBe(true);
    });

    it('should return empty array when user has no P2P orders', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_P2P_CREATED)
        .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
        .mockResolvedValueOnce(EMPTY_P2P_CREATED)
        .mockResolvedValueOnce(EMPTY_STATUS)
        .mockResolvedValueOnce(EMPTY_JOURNEYS_BY_ORDER)
        .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

      const orders = await repo.getP2POrdersForUser(USER_ADDRESS);
      expect(orders).toEqual([]);
    });

    it('should lowercase the user address for all queries', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_P2P_CREATED)
        .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
        .mockResolvedValueOnce(EMPTY_P2P_CREATED)
        .mockResolvedValueOnce(EMPTY_STATUS)
        .mockResolvedValueOnce(EMPTY_JOURNEYS_BY_ORDER)
        .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

      await repo.getP2POrdersForUser('0xUSER9ABC');

      // Call 0: GET_P2P_OFFERS_BY_CREATOR
      expect(graphqlRequestMock.mock.calls[0][2].creator).toBe('0xuser9abc');
      // Call 1: GET_P2P_OFFERS_ACCEPTED_BY_USER
      expect(graphqlRequestMock.mock.calls[1][2].acceptor).toBe('0xuser9abc');
    });

    it('should handle GraphQL errors gracefully', async () => {
      graphqlRequestMock.mockRejectedValue(new Error('Network error'));

      const orders = await repo.getP2POrdersForUser(USER_ADDRESS);
      expect(orders).toEqual([]);
    });

    it('should deduplicate orders that appear as both created and accepted', async () => {
      const sameOrderId = '0xDupeOrder';
      const created = makeP2PCreatedEvent({
        order_id: sameOrderId,
        creator: USER_ADDRESS,
      });

      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondP2POfferCreatedEventss: { items: [created] },
        })
        .mockResolvedValueOnce({
          diamondP2POfferAcceptedEventss: {
            items: [
              makeP2PAcceptedEvent({
                order_id: sameOrderId,
                acceptor: USER_ADDRESS,
              }),
            ],
          },
        })
        .mockResolvedValueOnce({
          diamondP2POfferCreatedEventss: { items: [created] },
        })
        .mockResolvedValueOnce(EMPTY_STATUS)
        .mockResolvedValueOnce(EMPTY_JOURNEYS_BY_ORDER)
        .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

      const orders = await repo.getP2POrdersForUser(USER_ADDRESS);

      const ids = orders.map((o) => o.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  // =====================================================================
  // getNodeOrders (legacy — uses journeyIds matching, kept for coverage)
  // =====================================================================
  describe('getNodeOrders', () => {
    it('should return empty array when no orders match the node', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce(EMPTY_UNIFIED)
        .mockResolvedValueOnce(EMPTY_LOGISTICS);

      const orders = await repo.getNodeOrders('0xSomeNode');
      expect(orders).toEqual([]);
    });

    it('should handle GraphQL errors gracefully', async () => {
      graphqlRequestMock.mockRejectedValue(new Error('Network error'));

      const orders = await repo.getNodeOrders('0xSomeNode');
      expect(orders).toEqual([]);
    });
  });
});
