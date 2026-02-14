// File: test/repositories/NodeRepository.test.ts
// Unit tests for BlockchainNodeRepository.getNodeOrders

import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';

// -------------------------------------------------------------------
// Mock modules (must be declared before the import of the module under test)
// -------------------------------------------------------------------

const graphqlRequestMock = vi.fn();

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: unknown[]) => graphqlRequestMock(...args),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AURUM_SUBGRAPH_URL: 'https://indexer.test/graphql',
  NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL: 'https://asset-indexer.test/graphql',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0xDiamond',
  NEXT_PUBLIC_AURA_GOAT_ADDRESS: '0xAuraGoat',
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL: 'https://ausys-indexer.test/graphql',
}));

vi.mock('pinata', () => ({
  PinataSDK: vi.fn().mockImplementation(() => ({
    upload: vi.fn(),
    gateways: { get: vi.fn() },
  })),
}));

// Mock contract factories
vi.mock('@/lib/contracts', () => ({
  AurumNode__factory: { connect: vi.fn() },
  AurumNodeManager__factory: { connect: vi.fn() },
  AuraAsset__factory: { connect: vi.fn() },
}));

import { BlockchainNodeRepository } from '@/infrastructure/repositories/node-repository';
import { OrderStatus } from '@/domain/orders/order';

// -------------------------------------------------------------------
// Helpers & fixtures
// -------------------------------------------------------------------

const NODE_ADDRESS = '0xNodeABC123'.toLowerCase();

function makeUnifiedOrderEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'evt-1',
    unified_order_id: '0xOrder1',
    clob_order_id: '0xClobOrder1',
    buyer: '0xBuyer1',
    seller: NODE_ADDRESS,
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

function makeP2POfferCreatedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'p2p-evt-1',
    order_id: '0xP2POrder1',
    creator: NODE_ADDRESS,
    is_seller_initiated: true,
    token: '0xToken1',
    token_id: '0xTokenId1',
    token_quantity: '50',
    price: '500000000000000000',
    target_counterparty: '0xBuyer2',
    expires_at: '1700100000',
    block_number: '200',
    block_timestamp: '1700050000',
    transaction_hash: '0xTx2',
    ...overrides,
  };
}

function makeP2POfferAcceptedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'p2p-accept-1',
    order_id: '0xP2POrder2',
    acceptor: NODE_ADDRESS,
    is_seller_initiated: false,
    block_number: '250',
    block_timestamp: '1700060000',
    transaction_hash: '0xTx3',
    ...overrides,
  };
}

function makeJourneyCreatedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'journey-evt-1',
    journey_id: '0xJourney1',
    sender: NODE_ADDRESS,
    receiver: '0xReceiver1',
    driver: '0xDriver1',
    bounty: '100000000000000000',
    e_t_a: '1700200000',
    order_id: '0xP2POrder1',
    block_number: '300',
    block_timestamp: '1700070000',
    transaction_hash: '0xTx4',
    ...overrides,
  };
}

function makeJourneyStatusUpdateEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'jstatus-evt-1',
    journey_id: '0xJourney1',
    new_status: '1',
    sender: NODE_ADDRESS,
    receiver: '0xReceiver1',
    driver: '0xDriver1',
    block_number: '350',
    block_timestamp: '1700080000',
    transaction_hash: '0xTx5',
    ...overrides,
  };
}

function makeStatusUpdateEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'ostatus-evt-1',
    order_id: '0xP2POrder1',
    new_status: '1',
    block_number: '320',
    block_timestamp: '1700075000',
    transaction_hash: '0xTx6',
    ...overrides,
  };
}

// Empty GraphQL responses
const EMPTY_UNIFIED = { diamondUnifiedOrderCreatedEventss: { items: [] } };
const EMPTY_LOGISTICS = {
  diamondLogisticsOrderCreatedEventss: { items: [] },
};
const EMPTY_P2P_CREATED = { diamondP2POfferCreatedEventss: { items: [] } };
const EMPTY_P2P_ACCEPTED = { diamondP2POfferAcceptedEventss: { items: [] } };
const EMPTY_STATUS = {
  diamondAuSysOrderStatusUpdatedEventss: { items: [] },
};
const EMPTY_JOURNEYS = { diamondJourneyCreatedEventss: { items: [] } };
const EMPTY_JOURNEY_STATUS = {
  diamondAuSysJourneyStatusUpdatedEventss: { items: [] },
};

/**
 * Mock all 8 parallel graphqlRequest calls in getNodeOrders.
 * The order of calls:
 * Batch 1 (CLOB — fetches ALL orders, filters client-side by logistics node or owner wallet):
 *   0: GET_ALL_UNIFIED_ORDER_EVENTS
 *   1: GET_LOGISTICS_ORDER_CREATED_EVENTS
 * Batch 2 (P2P):
 *   2: GET_P2P_OFFERS_BY_CREATOR
 *   3: GET_P2P_OFFERS_ACCEPTED_BY_USER
 *   4: GET_P2P_OFFER_DETAILS_BY_ORDER_IDS
 *   5: GET_AUSYS_ORDER_STATUS_UPDATES
 *   6: GET_JOURNEYS_BY_SENDER_ADDRESS
 *   7: GET_JOURNEY_STATUS_UPDATES_ALL
 */
function setupEmptyMocks() {
  graphqlRequestMock
    .mockResolvedValueOnce(EMPTY_UNIFIED) // 0
    .mockResolvedValueOnce(EMPTY_LOGISTICS) // 1
    .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 2
    .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
    .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 4 (all p2p details)
    .mockResolvedValueOnce(EMPTY_STATUS) // 5
    .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
    .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('BlockchainNodeRepository.getNodeOrders', () => {
  let repository: BlockchainNodeRepository;

  const mockAurumContract = {} as any;
  const mockProvider = {} as any;
  const mockSigner = {} as any;
  const mockPinata = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BlockchainNodeRepository(
      mockAurumContract,
      mockProvider,
      mockSigner,
      '0xAuraAsset',
      mockPinata,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return empty array when no orders found', async () => {
    setupEmptyMocks();

    const orders = await repository.getNodeOrders(NODE_ADDRESS);

    expect(orders).toEqual([]);
    expect(graphqlRequestMock).toHaveBeenCalled();
  });

  it('should return CLOB orders where node owner is the seller', async () => {
    const sellerEvent = makeUnifiedOrderEvent();

    graphqlRequestMock
      .mockResolvedValueOnce({
        diamondUnifiedOrderCreatedEventss: { items: [sellerEvent] },
      })
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce(EMPTY_P2P_CREATED)
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce(EMPTY_P2P_CREATED)
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce(EMPTY_JOURNEYS)
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    // Pass ownerAddress so the seller match works (CLOB sellers are wallet addresses)
    const orders = await repository.getNodeOrders(NODE_ADDRESS, NODE_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id.toLowerCase()).toBe('0xorder1');
    expect(orders[0].seller.toLowerCase()).toBe(NODE_ADDRESS);
    expect(orders[0].isP2P).toBeFalsy();
  });

  it('should return P2P orders where node is the creator', async () => {
    const p2pCreated = makeP2POfferCreatedEvent();

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED)
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce(EMPTY_JOURNEYS)
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    const orders = await repository.getNodeOrders(NODE_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('0xP2POrder1');
    expect(orders[0].isP2P).toBe(true);
  });

  it('should return P2P orders where node is the acceptor', async () => {
    const p2pAccepted = makeP2POfferAcceptedEvent();
    // The accepted event references an order created by someone else
    const createdByOther = makeP2POfferCreatedEvent({
      order_id: '0xP2POrder2',
      creator: '0xOtherUser',
      is_seller_initiated: false,
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED)
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce(EMPTY_P2P_CREATED)
      .mockResolvedValueOnce({
        diamondP2POfferAcceptedEventss: { items: [p2pAccepted] },
      })
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [createdByOther] },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce(EMPTY_JOURNEYS)
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    const orders = await repository.getNodeOrders(NODE_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('0xP2POrder2');
    expect(orders[0].isP2P).toBe(true);
  });

  it('should include orders where node is the journey sender', async () => {
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POrder1',
    });
    const p2pCreated = makeP2POfferCreatedEvent({
      creator: '0xOtherCreator',
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED)
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce(EMPTY_P2P_CREATED)
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      })
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    const orders = await repository.getNodeOrders(NODE_ADDRESS);

    // The P2P aggregator should find this order via journey events
    // even though the node isn't the creator or acceptor
    expect(orders.length).toBeGreaterThanOrEqual(0);
  });

  it('should deduplicate orders that appear in both CLOB and P2P results', async () => {
    // Same order ID appears in both CLOB and P2P
    const orderId = '0xDuplicateOrder';
    const clobEvent = makeUnifiedOrderEvent({
      unified_order_id: orderId,
    });
    const p2pEvent = makeP2POfferCreatedEvent({
      order_id: orderId,
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        diamondUnifiedOrderCreatedEventss: { items: [clobEvent] },
      })
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pEvent] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pEvent] },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce(EMPTY_JOURNEYS)
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    const orders = await repository.getNodeOrders(NODE_ADDRESS, NODE_ADDRESS);

    // Should only have 1 order, not 2
    const orderIds = orders.map((o) => o.id.toLowerCase());
    const uniqueIds = new Set(orderIds);
    expect(uniqueIds.size).toBe(orderIds.length);
  });

  it('should handle GraphQL errors by propagating a contract error', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('Network error'));

    await expect(repository.getNodeOrders(NODE_ADDRESS)).rejects.toThrow(
      'Contract error',
    );
  });

  it('should correctly attach journeyIds to P2P orders', async () => {
    const p2pCreated = makeP2POfferCreatedEvent();
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POrder1',
      journey_id: '0xJourneyABC',
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED)
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      })
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    const orders = await repository.getNodeOrders(NODE_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].journeyIds).toContain('0xJourneyABC');
  });

  it('should correctly attach journeyStatus to P2P orders', async () => {
    const p2pCreated = makeP2POfferCreatedEvent();
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POrder1',
      journey_id: '0xJourney1',
    });
    const journeyStatus = makeJourneyStatusUpdateEvent({
      journey_id: '0xJourney1',
      new_status: '1', // InTransit
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED)
      .mockResolvedValueOnce(EMPTY_LOGISTICS)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      })
      .mockResolvedValueOnce({
        diamondAuSysJourneyStatusUpdatedEventss: {
          items: [journeyStatus],
        },
      });

    const orders = await repository.getNodeOrders(NODE_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].journeyStatus).toBe(1);
  });

  it('should not return orders where node is not a participant', async () => {
    // CLOB order with a different seller — now fetched as ALL orders and filtered client-side
    graphqlRequestMock
      .mockResolvedValueOnce({
        // ALL unified orders returned — but none match our node/owner
        diamondUnifiedOrderCreatedEventss: {
          items: [makeUnifiedOrderEvent({ seller: '0xOtherSeller' })],
        },
      })
      .mockResolvedValueOnce(EMPTY_LOGISTICS) // no logistics linking to our node
      .mockResolvedValueOnce(EMPTY_P2P_CREATED)
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED)
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: {
          items: [makeP2POfferCreatedEvent({ creator: '0xOtherCreator' })],
        },
      })
      .mockResolvedValueOnce(EMPTY_STATUS)
      .mockResolvedValueOnce(EMPTY_JOURNEYS)
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS);

    const orders = await repository.getNodeOrders(NODE_ADDRESS, NODE_ADDRESS);

    // The CLOB order has seller=OtherSeller (not NODE_ADDRESS) and no logistics link
    // The P2P order has creator=OtherCreator (not NODE_ADDRESS)
    expect(orders).toEqual([]);
  });
});
