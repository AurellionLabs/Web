// File: test/repositories/DiamondNodeRepository.test.ts
// Unit tests for DiamondNodeRepository.getNodeOrders
// This is the repository actually used in production (via the diamond provider).

import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';

// -------------------------------------------------------------------
// Mock modules (must be declared before the import of the module under test)
// -------------------------------------------------------------------

const graphqlRequestMock = vi.fn();

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: unknown[]) => graphqlRequestMock(...args),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'https://indexer.test/graphql',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0xAuraAsset',
}));

vi.mock('pinata', () => ({
  PinataSDK: vi.fn().mockImplementation(() => ({
    upload: vi.fn(),
    gateways: { get: vi.fn() },
  })),
}));

import { DiamondNodeRepository } from '@/infrastructure/diamond/diamond-node-repository';
import { OrderStatus } from '@/domain/orders/order';

// -------------------------------------------------------------------
// Constants matching real production data shape
// -------------------------------------------------------------------

// Node hash (bytes32) — what the node dashboard uses as selectedNodeAddress
const NODE_HASH =
  '0xe5ffe58ff80d365691f9b7338a3010851dce6f023b6c55b0983279f6b4821600';
const SECOND_NODE_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

// Wallet address — the owner of the node, used for P2P queries
const WALLET_ADDRESS = '0xfde9344cabfa9504eead8a3e4e2096da1316bbaf';

// A different address (the counterparty)
const COUNTERPARTY = '0x16a1e17144f10091d6da0eca7f336ccc76462e03';

// -------------------------------------------------------------------
// Fixture factories
// -------------------------------------------------------------------

function makeUnifiedOrderEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'evt-clob-1',
    unified_order_id: '0xClobOrder1',
    clob_order_id: '0xClob1',
    buyer: COUNTERPARTY,
    seller: WALLET_ADDRESS,
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
    unified_order_id: '0xClobOrder1',
    ausys_order_id: '0xAusys1',
    journey_ids: '0xJourney1',
    bounty: '100000000000000000',
    node: NODE_HASH,
    block_number: '110',
    block_timestamp: '1700010000',
    transaction_hash: '0xTxLog1',
    ...overrides,
  };
}

function makeP2POfferCreatedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'p2p-evt-1',
    order_id: '0xP2POrder1',
    creator: WALLET_ADDRESS,
    is_seller_initiated: true,
    token: '0xToken1',
    token_id: '0xTokenId1',
    token_quantity: '140',
    price: '100000000000000000000',
    target_counterparty: COUNTERPARTY,
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
    order_id: '0xP2POrder1',
    acceptor: COUNTERPARTY,
    is_seller_initiated: true,
    block_number: '210',
    block_timestamp: '1700055000',
    transaction_hash: '0xTx3',
    ...overrides,
  };
}

function makeJourneyCreatedEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'journey-evt-1',
    journey_id: '0xJourney1',
    sender: WALLET_ADDRESS,
    receiver: COUNTERPARTY,
    driver: '0x0000000000000000000000000000000000000000',
    bounty: '500000000000000000',
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
    sender: WALLET_ADDRESS,
    receiver: COUNTERPARTY,
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

// -------------------------------------------------------------------
// Empty GraphQL responses
//
// IMPORTANT: GET_ALL_UNIFIED_ORDER_EVENTS uses GQL aliases so its response
// shape is { created, logistics, journeyUpdates, settled } — NOT the raw
// table names. Tests must reflect the real API shape or they silently
// validate broken behaviour (which is exactly how the original bug was missed).
// -------------------------------------------------------------------

/**
 * Empty response for the single unified order query (call 0).
 * Shape mirrors GET_ALL_UNIFIED_ORDER_EVENTS aliases.
 */
const EMPTY_UNIFIED = {
  created: { items: [] },
  logistics: { items: [] },
  journeyUpdates: { items: [] },
  settled: { items: [] },
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
 * Mock all 8 graphqlRequest calls in getNodeOrders (with ownerAddress).
 *
 * Call layout after the unified-query refactor:
 *   0: GET_ALL_UNIFIED_ORDER_EVENTS  (replaces former calls 0 + 1)
 *   1: GET_P2P_OFFERS_BY_CREATOR
 *   2: GET_P2P_OFFERS_ACCEPTED_BY_USER
 *   3: GET_P2P_OFFER_DETAILS_BY_ORDER_IDS
 *   4: GET_ALL_P2P_OFFER_ACCEPTED_EVENTS
 *   5: GET_AUSYS_ORDER_STATUS_UPDATES
 *   6: GET_JOURNEYS_BY_ORDER
 *   7: GET_JOURNEY_STATUS_UPDATES_ALL
 *
 * Without ownerAddress only call 0 is made (early return before P2P queries).
 */
function setupEmptyMocks() {
  graphqlRequestMock
    .mockResolvedValueOnce(EMPTY_UNIFIED) // 0: unified CLOB query
    .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 1
    .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
    .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 3 (all p2p details)
    .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4 (all p2p accepted)
    .mockResolvedValueOnce(EMPTY_STATUS) // 5
    .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
    .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('DiamondNodeRepository.getNodeOrders', () => {
  let repository: DiamondNodeRepository;

  const mockContext = {
    getDiamond: vi.fn(),
    getAuraAsset: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.getDiamond.mockReturnValue({
      getOwnerNodes: vi.fn().mockResolvedValue([NODE_HASH, SECOND_NODE_HASH]),
    });
    repository = new DiamondNodeRepository(mockContext);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return empty array when no orders found', async () => {
    setupEmptyMocks();

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders).toEqual([]);
    expect(graphqlRequestMock).toHaveBeenCalled();
  });

  it('should return P2P orders when ownerAddress is provided and the order is linked to this node', async () => {
    const p2pCreated = makeP2POfferCreatedEvent();
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POrder1',
      sender: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 0: unified (no CLOB/logistics)
      .mockResolvedValueOnce({
        // 1: P2P created by wallet
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce({
        // 3: all P2P details
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4: all accepted events
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('0xP2POrder1');
    expect(orders[0].isP2P).toBe(true);
  });

  it('should NOT return P2P orders when only nodeHash is provided (no wallet)', async () => {
    // Without ownerAddress getNodeOrders returns early after the single
    // unified query — no P2P queries are made at all.
    graphqlRequestMock.mockResolvedValueOnce(EMPTY_UNIFIED); // 0 only

    const orders = await repository.getNodeOrders(NODE_HASH);

    expect(orders).toEqual([]);
    // Only 1 graphql call should have been made
    expect(graphqlRequestMock).toHaveBeenCalledTimes(1);
  });

  it('should return CLOB orders linked via logistics node field', async () => {
    const clobEvent = makeUnifiedOrderEvent({ seller: '0xOtherSeller' });
    const logisticsEvent = makeLogisticsEvent({
      unified_order_id: '0xClobOrder1',
      node: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: unified — CLOB order + logistics linking it to this node
        created: { items: [clobEvent] },
        logistics: { items: [logisticsEvent] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 1
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id.toLowerCase()).toBe('0xcloborder1');
  });

  it('should NOT return CLOB orders based only on owner wallet match', async () => {
    // CLOB order where seller = WALLET_ADDRESS but no logistics linking to this node
    const clobEvent = makeUnifiedOrderEvent({ seller: WALLET_ADDRESS });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: no logistics link to this node
        created: { items: [clobEvent] },
        logistics: { items: [] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 1
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders).toEqual([]);
  });

  it('should NOT return CLOB orders for a different node/owner', async () => {
    const otherClobEvent = makeUnifiedOrderEvent({
      seller: '0xOtherSeller',
    });
    const otherLogistics = makeLogisticsEvent({
      unified_order_id: '0xClobOrder1',
      node: '0xDifferentNodeHash', // different node
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: logistics links to a DIFFERENT node
        created: { items: [otherClobEvent] },
        logistics: { items: [otherLogistics] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 1
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders).toEqual([]);
  });

  it('should return P2P orders with journey data attached', async () => {
    const p2pCreated = makeP2POfferCreatedEvent();
    const p2pAccepted = makeP2POfferAcceptedEvent();
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POrder1',
      journey_id: '0xJourneyABC',
      sender: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 0
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 1
      .mockResolvedValueOnce({
        diamondP2POfferAcceptedEventss: { items: [p2pAccepted] },
      }) // 2
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].isP2P).toBe(true);
    expect(orders[0].journeyIds).toContain('0xJourneyABC');
  });

  it('should deduplicate orders appearing in both CLOB and P2P results', async () => {
    const orderId = '0xDuplicateOrder';
    const clobEvent = makeUnifiedOrderEvent({
      unified_order_id: orderId,
    });
    const p2pEvent = makeP2POfferCreatedEvent({ order_id: orderId });
    const logisticsEvent = makeLogisticsEvent({
      unified_order_id: orderId,
      node: NODE_HASH,
    });
    const journey = makeJourneyCreatedEvent({
      order_id: orderId,
      sender: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: CLOB order with logistics link
        created: { items: [clobEvent] },
        logistics: { items: [logisticsEvent] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pEvent] },
      }) // 1
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pEvent] },
      }) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    const uniqueIds = new Set(orders.map((o) => o.id.toLowerCase()));
    expect(uniqueIds.size).toBe(orders.length);
  });

  it('should show node owner P2P orders even without explicit node ref', async () => {
    // P2P order created by the node owner (no nodes array) — should appear
    // because ownerAddr match covers seller-initiated offers from this wallet.
    const p2pCreated = makeP2POfferCreatedEvent({
      order_id: '0xOwnerOfferNoNodeRef',
      creator: WALLET_ADDRESS,
      nodes: [],
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 0
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 1
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);
    // Owner's P2P offer SHOULD appear on their node dashboard
    expect(orders.some((o) => o.id === '0xOwnerOfferNoNodeRef')).toBe(true);
  });

  it('should NOT show P2P orders from unrelated wallets', async () => {
    // P2P order created by a third party — should not appear on this node
    const thirdPartyOffer = makeP2POfferCreatedEvent({
      order_id: '0xThirdPartyOffer',
      creator: COUNTERPARTY, // NOT the node owner
      nodes: [],
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 0
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 1: creator query → no results for owner
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce({
        // 3: all created — third party offer is here but won't pass filter
        diamondP2POfferCreatedEventss: { items: [thirdPartyOffer] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);
    expect(orders.some((o) => o.id === '0xThirdPartyOffer')).toBe(false);
  });

  it('should handle mixed CLOB + P2P results correctly', async () => {
    const clobEvent = makeUnifiedOrderEvent({
      unified_order_id: '0xClobOnly',
    });
    const p2pCreated = makeP2POfferCreatedEvent({
      order_id: '0xP2POnly',
    });
    const logisticsEvent = makeLogisticsEvent({
      unified_order_id: '0xClobOnly',
      node: NODE_HASH,
    });
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POnly',
      sender: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: CLOB order with logistics
        created: { items: [clobEvent] },
        logistics: { items: [logisticsEvent] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 1
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 2
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 3
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 4
      .mockResolvedValueOnce(EMPTY_STATUS) // 5
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 7

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(2);

    const ids = orders.map((o) => o.id.toLowerCase());
    expect(ids).toContain('0xclobonly');
    expect(ids).toContain('0xP2POnly'.toLowerCase());

    const p2pOrder = orders.find((o) => o.id.toLowerCase() === '0xp2ponly');
    expect(p2pOrder?.isP2P).toBe(true);

    const clobOrder = orders.find((o) => o.id.toLowerCase() === '0xclobonly');
    expect(clobOrder?.isP2P).toBeFalsy();
  });

  it('should gracefully handle GraphQL errors', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('Network error'));

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    // DiamondNodeRepository catches errors and returns []
    expect(orders).toEqual([]);
  });

  it('should pass wallet address (not node hash) to P2P creator query', async () => {
    setupEmptyMocks();

    await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    // Call index 1 is GET_P2P_OFFERS_BY_CREATOR (after the unified call at 0)
    const creatorCall = graphqlRequestMock.mock.calls[1];
    expect(creatorCall).toBeDefined();
    // The variables should contain the wallet address, not the node hash
    const variables = creatorCall[2];
    expect(variables.creator).toBe(WALLET_ADDRESS);
    expect(variables.creator).not.toBe(NODE_HASH.toLowerCase());
  });
});
