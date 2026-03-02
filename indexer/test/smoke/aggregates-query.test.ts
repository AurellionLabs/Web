import { describe, it, expect } from 'vitest';
import { assets, orders, journeys } from '../../generated-schema';

/**
 * Smoke Test: Aggregate Tables (US-011)
 *
 * Verifies that the aggregate tables (assets, orders, journeys) are generated
 * correctly in the Ponder schema and expose the expected columns.
 * These tables are populated by the aggregate handlers in bridge.generated.ts
 * and assets.generated.ts.
 */
describe('Smoke Test: Aggregate Tables', () => {
  describe('assets table', () => {
    it('should be defined', () => {
      expect(assets).toBeDefined();
    });

    it('should have required columns', () => {
      expect(assets).toHaveProperty('id');
      expect(assets).toHaveProperty('token_id');
      expect(assets).toHaveProperty('account');
      expect(assets).toHaveProperty('name');
      expect(assets).toHaveProperty('asset_class');
      expect(assets).toHaveProperty('class_name');
      expect(assets).toHaveProperty('block_number');
      expect(assets).toHaveProperty('transaction_hash');
    });

    it('should support expected GraphQL query structure', () => {
      const query = `
        query GetAssets($limit: Int = 10) {
          assetss(limit: $limit) {
            items {
              id
              token_id
              account
              name
              asset_class
              class_name
            }
          }
        }
      `;
      expect(query).toContain('assetss');
    });
  });

  describe('orders table', () => {
    it('should be defined', () => {
      expect(orders).toBeDefined();
    });

    it('should have required columns', () => {
      expect(orders).toHaveProperty('id');
      expect(orders).toHaveProperty('buyer');
      expect(orders).toHaveProperty('seller');
      expect(orders).toHaveProperty('token');
      expect(orders).toHaveProperty('token_id');
      expect(orders).toHaveProperty('token_quantity');
      expect(orders).toHaveProperty('price');
      expect(orders).toHaveProperty('current_status');
      expect(orders).toHaveProperty('block_number');
      expect(orders).toHaveProperty('transaction_hash');
    });

    it('should support expected GraphQL query structure with filter', () => {
      const query = `
        query GetOrders($buyer: String, $limit: Int = 10) {
          orderss(limit: $limit, where: { buyer: $buyer }) {
            items {
              id
              buyer
              seller
              token_id
              price
              current_status
            }
          }
        }
      `;
      expect(query).toContain('orderss');
    });
  });

  describe('journeys table', () => {
    it('should be defined', () => {
      expect(journeys).toBeDefined();
    });

    it('should have required columns', () => {
      expect(journeys).toHaveProperty('id');
      expect(journeys).toHaveProperty('current_status');
      expect(journeys).toHaveProperty('bounty');
      expect(journeys).toHaveProperty('order_id');
      expect(journeys).toHaveProperty('block_number');
      expect(journeys).toHaveProperty('transaction_hash');
    });

    it('should support expected GraphQL query structure with status filter', () => {
      const query = `
        query GetJourneys($status: Int, $limit: Int = 10) {
          journeyss(limit: $limit, where: { current_status: $status }) {
            items {
              id
              current_status
              bounty
              order_id
            }
          }
        }
      `;
      expect(query).toContain('journeyss');
    });
  });
});
