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

// Token IDs used in test fixtures
const TOKEN_ID_A =
  '11202153737908116169202123534399034039068322729981838674062226574848113217109';
const TOKEN_ID_B =
  '57945930255607318159603105946700134162444874503505598107919448384686533989738';

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
    token_id: TOKEN_ID_A,
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
    token_id: TOKEN_ID_A,
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

function makeSupportedAssetEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'asset-evt-1',
    node_hash: NODE_HASH,
    token: '0xToken1',
    token_id: TOKEN_ID_A,
    price: '1000000000000000000',
    capacity: '100',
    block_number: '50',
    block_timestamp: '1699990000',
    transaction_hash: '0xTxAsset1',
    ...overrides,
  };
}

// -------------------------------------------------------------------
// Empty GraphQL responses
//
// IMPORTANT: mocks must reflect the REAL API response shape.
// GET_ALL_UNIFIED_ORDER_EVENTS uses GQL aliases: created / logistics /
// journeyUpdates / settled — NOT raw table names.
// GET_SUPPORTED_ASSET_ADDED_EVENTS uses: diamondSupportedAssetAddedEventss.
// Tests that mock the wrong shape silently validate broken behaviour
// (that's exactly how the original bugs were missed).
// -------------------------------------------------------------------

const EMPTY_SUPPORTED_ASSETS = {
  diamondSupportedAssetAddedEventss: { items: [] },
};
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
 * Mock all 9 graphqlRequest calls in getNodeOrders (with ownerAddress).
 *
 * Call layout:
 *   0: GET_SUPPORTED_ASSET_ADDED_EVENTS  ← NEW (node token-id cross-ref)
 *   1: GET_ALL_UNIFIED_ORDER_EVENTS      (replaces former calls 0+1)
 *   2: GET_P2P_OFFERS_BY_CREATOR
 *   3: GET_P2P_OFFERS_ACCEPTED_BY_USER
 *   4: GET_P2P_OFFER_DETAILS_BY_ORDER_IDS
 *   5: GET_ALL_P2P_OFFER_ACCEPTED_EVENTS
 *   6: GET_AUSYS_ORDER_STATUS_UPDATES
 *   7: GET_JOURNEYS_BY_ORDER
 *   8: GET_JOURNEY_STATUS_UPDATES_ALL
 *
 * Without ownerAddress only calls 0+1 are made (early return before P2P).
 */
function setupEmptyMocks() {
  graphqlRequestMock
    .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0: node asset cross-ref
    .mockResolvedValueOnce(EMPTY_UNIFIED) // 1: unified CLOB query
    .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 2
    .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
    .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 4 (all p2p details)
    .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5 (all p2p accepted)
    .mockResolvedValueOnce(EMPTY_STATUS) // 6
    .mockResolvedValueOnce(EMPTY_JOURNEYS) // 7
    .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8
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
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 1: no CLOB/logistics
      .mockResolvedValueOnce({
        // 2: P2P created by wallet
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce({
        // 4: all P2P details
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5: all accepted events
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('0xP2POrder1');
    expect(orders[0].isP2P).toBe(true);
  });

  it('should NOT return P2P orders when only nodeHash is provided (no wallet)', async () => {
    // Without ownerAddress getNodeOrders returns early after supported assets
    // and unified queries — no P2P queries are made at all.
    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce(EMPTY_UNIFIED); // 1 only

    const orders = await repository.getNodeOrders(NODE_HASH);

    expect(orders).toEqual([]);
    // Only 2 graphql calls should have been made
    expect(graphqlRequestMock).toHaveBeenCalledTimes(2);
  });

  it('should return CLOB orders linked via logistics node field', async () => {
    const clobEvent = makeUnifiedOrderEvent({ seller: '0xOtherSeller' });
    const logisticsEvent = makeLogisticsEvent({
      unified_order_id: '0xClobOrder1',
      node: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce({
        // 1: CLOB order + logistics linking it to this node
        created: { items: [clobEvent] },
        logistics: { items: [logisticsEvent] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].id.toLowerCase()).toBe('0xcloborder1');
  });

  it('should NOT return CLOB orders based only on owner wallet match', async () => {
    const clobEvent = makeUnifiedOrderEvent({ seller: WALLET_ADDRESS });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce({
        // 1: no logistics link to this node
        created: { items: [clobEvent] },
        logistics: { items: [] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders).toEqual([]);
  });

  it('should NOT return CLOB orders for a different node/owner', async () => {
    const otherClobEvent = makeUnifiedOrderEvent({ seller: '0xOtherSeller' });
    const otherLogistics = makeLogisticsEvent({
      unified_order_id: '0xClobOrder1',
      node: '0xDifferentNodeHash',
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce({
        // 1: logistics links to a DIFFERENT node
        created: { items: [otherClobEvent] },
        logistics: { items: [otherLogistics] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

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
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 1
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 2
      .mockResolvedValueOnce({
        diamondP2POfferAcceptedEventss: { items: [p2pAccepted] },
      }) // 3
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(1);
    expect(orders[0].isP2P).toBe(true);
    expect(orders[0].journeyIds).toContain('0xJourneyABC');
  });

  it('should deduplicate orders appearing in both CLOB and P2P results', async () => {
    const orderId = '0xDuplicateOrder';
    const clobEvent = makeUnifiedOrderEvent({ unified_order_id: orderId });
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
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce({
        // 1: CLOB order with logistics link
        created: { items: [clobEvent] },
        logistics: { items: [logisticsEvent] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pEvent] },
      }) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pEvent] },
      }) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    const uniqueIds = new Set(orders.map((o) => o.id.toLowerCase()));
    expect(uniqueIds.size).toBe(orders.length);
  });

  it('should show P2P orders on a node that supports the matching token_id (pre-scoping-change orders)', async () => {
    // Simulates old AuSysOrderCreated orders: no explicit bytes32 node hash link,
    // only the seller wallet address. Node cross-reference via supported token_ids.
    const p2pCreated = makeP2POfferCreatedEvent({
      order_id: '0xOldOrder',
      token_id: TOKEN_ID_A,
      creator: WALLET_ADDRESS,
    });
    const journey = makeJourneyCreatedEvent({
      order_id: '0xOldOrder',
      // journey sender is the wallet address, NOT the bytes32 node hash
      sender: WALLET_ADDRESS,
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: NODE_HASH supports TOKEN_ID_A
        diamondSupportedAssetAddedEventss: {
          items: [
            makeSupportedAssetEvent({
              node_hash: NODE_HASH,
              token_id: TOKEN_ID_A,
            }),
          ],
        },
      })
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 1
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    // Should appear because NODE_HASH supports TOKEN_ID_A
    expect(orders.some((o) => o.id === '0xOldOrder')).toBe(true);
  });

  it('should NOT show P2P orders on a sibling node that does NOT support that token_id', async () => {
    // SECOND_NODE_HASH supports no token_ids → order should NOT appear there
    const p2pCreated = makeP2POfferCreatedEvent({
      order_id: '0xOldOrder',
      token_id: TOKEN_ID_A,
      creator: WALLET_ADDRESS,
    });

    graphqlRequestMock
      .mockResolvedValueOnce({
        // 0: SECOND_NODE_HASH has NO supported assets
        diamondSupportedAssetAddedEventss: { items: [] },
      })
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 1
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(
      SECOND_NODE_HASH,
      WALLET_ADDRESS,
    );

    // Should NOT appear because SECOND_NODE_HASH has no supported assets
    expect(orders.some((o) => o.id === '0xOldOrder')).toBe(false);
  });

  it('should handle mixed CLOB + P2P results correctly', async () => {
    const clobEvent = makeUnifiedOrderEvent({ unified_order_id: '0xClobOnly' });
    const p2pCreated = makeP2POfferCreatedEvent({ order_id: '0xP2POnly' });
    const logisticsEvent = makeLogisticsEvent({
      unified_order_id: '0xClobOnly',
      node: NODE_HASH,
    });
    const journey = makeJourneyCreatedEvent({
      order_id: '0xP2POnly',
      sender: NODE_HASH,
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce({
        // 1: CLOB order with logistics
        created: { items: [clobEvent] },
        logistics: { items: [logisticsEvent] },
        journeyUpdates: { items: [] },
        settled: { items: [] },
      })
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 2
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce({
        diamondP2POfferCreatedEventss: { items: [p2pCreated] },
      }) // 4
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce({
        diamondJourneyCreatedEventss: { items: [journey] },
      }) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders.length).toBe(2);
    const ids = orders.map((o) => o.id.toLowerCase());
    expect(ids).toContain('0xclobonly');
    expect(ids).toContain('0xp2ponly');

    const p2pOrder = orders.find((o) => o.id.toLowerCase() === '0xp2ponly');
    expect(p2pOrder?.isP2P).toBe(true);

    const clobOrder = orders.find((o) => o.id.toLowerCase() === '0xclobonly');
    expect(clobOrder?.isP2P).toBeFalsy();
  });

  it('should gracefully handle GraphQL errors', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('Network error'));

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    expect(orders).toEqual([]);
  });

  it('should pass wallet address (not node hash) to P2P creator query', async () => {
    setupEmptyMocks();

    await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);

    // Call index 2 is GET_P2P_OFFERS_BY_CREATOR
    // (0=assets, 1=unified, 2=p2p creator)
    const creatorCall = graphqlRequestMock.mock.calls[2];
    expect(creatorCall).toBeDefined();
    const variables = creatorCall[2];
    expect(variables.creator).toBe(WALLET_ADDRESS);
    expect(variables.creator).not.toBe(NODE_HASH.toLowerCase());
  });

  it('should NOT show P2P orders from unrelated wallets', async () => {
    const thirdPartyOffer = makeP2POfferCreatedEvent({
      order_id: '0xThirdPartyOffer',
      creator: COUNTERPARTY,
    });

    graphqlRequestMock
      .mockResolvedValueOnce(EMPTY_SUPPORTED_ASSETS) // 0
      .mockResolvedValueOnce(EMPTY_UNIFIED) // 1
      .mockResolvedValueOnce(EMPTY_P2P_CREATED) // 2: no results for owner
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 3
      .mockResolvedValueOnce({
        // 4: third party offer is visible globally but won't pass filter
        diamondP2POfferCreatedEventss: { items: [thirdPartyOffer] },
      })
      .mockResolvedValueOnce(EMPTY_P2P_ACCEPTED) // 5
      .mockResolvedValueOnce(EMPTY_STATUS) // 6
      .mockResolvedValueOnce(EMPTY_JOURNEYS) // 7
      .mockResolvedValueOnce(EMPTY_JOURNEY_STATUS); // 8

    const orders = await repository.getNodeOrders(NODE_HASH, WALLET_ADDRESS);
    expect(orders.some((o) => o.id === '0xThirdPartyOffer')).toBe(false);
  });
});
