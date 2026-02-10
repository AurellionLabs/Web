/**
 * P2P Event Aggregation Tests
 *
 * Tests pure aggregation functions that compute P2P market statistics
 * from raw indexer events. These are infrastructure-level tests that
 * validate real business logic (volume calculation, trade counting).
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateP2PMarketStats,
  type P2POfferCreatedEvent,
  type P2POfferAcceptedEvent,
  type P2PMarketStats,
} from '@/infrastructure/shared/event-aggregators';

// =============================================================================
// TEST DATA
// =============================================================================

const TOKEN = '0xb3090aBF81918FF50e921b166126aD6AB9a03944';

/** Helper to create a P2POfferCreatedEvent */
function makeCreated(
  overrides: Partial<P2POfferCreatedEvent> = {},
): P2POfferCreatedEvent {
  return {
    id: 'evt-' + Math.random().toString(36).slice(2, 8),
    order_id: '0x' + 'a'.repeat(64),
    creator: '0x1111111111111111111111111111111111111111',
    is_seller_initiated: true,
    token: TOKEN,
    token_id: '100',
    token_quantity: '10',
    price: '5000000000000000000', // 5e18 (5 USD)
    target_counterparty: '0x0000000000000000000000000000000000000000',
    expires_at: '0',
    block_number: '1000',
    block_timestamp: '1700000000',
    transaction_hash: '0x' + 'f'.repeat(64),
    ...overrides,
  };
}

/** Helper to create a P2POfferAcceptedEvent */
function makeAccepted(
  overrides: Partial<P2POfferAcceptedEvent> = {},
): P2POfferAcceptedEvent {
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

// =============================================================================
// TESTS
// =============================================================================

describe('aggregateP2PMarketStats', () => {
  it('should return empty stats for no events', () => {
    const stats = aggregateP2PMarketStats([], []);
    expect(stats).toEqual({
      totalVolume: '0',
      tradeCount: 0,
      openOfferCount: 0,
      volumeByTokenId: {},
    });
  });

  it('should count open offers (created but not accepted or cancelled)', () => {
    const created = [
      makeCreated({ order_id: '0x01', token_id: '100' }),
      makeCreated({ order_id: '0x02', token_id: '100' }),
      makeCreated({ order_id: '0x03', token_id: '200' }),
    ];
    const accepted: P2POfferAcceptedEvent[] = [];

    const stats = aggregateP2PMarketStats(created, accepted);
    expect(stats.openOfferCount).toBe(3);
  });

  it('should calculate volume from accepted offers only', () => {
    const created = [
      makeCreated({
        order_id: '0x01',
        token_id: '100',
        price: '5000000000000000000', // 5 USD
        token_quantity: '10',
      }),
      makeCreated({
        order_id: '0x02',
        token_id: '100',
        price: '3000000000000000000', // 3 USD
        token_quantity: '5',
      }),
      makeCreated({
        order_id: '0x03',
        token_id: '200',
        price: '10000000000000000000', // 10 USD (not accepted)
        token_quantity: '2',
      }),
    ];
    const accepted = [
      makeAccepted({ order_id: '0x01' }),
      makeAccepted({ order_id: '0x02' }),
      // 0x03 not accepted
    ];

    const stats = aggregateP2PMarketStats(created, accepted);

    // Volume = (5 * 10) + (3 * 5) = 50 + 15 = 65 USD
    // In wei: 50e18 + 15e18 = 65e18
    expect(stats.totalVolume).toBe('65000000000000000000');
    expect(stats.tradeCount).toBe(2);
  });

  it('should not double-count if same order_id accepted multiple times (idempotent)', () => {
    const created = [
      makeCreated({
        order_id: '0x01',
        price: '1000000000000000000', // 1 USD
        token_quantity: '1',
      }),
    ];
    const accepted = [
      makeAccepted({ order_id: '0x01', block_timestamp: '1700000100' }),
      makeAccepted({ order_id: '0x01', block_timestamp: '1700000200' }), // duplicate
    ];

    const stats = aggregateP2PMarketStats(created, accepted);
    expect(stats.tradeCount).toBe(1);
    expect(stats.totalVolume).toBe('1000000000000000000');
  });

  it('should reduce open offer count when offers are accepted', () => {
    const created = [
      makeCreated({ order_id: '0x01' }),
      makeCreated({ order_id: '0x02' }),
      makeCreated({ order_id: '0x03' }),
    ];
    const accepted = [makeAccepted({ order_id: '0x01' })];

    const stats = aggregateP2PMarketStats(created, accepted);
    expect(stats.openOfferCount).toBe(2); // 3 created - 1 accepted = 2 open
  });

  it('should break down volume by tokenId', () => {
    const created = [
      makeCreated({
        order_id: '0x01',
        token_id: '100',
        price: '2000000000000000000', // 2 USD
        token_quantity: '5',
      }),
      makeCreated({
        order_id: '0x02',
        token_id: '200',
        price: '4000000000000000000', // 4 USD
        token_quantity: '3',
      }),
      makeCreated({
        order_id: '0x03',
        token_id: '100',
        price: '1000000000000000000', // 1 USD
        token_quantity: '10',
      }),
    ];
    const accepted = [
      makeAccepted({ order_id: '0x01' }),
      makeAccepted({ order_id: '0x02' }),
      makeAccepted({ order_id: '0x03' }),
    ];

    const stats = aggregateP2PMarketStats(created, accepted);

    // tokenId 100: (2*5) + (1*10) = 20e18
    // tokenId 200: (4*3) = 12e18
    expect(stats.volumeByTokenId['100']).toBe('20000000000000000000');
    expect(stats.volumeByTokenId['200']).toBe('12000000000000000000');
  });

  it('should handle accepted events whose order_id has no matching created event', () => {
    // Edge case: accepted event for an order we don't have creation data for
    const created: P2POfferCreatedEvent[] = [];
    const accepted = [makeAccepted({ order_id: '0xorphan' })];

    const stats = aggregateP2PMarketStats(created, accepted);
    // Should not crash, just skip the orphan
    expect(stats.tradeCount).toBe(0);
    expect(stats.totalVolume).toBe('0');
  });

  it('should handle large BigInt volumes without overflow', () => {
    const created = [
      makeCreated({
        order_id: '0x01',
        price: '999999999999999999999999999', // Very large price
        token_quantity: '1000000',
      }),
    ];
    const accepted = [makeAccepted({ order_id: '0x01' })];

    // Should not throw
    const stats = aggregateP2PMarketStats(created, accepted);
    expect(BigInt(stats.totalVolume)).toBeGreaterThan(0n);
    expect(stats.tradeCount).toBe(1);
  });
});
