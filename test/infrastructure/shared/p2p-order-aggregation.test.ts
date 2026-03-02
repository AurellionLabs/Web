/**
 * P2P Order Aggregation Tests
 *
 * Tests the aggregateP2POrdersForUser function with journey enrichment.
 * Verifies that P2P orders are correctly built from raw events and
 * enriched with journey IDs and journey statuses.
 */
import { describe, it, expect } from 'vitest';
import { aggregateP2POrdersForUser } from '@/infrastructure/shared/event-aggregators';
import { OrderStatus } from '@/domain/orders/order';
import type {
  P2POfferCreatedRawEvent,
  P2POfferAcceptedRawEvent,
  AuSysOrderStatusUpdatedRawEvent,
  JourneyCreatedForOrderRawEvent,
  JourneyStatusUpdateRawEvent,
} from '@/infrastructure/shared/graph-queries';

// =============================================================================
// HELPERS
// =============================================================================

function makeCreatedEvent(
  overrides: Partial<P2POfferCreatedRawEvent> = {},
): P2POfferCreatedRawEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    order_id: '0x' + 'a'.repeat(64),
    creator: '0x1111111111111111111111111111111111111111',
    is_seller_initiated: true,
    token: '0xtoken',
    token_id: '100',
    token_quantity: '10',
    price: '5000000',
    target_counterparty: '0x0000000000000000000000000000000000000000',
    expires_at: '0',
    block_number: '1000',
    block_timestamp: '1700000000',
    transaction_hash: '0x' + 'f'.repeat(64),
    ...overrides,
  };
}

function makeAcceptedEvent(
  overrides: Partial<P2POfferAcceptedRawEvent> = {},
): P2POfferAcceptedRawEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    order_id: '0x' + 'a'.repeat(64),
    acceptor: '0x2222222222222222222222222222222222222222',
    is_seller_initiated: true,
    block_number: '1001',
    block_timestamp: '1700000100',
    transaction_hash: '0x' + 'e'.repeat(64),
    ...overrides,
  };
}

function makeStatusUpdate(
  overrides: Partial<AuSysOrderStatusUpdatedRawEvent> = {},
): AuSysOrderStatusUpdatedRawEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    order_id: '0x' + 'a'.repeat(64),
    new_status: '1',
    block_number: '1002',
    block_timestamp: '1700000200',
    transaction_hash: '0x' + 'd'.repeat(64),
    ...overrides,
  };
}

function makeJourneyCreated(
  overrides: Partial<JourneyCreatedForOrderRawEvent> = {},
): JourneyCreatedForOrderRawEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    journey_id: '0xjourney' + Math.random().toString(16).slice(2, 10),
    sender: '0x1111111111111111111111111111111111111111',
    receiver: '0x2222222222222222222222222222222222222222',
    driver: '0x3333333333333333333333333333333333333333',
    bounty: '1000',
    e_t_a: '1700001000',
    order_id: '0x' + 'a'.repeat(64),
    block_number: '1003',
    block_timestamp: '1700000300',
    transaction_hash: '0x' + 'c'.repeat(64),
    ...overrides,
  };
}

function makeJourneyStatusUpdate(
  overrides: Partial<JourneyStatusUpdateRawEvent> = {},
): JourneyStatusUpdateRawEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    journey_id: '0xjourney1',
    new_status: '0',
    sender: '0x1111111111111111111111111111111111111111',
    receiver: '0x2222222222222222222222222222222222222222',
    driver: '0x3333333333333333333333333333333333333333',
    block_number: '1004',
    block_timestamp: '1700000400',
    transaction_hash: '0x' + 'b'.repeat(64),
    ...overrides,
  };
}

const USER_ADDR = '0x1111111111111111111111111111111111111111';

// =============================================================================
// TESTS
// =============================================================================

describe('aggregateP2POrdersForUser with journey data', () => {
  it('should return empty array when no events', () => {
    const orders = aggregateP2POrdersForUser([], [], [], [], USER_ADDR);
    expect(orders).toEqual([]);
  });

  it('should build order from user-created event with isP2P=true', () => {
    const created = [
      makeCreatedEvent({ order_id: '0x01', creator: USER_ADDR }),
    ];
    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      [],
      USER_ADDR,
    );

    expect(orders).toHaveLength(1);
    expect(orders[0].isP2P).toBe(true);
    expect(orders[0].id).toBe('0x01');
  });

  it('should set journeyIds from journey events', () => {
    const orderId = '0x01';
    const journeyId = '0xjourney_abc';
    const created = [
      makeCreatedEvent({ order_id: orderId, creator: USER_ADDR }),
    ];
    const journeys = [
      makeJourneyCreated({ order_id: orderId, journey_id: journeyId }),
    ];

    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      [],
      USER_ADDR,
      journeys,
      [],
    );

    expect(orders).toHaveLength(1);
    expect(orders[0].journeyIds).toContain(journeyId);
  });

  it('should set journeyStatus from journey status updates', () => {
    const orderId = '0x01';
    const journeyId = '0xjourney_def';
    const created = [
      makeCreatedEvent({ order_id: orderId, creator: USER_ADDR }),
    ];
    const journeys = [
      makeJourneyCreated({ order_id: orderId, journey_id: journeyId }),
    ];
    const journeyStatuses = [
      makeJourneyStatusUpdate({ journey_id: journeyId, new_status: '1' }),
    ];

    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      [],
      USER_ADDR,
      journeys,
      journeyStatuses,
    );

    expect(orders).toHaveLength(1);
    expect(orders[0].journeyStatus).toBe(1); // In Transit
  });

  it('should set journeyStatus to null when no journey exists', () => {
    const created = [
      makeCreatedEvent({ order_id: '0x01', creator: USER_ADDR }),
    ];

    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      [],
      USER_ADDR,
      [], // no journeys
      [],
    );

    expect(orders).toHaveLength(1);
    expect(orders[0].journeyStatus).toBeNull();
  });

  it('should use latest journey status when multiple updates exist', () => {
    const orderId = '0x01';
    const journeyId = '0xjourney_latest';
    const created = [
      makeCreatedEvent({ order_id: orderId, creator: USER_ADDR }),
    ];
    const journeys = [
      makeJourneyCreated({ order_id: orderId, journey_id: journeyId }),
    ];
    // Status updates are ordered desc by timestamp; first = newest
    const journeyStatuses = [
      makeJourneyStatusUpdate({
        journey_id: journeyId,
        new_status: '2',
        block_timestamp: '1700000600',
      }),
      makeJourneyStatusUpdate({
        journey_id: journeyId,
        new_status: '1',
        block_timestamp: '1700000500',
      }),
    ];

    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      [],
      USER_ADDR,
      journeys,
      journeyStatuses,
    );

    expect(orders[0].journeyStatus).toBe(2); // Delivered (latest)
  });

  it('should handle accepted orders with journey data', () => {
    const orderId = '0x02';
    const journeyId = '0xjourney_ghi';
    const creator = '0x9999999999999999999999999999999999999999';
    const created = [
      makeCreatedEvent({
        order_id: orderId,
        creator: creator,
        is_seller_initiated: true,
      }),
    ];
    const accepted = [
      makeAcceptedEvent({ order_id: orderId, acceptor: USER_ADDR }),
    ];
    const journeys = [
      makeJourneyCreated({ order_id: orderId, journey_id: journeyId }),
    ];
    const journeyStatuses = [
      makeJourneyStatusUpdate({ journey_id: journeyId, new_status: '0' }),
    ];

    const orders = aggregateP2POrdersForUser(
      [],
      accepted,
      created,
      [],
      USER_ADDR,
      journeys,
      journeyStatuses,
    );

    expect(orders).toHaveLength(1);
    expect(orders[0].isP2P).toBe(true);
    expect(orders[0].journeyIds).toContain(journeyId);
    expect(orders[0].journeyStatus).toBe(0); // Pending
    // User accepted a seller-initiated offer → user is buyer
    expect(orders[0].buyer).toBe(USER_ADDR.toLowerCase());
  });

  it('should deduplicate orders seen from both created and accepted', () => {
    const orderId = '0x03';
    const created = [
      makeCreatedEvent({ order_id: orderId, creator: USER_ADDR }),
    ];
    const accepted = [
      makeAcceptedEvent({ order_id: orderId, acceptor: USER_ADDR }),
    ];

    const orders = aggregateP2POrdersForUser(
      created,
      accepted,
      created,
      [],
      USER_ADDR,
    );

    // Should only appear once
    expect(orders).toHaveLength(1);
  });

  it('should map contract status 2 to SETTLED', () => {
    const orderId = '0x04';
    const created = [
      makeCreatedEvent({ order_id: orderId, creator: USER_ADDR }),
    ];
    const statuses = [makeStatusUpdate({ order_id: orderId, new_status: '2' })];

    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      statuses,
      USER_ADDR,
    );

    expect(orders[0].currentStatus).toBe(OrderStatus.SETTLED);
  });

  it('should preserve backwards compatibility when journey params are omitted', () => {
    const created = [
      makeCreatedEvent({ order_id: '0x05', creator: USER_ADDR }),
    ];

    // Call without journey params (defaults to [])
    const orders = aggregateP2POrdersForUser(
      created,
      [],
      created,
      [],
      USER_ADDR,
    );

    expect(orders).toHaveLength(1);
    expect(orders[0].journeyIds).toEqual([]);
    expect(orders[0].journeyStatus).toBeNull();
    expect(orders[0].isP2P).toBe(true);
  });

  // =============================================================================
  // BUYER / SELLER ASSIGNMENT TESTS
  // =============================================================================

  describe('buyer/seller assignment for created offers', () => {
    const COUNTERPARTY = '0x4444444444444444444444444444444444444444';

    it('seller-initiated: creator is seller, target_counterparty is buyer', () => {
      const created = [
        makeCreatedEvent({
          order_id: '0xA1',
          creator: USER_ADDR,
          is_seller_initiated: true,
          target_counterparty: COUNTERPARTY,
        }),
      ];

      const orders = aggregateP2POrdersForUser(
        created,
        [],
        created,
        [],
        USER_ADDR,
      );

      expect(orders).toHaveLength(1);
      expect(orders[0].seller).toBe(USER_ADDR.toLowerCase());
      expect(orders[0].buyer).toBe(COUNTERPARTY);
    });

    it('buyer-initiated: creator is buyer, target_counterparty is seller', () => {
      const created = [
        makeCreatedEvent({
          order_id: '0xA2',
          creator: USER_ADDR,
          is_seller_initiated: false,
          target_counterparty: COUNTERPARTY,
        }),
      ];

      const orders = aggregateP2POrdersForUser(
        created,
        [],
        created,
        [],
        USER_ADDR,
      );

      expect(orders).toHaveLength(1);
      expect(orders[0].buyer).toBe(USER_ADDR.toLowerCase());
      expect(orders[0].seller).toBe(COUNTERPARTY);
    });

    it('open offer (zero counterparty): creator is seller, buyer is zero address', () => {
      const created = [
        makeCreatedEvent({
          order_id: '0xA3',
          creator: USER_ADDR,
          is_seller_initiated: true,
          target_counterparty: '0x0000000000000000000000000000000000000000',
        }),
      ];

      const orders = aggregateP2POrdersForUser(
        created,
        [],
        created,
        [],
        USER_ADDR,
      );

      expect(orders).toHaveLength(1);
      expect(orders[0].seller).toBe(USER_ADDR.toLowerCase());
      // Open offer: no buyer yet
      expect(orders[0].buyer).toBe(
        '0x0000000000000000000000000000000000000000',
      );
    });
  });

  describe('buyer/seller assignment for accepted offers', () => {
    const CREATOR = '0x5555555555555555555555555555555555555555';

    it('accepting seller-initiated offer: acceptor is buyer, creator is seller', () => {
      const createdEvent = makeCreatedEvent({
        order_id: '0xB1',
        creator: CREATOR,
        is_seller_initiated: true,
      });
      const accepted = [
        makeAcceptedEvent({ order_id: '0xB1', acceptor: USER_ADDR }),
      ];

      const orders = aggregateP2POrdersForUser(
        [],
        accepted,
        [createdEvent],
        [],
        USER_ADDR,
      );

      expect(orders).toHaveLength(1);
      expect(orders[0].buyer).toBe(USER_ADDR.toLowerCase());
      expect(orders[0].seller).toBe(CREATOR);
    });

    it('accepting buyer-initiated offer: acceptor is seller, creator is buyer', () => {
      const createdEvent = makeCreatedEvent({
        order_id: '0xB2',
        creator: CREATOR,
        is_seller_initiated: false,
      });
      const accepted = [
        makeAcceptedEvent({
          order_id: '0xB2',
          acceptor: USER_ADDR,
          is_seller_initiated: false,
        }),
      ];

      const orders = aggregateP2POrdersForUser(
        [],
        accepted,
        [createdEvent],
        [],
        USER_ADDR,
      );

      expect(orders).toHaveLength(1);
      expect(orders[0].seller).toBe(USER_ADDR.toLowerCase());
      expect(orders[0].buyer).toBe(CREATOR);
    });
  });

  describe('customer vs node dashboard filtering', () => {
    const NODE_ADDR = '0x6666666666666666666666666666666666666666';
    const CUSTOMER_ADDR = '0x7777777777777777777777777777777777777777';

    it('seller-initiated order should NOT appear on customer dashboard for the seller', () => {
      // Node creates a sell offer targeting a customer
      const created = [
        makeCreatedEvent({
          order_id: '0xC1',
          creator: NODE_ADDR,
          is_seller_initiated: true,
          target_counterparty: CUSTOMER_ADDR,
        }),
      ];

      // When queried from the node's perspective
      const orders = aggregateP2POrdersForUser(
        created,
        [],
        created,
        [],
        NODE_ADDR,
      );

      expect(orders).toHaveLength(1);
      // The node is the seller — NOT the buyer
      expect(orders[0].seller).toBe(NODE_ADDR.toLowerCase());
      expect(orders[0].buyer).toBe(CUSTOMER_ADDR);
      // So a customer filter (order.buyer === nodeAddr) would correctly EXCLUDE this
      expect(orders[0].buyer).not.toBe(NODE_ADDR.toLowerCase());
    });
  });
});
