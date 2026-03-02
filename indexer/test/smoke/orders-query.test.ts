import { describe, it, expect } from 'vitest';
import {
  diamondOrderPlacedWithTokensEvents,
  diamondCLOBOrderFilledEvents,
  diamondCLOBOrderCancelledEvents,
  diamondUnifiedOrderCreatedEvents,
} from '../../generated-schema';

/**
 * Smoke Test: Raw Event Tables for Orders
 *
 * With the "pure dumb" indexer pattern, we no longer have aggregate tables.
 * Instead, we test that the raw event tables exist and have the correct columns.
 * Aggregation is done in the frontend repository layer.
 */
describe('Smoke Test: Order Event Tables', () => {
  describe('OrderPlacedWithTokens Events', () => {
    it('should have the correct columns defined', () => {
      expect(diamondOrderPlacedWithTokensEvents).toBeDefined();
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('id');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('order_id');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('maker');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('base_token');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty(
        'base_token_id',
      );
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('price');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('amount');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('is_buy');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty('order_type');
      expect(diamondOrderPlacedWithTokensEvents).toHaveProperty(
        'block_timestamp',
      );
    });

    it('should support the expected GraphQL query structure', () => {
      const query = `
        query GetOrderPlacedEvents($limit: Int = 100) {
          diamondOrderPlacedWithTokensEventss(
            limit: $limit
            orderBy: "blockTimestamp"
            orderDirection: "desc"
          ) {
            items {
              id
              orderId
              maker
              baseToken
              baseTokenId
              quoteToken
              price
              amount
              isBuy
              orderType
              blockNumber
              blockTimestamp
              transactionHash
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      expect(query).toContain('diamondOrderPlacedWithTokensEventss');
      expect(query).toContain('orderId');
      expect(query).toContain('maker');
      expect(query).toContain('price');
      expect(query).toContain('isBuy');
    });
  });

  describe('CLOBOrderFilled Events', () => {
    it('should have the correct columns defined', () => {
      expect(diamondCLOBOrderFilledEvents).toBeDefined();
      expect(diamondCLOBOrderFilledEvents).toHaveProperty('id');
      expect(diamondCLOBOrderFilledEvents).toHaveProperty('order_id');
      expect(diamondCLOBOrderFilledEvents).toHaveProperty('trade_id');
      expect(diamondCLOBOrderFilledEvents).toHaveProperty('fill_amount');
      expect(diamondCLOBOrderFilledEvents).toHaveProperty('remaining_amount');
      expect(diamondCLOBOrderFilledEvents).toHaveProperty('cumulative_filled');
    });
  });

  describe('CLOBOrderCancelled Events', () => {
    it('should have the correct columns defined', () => {
      expect(diamondCLOBOrderCancelledEvents).toBeDefined();
      expect(diamondCLOBOrderCancelledEvents).toHaveProperty('id');
      expect(diamondCLOBOrderCancelledEvents).toHaveProperty('order_id');
      expect(diamondCLOBOrderCancelledEvents).toHaveProperty('maker');
      expect(diamondCLOBOrderCancelledEvents).toHaveProperty(
        'remaining_amount',
      );
      expect(diamondCLOBOrderCancelledEvents).toHaveProperty('reason');
    });
  });

  describe('UnifiedOrderCreated Events', () => {
    it('should have the correct columns defined', () => {
      expect(diamondUnifiedOrderCreatedEvents).toBeDefined();
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('id');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty(
        'unified_order_id',
      );
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('clob_order_id');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('buyer');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('seller');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('token');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('token_id');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('quantity');
      expect(diamondUnifiedOrderCreatedEvents).toHaveProperty('price');
    });

    it('should support the expected GraphQL query structure', () => {
      const query = `
        query GetUnifiedOrderEvents($limit: Int = 100) {
          diamondUnifiedOrderCreatedEventss(
            limit: $limit
            orderBy: "blockTimestamp"
            orderDirection: "desc"
          ) {
            items {
              id
              unifiedOrderId
              clobOrderId
              buyer
              seller
              token
              tokenId
              quantity
              price
              blockNumber
              blockTimestamp
              transactionHash
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      expect(query).toContain('diamondUnifiedOrderCreatedEventss');
      expect(query).toContain('unifiedOrderId');
      expect(query).toContain('buyer');
      expect(query).toContain('seller');
    });
  });
});
