/**
 * Event Aggregators Tests
 *
 * Tests the pure aggregation functions that transform raw indexer events
 * into domain entities. These are the most critical infrastructure functions
 * because ALL frontend data flows through them.
 */
import {
  aggregateNodes,
  aggregateNodesToDTO,
  aggregateOrders,
  aggregatedOrderToDomain,
  aggregateUnifiedOrders,
  aggregateJourneys,
  aggregatedJourneyToDomain,
  aggregateNodeAssets,
  filterOrdersByMaker,
  filterOrdersByStatus,
  filterNodesByOwner,
  filterActiveNodes,
  findNodeByAddress,
  findOrderById,
  NodeEventSources,
  OrderEventSources,
  UnifiedOrderEventSources,
} from '@/infrastructure/shared/event-aggregators';
import { OrderStatus } from '@/domain/orders/order';
import { JourneyStatus } from '@/domain/shared';

// ===========================================================================
// FACTORY HELPERS
// ===========================================================================

let ts = 1000000;
const nextTs = () => String(++ts);

function makeBaseEvent(overrides: Record<string, any> = {}) {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    block_number: '100',
    block_timestamp: nextTs(),
    transaction_hash: '0xtx' + Math.random().toString(16).slice(2, 10),
    log_index: '0',
    ...overrides,
  };
}

function makeNodeRegistered(nodeHash: string, owner: string) {
  return {
    ...makeBaseEvent(),
    node_hash: nodeHash,
    owner,
    node_type: '0x01',
  };
}

function makeLocationUpdate(
  node: string,
  name: string,
  lat: string,
  lng: string,
) {
  return {
    ...makeBaseEvent(),
    node,
    address_name: name,
    lat,
    lng,
  };
}

function makeStatusUpdate(node: string, status: string) {
  return {
    ...makeBaseEvent(),
    node,
    status,
  };
}

function makeNodeDeactivated(nodeHash: string) {
  return {
    ...makeBaseEvent(),
    node_hash: nodeHash,
  };
}

function makeAssetAdded(
  nodeHash: string,
  token: string,
  tokenId: string,
  price: string,
  capacity: string,
) {
  return {
    ...makeBaseEvent(),
    node_hash: nodeHash,
    token,
    token_id: tokenId,
    price,
    capacity,
  };
}

function makeOrderPlaced(overrides: Record<string, any> = {}) {
  return {
    ...makeBaseEvent(),
    order_id: '0xorder' + Math.random().toString(16).slice(2, 10),
    maker: '0xmaker1',
    base_token: '0xbasetoken',
    base_token_id: '12345',
    quote_token: '0xquotetoken',
    price: '1000000000000000000',
    amount: '100',
    is_buy: true,
    order_type: 'limit',
    ...overrides,
  };
}

function makeOrderFilled(
  orderId: string,
  remainingAmount: string,
  cumulativeFilled: string,
) {
  return {
    ...makeBaseEvent(),
    order_id: orderId,
    remaining_amount: remainingAmount,
    cumulative_filled: cumulativeFilled,
  };
}

function makeOrderCancelled(orderId: string) {
  return { ...makeBaseEvent(), order_id: orderId };
}

function makeOrderExpired(orderId: string) {
  return { ...makeBaseEvent(), order_id: orderId };
}

function emptyNodeSources(): NodeEventSources {
  return {
    registered: [],
    deactivated: [],
    locationUpdates: [],
    statusUpdates: [],
    assetsAdded: [],
  };
}

function emptyOrderSources(): OrderEventSources {
  return {
    placed: [],
    routerPlaced: [],
    filled: [],
    cancelled: [],
    expired: [],
  };
}

// ===========================================================================
// NODE AGGREGATION
// ===========================================================================

describe('aggregateNodes', () => {
  it('should return empty array when no events', () => {
    const result = aggregateNodes(emptyNodeSources());
    expect(result).toEqual([]);
  });

  it('should create node from registration event', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xnode1', '0xowner1')];

    const result = aggregateNodes(sources);

    expect(result).toHaveLength(1);
    expect(result[0].address).toBe('0xnode1');
    expect(result[0].owner).toBe('0xowner1');
    expect(result[0].status).toBe('Active');
    expect(result[0].validNode).toBe(true);
    expect(result[0].assets).toEqual([]);
  });

  it('should apply latest location update', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xnode1', '0xowner1')];
    sources.locationUpdates = [
      makeLocationUpdate('0xnode1', 'Old Farm', '10', '20'),
      makeLocationUpdate('0xnode1', 'New Farm', '30', '40'),
    ];

    const result = aggregateNodes(sources);

    expect(result[0].location.addressName).toBe('New Farm');
    expect(result[0].location.location.lat).toBe('30');
    expect(result[0].location.location.lng).toBe('40');
  });

  it('should mark node as inactive when deactivated', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xnode1', '0xowner1')];
    sources.deactivated = [makeNodeDeactivated('0xnode1')];

    const result = aggregateNodes(sources);

    expect(result[0].status).toBe('Inactive');
    expect(result[0].validNode).toBe(false);
  });

  it('should apply hex status updates (0x01 = Active, 0x00 = Inactive)', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xnode1', '0xowner1')];
    sources.statusUpdates = [makeStatusUpdate('0xnode1', '0x00')];

    const result = aggregateNodes(sources);
    expect(result[0].status).toBe('Inactive');
  });

  it('should aggregate assets for a node', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xnode1', '0xowner1')];
    sources.assetsAdded = [
      makeAssetAdded('0xnode1', '0xtoken1', '1', '1000', '50'),
      makeAssetAdded('0xnode1', '0xtoken2', '2', '2000', '100'),
    ];

    const result = aggregateNodes(sources);

    expect(result[0].assets).toHaveLength(2);
    expect(result[0].assets[0].token).toBe('0xtoken1');
    expect(result[0].assets[0].price).toBe(BigInt(1000));
    expect(result[0].assets[0].capacity).toBe(50);
    expect(result[0].assets[1].token).toBe('0xtoken2');
  });

  it('should handle multiple nodes independently', () => {
    const sources = emptyNodeSources();
    sources.registered = [
      makeNodeRegistered('0xnode1', '0xowner1'),
      makeNodeRegistered('0xnode2', '0xowner2'),
    ];
    sources.locationUpdates = [
      makeLocationUpdate('0xnode1', 'Farm A', '10', '20'),
      makeLocationUpdate('0xnode2', 'Farm B', '30', '40'),
    ];
    sources.deactivated = [makeNodeDeactivated('0xnode2')];

    const result = aggregateNodes(sources);

    expect(result).toHaveLength(2);
    expect(result[0].location.addressName).toBe('Farm A');
    expect(result[0].status).toBe('Active');
    expect(result[1].location.addressName).toBe('Farm B');
    expect(result[1].status).toBe('Inactive');
  });

  it('should be case-insensitive for node hash matching', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xABCD', '0xowner1')];
    sources.locationUpdates = [
      makeLocationUpdate('0xabcd', 'Farm', '10', '20'),
    ];

    const result = aggregateNodes(sources);
    expect(result[0].location.addressName).toBe('Farm');
  });
});

describe('aggregateNodesToDTO', () => {
  it('should return lightweight DTOs with key fields', () => {
    const sources = emptyNodeSources();
    sources.registered = [makeNodeRegistered('0xnode1', '0xowner1')];
    sources.locationUpdates = [
      makeLocationUpdate('0xnode1', 'Farm', '10', '20'),
    ];

    const result = aggregateNodesToDTO(sources);

    expect(result).toHaveLength(1);
    expect(result[0].nodeHash).toBe('0xnode1');
    expect(result[0].owner).toBe('0xowner1');
    expect(result[0].addressName).toBe('Farm');
    expect(result[0].lat).toBe('10');
    expect(result[0].lng).toBe('20');
    expect(result[0].isActive).toBe(true);
    expect(result[0].status).toBe('Active');
  });
});

// ===========================================================================
// ORDER AGGREGATION
// ===========================================================================

describe('aggregateOrders', () => {
  it('should return empty array when no events', () => {
    const result = aggregateOrders(emptyOrderSources());
    expect(result).toEqual([]);
  });

  it('should create order from placement event', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1', amount: '100' })];

    const result = aggregateOrders(sources);

    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe('0xorder1');
    expect(result[0].originalAmount).toBe('100');
    expect(result[0].status).toBe('open');
  });

  it('should mark order as filled when remaining is 0', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1', amount: '100' })];
    sources.filled = [makeOrderFilled('0xorder1', '0', '100')];

    const result = aggregateOrders(sources);

    expect(result[0].status).toBe('filled');
    expect(result[0].remainingAmount).toBe('0');
    expect(result[0].cumulativeFilled).toBe('100');
  });

  it('should mark order as partial when partially filled', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1', amount: '100' })];
    sources.filled = [makeOrderFilled('0xorder1', '60', '40')];

    const result = aggregateOrders(sources);

    expect(result[0].status).toBe('partial');
  });

  it('should mark order as cancelled', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1' })];
    sources.cancelled = [makeOrderCancelled('0xorder1')];

    const result = aggregateOrders(sources);

    expect(result[0].status).toBe('cancelled');
  });

  it('should mark order as expired', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1' })];
    sources.expired = [makeOrderExpired('0xorder1')];

    const result = aggregateOrders(sources);

    expect(result[0].status).toBe('expired');
  });

  it('should prioritize expired over cancelled', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1' })];
    sources.cancelled = [makeOrderCancelled('0xorder1')];
    sources.expired = [makeOrderExpired('0xorder1')];

    const result = aggregateOrders(sources);
    // expired takes priority in determineOrderStatus
    expect(result[0].status).toBe('expired');
  });

  it('should use latest fill event for amounts', () => {
    const sources = emptyOrderSources();
    sources.placed = [makeOrderPlaced({ order_id: '0xorder1', amount: '100' })];
    sources.filled = [
      makeOrderFilled('0xorder1', '70', '30'),
      makeOrderFilled('0xorder1', '40', '60'),
    ];

    const result = aggregateOrders(sources);

    expect(result[0].remainingAmount).toBe('40');
    expect(result[0].cumulativeFilled).toBe('60');
    expect(result[0].status).toBe('partial');
  });

  it('should handle router-placed orders', () => {
    const sources = emptyOrderSources();
    sources.routerPlaced = [
      makeOrderPlaced({ order_id: '0xrouter1', maker: '0xrouter' }) as any,
    ];

    const result = aggregateOrders(sources);

    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe('0xrouter1');
  });
});

describe('aggregatedOrderToDomain', () => {
  it('should map open status to CREATED', () => {
    const agg = aggregateOrders({
      placed: [makeOrderPlaced({ order_id: '0x1' })],
      routerPlaced: [],
      filled: [],
      cancelled: [],
      expired: [],
    })[0];

    const order = aggregatedOrderToDomain(agg);
    expect(order.currentStatus).toBe(OrderStatus.CREATED);
  });

  it('should map filled/partial to PROCESSING', () => {
    const agg = aggregateOrders({
      placed: [makeOrderPlaced({ order_id: '0x1', amount: '100' })],
      routerPlaced: [],
      filled: [makeOrderFilled('0x1', '0', '100')],
      cancelled: [],
      expired: [],
    })[0];

    const order = aggregatedOrderToDomain(agg);
    expect(order.currentStatus).toBe(OrderStatus.PROCESSING);
  });

  it('should map cancelled to CANCELLED', () => {
    const agg = aggregateOrders({
      placed: [makeOrderPlaced({ order_id: '0x1' })],
      routerPlaced: [],
      filled: [],
      cancelled: [makeOrderCancelled('0x1')],
      expired: [],
    })[0];

    const order = aggregatedOrderToDomain(agg);
    expect(order.currentStatus).toBe(OrderStatus.CANCELLED);
  });

  it('should set buyer/seller based on isBuy', () => {
    const buyAgg = aggregateOrders({
      placed: [
        makeOrderPlaced({ order_id: '0x1', is_buy: true, maker: '0xbuyer' }),
      ],
      routerPlaced: [],
      filled: [],
      cancelled: [],
      expired: [],
    })[0];

    const buy = aggregatedOrderToDomain(buyAgg);
    expect(buy.buyer).toBe('0xbuyer');
    expect(buy.seller).toBe('');

    const sellAgg = aggregateOrders({
      placed: [
        makeOrderPlaced({ order_id: '0x2', is_buy: false, maker: '0xseller' }),
      ],
      routerPlaced: [],
      filled: [],
      cancelled: [],
      expired: [],
    })[0];

    const sell = aggregatedOrderToDomain(sellAgg);
    expect(sell.buyer).toBe('');
    expect(sell.seller).toBe('0xseller');
  });
});

// ===========================================================================
// UNIFIED ORDERS & JOURNEYS
// ===========================================================================

describe('aggregateUnifiedOrders', () => {
  it('should create unified order from creation event', () => {
    const sources: UnifiedOrderEventSources = {
      created: [
        {
          ...makeBaseEvent(),
          unified_order_id: '0xunified1',
          clob_order_id: '0xclob1',
          buyer: '0xbuyer',
          seller: '0xseller',
          token: '0xtoken',
          token_id: '1',
          quantity: '100',
          price: '1000',
        },
      ],
      logistics: [],
      journeyUpdates: [],
      settled: [],
    };

    const result = aggregateUnifiedOrders(sources);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('created');
    expect(result[0].buyer).toBe('0xbuyer');
    expect(result[0].seller).toBe('0xseller');
  });

  it('should transition to matched when logistics are created', () => {
    const sources: UnifiedOrderEventSources = {
      created: [
        {
          ...makeBaseEvent(),
          unified_order_id: '0xunified1',
          clob_order_id: '0xclob1',
          buyer: '0xbuyer',
          seller: '0xseller',
          token: '0xtoken',
          token_id: '1',
          quantity: '100',
          price: '1000',
        },
      ],
      logistics: [
        {
          ...makeBaseEvent(),
          unified_order_id: '0xunified1',
          ausys_order_id: '0xausys1',
          journey_ids: '0xjourney1',
          bounty: '500',
          node: '0xnode1',
        },
      ],
      journeyUpdates: [],
      settled: [],
    };

    const result = aggregateUnifiedOrders(sources);
    expect(result[0].status).toBe('matched');
  });

  it('should transition to settled when settlement event occurs', () => {
    const sources: UnifiedOrderEventSources = {
      created: [
        {
          ...makeBaseEvent(),
          unified_order_id: '0xunified1',
          clob_order_id: '0xclob1',
          buyer: '0xbuyer',
          seller: '0xseller',
          token: '0xtoken',
          token_id: '1',
          quantity: '100',
          price: '1000',
        },
      ],
      logistics: [],
      journeyUpdates: [],
      settled: [{ ...makeBaseEvent(), unified_order_id: '0xunified1' }],
    };

    const result = aggregateUnifiedOrders(sources);
    expect(result[0].status).toBe('settled');
  });
});

describe('aggregateJourneys', () => {
  it('should create journey from logistics event', () => {
    const logistics = [
      {
        ...makeBaseEvent(),
        unified_order_id: '0xunified1',
        ausys_order_id: '0xausys1',
        journey_ids: '0xjourney1',
        bounty: '500',
        node: '0xnode1',
      },
    ];

    const result = aggregateJourneys(logistics, []);

    expect(result).toHaveLength(1);
    expect(result[0].journeyId).toBe('0xjourney1');
    expect(result[0].bounty).toBe('500');
    expect(result[0].phase).toBe('0'); // Default phase
  });

  it('should apply latest phase from journey updates', () => {
    const logistics = [
      {
        ...makeBaseEvent(),
        unified_order_id: '0xunified1',
        ausys_order_id: '0xausys1',
        journey_ids: '0xjourney1',
        bounty: '500',
        node: '0xnode1',
      },
    ];
    const updates = [
      {
        ...makeBaseEvent(),
        unified_order_id: '0xunified1',
        journey_id: '0xjourney1',
        phase: '1',
      },
      {
        ...makeBaseEvent(),
        unified_order_id: '0xunified1',
        journey_id: '0xjourney1',
        phase: '2',
      },
    ];

    const result = aggregateJourneys(logistics, updates);

    expect(result[0].phase).toBe('2');
  });
});

describe('aggregatedJourneyToDomain', () => {
  it('should map phase 0 to PENDING', () => {
    const journey = aggregateJourneys(
      [
        {
          ...makeBaseEvent(),
          unified_order_id: '0x',
          ausys_order_id: '0x',
          journey_ids: '0xj',
          bounty: '0',
          node: '0x',
        },
      ],
      [],
    )[0];

    const domain = aggregatedJourneyToDomain(journey);
    expect(domain.currentStatus).toBe(JourneyStatus.PENDING);
  });

  it('should map phase 1 to IN_TRANSIT', () => {
    const journey = aggregateJourneys(
      [
        {
          ...makeBaseEvent(),
          unified_order_id: '0x',
          ausys_order_id: '0x',
          journey_ids: '0xj',
          bounty: '100',
          node: '0x',
        },
      ],
      [
        {
          ...makeBaseEvent(),
          unified_order_id: '0x',
          journey_id: '0xj',
          phase: '1',
        },
      ],
    )[0];

    const domain = aggregatedJourneyToDomain(journey);
    expect(domain.currentStatus).toBe(JourneyStatus.IN_TRANSIT);
  });

  it('should map phase 2 to DELIVERED', () => {
    const journey = aggregateJourneys(
      [
        {
          ...makeBaseEvent(),
          unified_order_id: '0x',
          ausys_order_id: '0x',
          journey_ids: '0xj',
          bounty: '100',
          node: '0x',
        },
      ],
      [
        {
          ...makeBaseEvent(),
          unified_order_id: '0x',
          journey_id: '0xj',
          phase: '2',
        },
      ],
    )[0];

    const domain = aggregatedJourneyToDomain(journey);
    expect(domain.currentStatus).toBe(JourneyStatus.DELIVERED);
  });

  it('should convert bounty to BigInt', () => {
    const journey = aggregateJourneys(
      [
        {
          ...makeBaseEvent(),
          unified_order_id: '0x',
          ausys_order_id: '0x',
          journey_ids: '0xj',
          bounty: '999',
          node: '0x',
        },
      ],
      [],
    )[0];

    const domain = aggregatedJourneyToDomain(journey);
    expect(domain.bounty).toBe(BigInt(999));
  });
});

// ===========================================================================
// NODE ASSET AGGREGATION
// ===========================================================================

describe('aggregateNodeAssets', () => {
  it('should filter assets by node hash', () => {
    const assets = [
      makeAssetAdded('0xnode1', '0xtoken1', '1', '100', '50'),
      makeAssetAdded('0xnode2', '0xtoken2', '2', '200', '100'),
      makeAssetAdded('0xnode1', '0xtoken3', '3', '300', '75'),
    ];

    const result = aggregateNodeAssets('0xnode1', assets);

    expect(result).toHaveLength(2);
    expect(result[0].token).toBe('0xtoken1');
    expect(result[1].token).toBe('0xtoken3');
  });

  it('should be case-insensitive', () => {
    const assets = [makeAssetAdded('0xABCD', '0xtoken', '1', '100', '50')];
    const result = aggregateNodeAssets('0xabcd', assets);
    expect(result).toHaveLength(1);
  });

  it('should return empty array for unknown node', () => {
    const assets = [makeAssetAdded('0xnode1', '0xtoken', '1', '100', '50')];
    const result = aggregateNodeAssets('0xunknown', assets);
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// FILTER HELPERS
// ===========================================================================

describe('filter helpers', () => {
  const nodes = aggregateNodes({
    registered: [
      makeNodeRegistered('0xnode1', '0xowner1'),
      makeNodeRegistered('0xnode2', '0xowner2'),
      makeNodeRegistered('0xnode3', '0xowner1'),
    ],
    deactivated: [makeNodeDeactivated('0xnode3')],
    locationUpdates: [],
    statusUpdates: [],
    assetsAdded: [],
  });

  it('filterNodesByOwner should filter by owner address', () => {
    const result = filterNodesByOwner(nodes, '0xowner1');
    expect(result).toHaveLength(2);
  });

  it('filterNodesByOwner should be case-insensitive', () => {
    const result = filterNodesByOwner(nodes, '0xOWNER1');
    expect(result).toHaveLength(2);
  });

  it('filterActiveNodes should exclude deactivated nodes', () => {
    const result = filterActiveNodes(nodes);
    expect(result).toHaveLength(2);
    expect(result.every((n) => n.validNode)).toBe(true);
  });

  it('findNodeByAddress should find by hash', () => {
    const result = findNodeByAddress(nodes, '0xnode2');
    expect(result).toBeDefined();
    expect(result!.owner).toBe('0xowner2');
  });

  it('findNodeByAddress should return undefined for unknown', () => {
    const result = findNodeByAddress(nodes, '0xunknown');
    expect(result).toBeUndefined();
  });
});

describe('order filter helpers', () => {
  const orders = aggregateOrders({
    placed: [
      makeOrderPlaced({ order_id: '0x1', maker: '0xmaker1', is_buy: true }),
      makeOrderPlaced({ order_id: '0x2', maker: '0xmaker2', is_buy: false }),
      makeOrderPlaced({ order_id: '0x3', maker: '0xmaker1', is_buy: true }),
    ],
    routerPlaced: [],
    filled: [makeOrderFilled('0x3', '0', '100')],
    cancelled: [],
    expired: [],
  });

  it('filterOrdersByMaker should filter correctly', () => {
    const result = filterOrdersByMaker(orders, '0xmaker1');
    expect(result).toHaveLength(2);
  });

  it('filterOrdersByStatus should filter by status array', () => {
    const result = filterOrdersByStatus(orders, ['open']);
    expect(result).toHaveLength(2);

    const filled = filterOrdersByStatus(orders, ['filled']);
    expect(filled).toHaveLength(1);
  });

  it('findOrderById should find by ID', () => {
    const result = findOrderById(orders, '0x2');
    expect(result).toBeDefined();
    expect(result!.maker).toBe('0xmaker2');
  });
});
