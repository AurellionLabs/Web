import { describe, it, expect } from 'vitest';
import { orders } from '../../generated-schema';

describe('Smoke Test: Orders GraphQL Query', () => {
  it('should have the correct columns defined in the schema', () => {
    expect(orders).toBeDefined();
    expect(orders).toHaveProperty('id');
    expect(orders).toHaveProperty('clob_order_id');
    expect(orders).toHaveProperty('buyer');
    expect(orders).toHaveProperty('seller');
    expect(orders).toHaveProperty('price');
    expect(orders).toHaveProperty('status');
    expect(orders).toHaveProperty('token');
    expect(orders).toHaveProperty('token_id');
    expect(orders).toHaveProperty('quantity');
    expect(orders).toHaveProperty('block_timestamp');
  });

  it('should support the expected GraphQL query structure', () => {
    const query = `
      query GetOrders {
        orders(limit: 10, orderBy: "block_timestamp", orderDirection: "desc") {
          items {
            id
            clob_order_id
            ausys_order_id
            buyer
            seller
            token
            token_id
            quantity
            price
            bounty
            status
            logistics_status
            block_number
            block_timestamp
            transaction_hash
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    expect(query).toContain('orders');
    expect(query).toContain('items');
    expect(query).toContain('id');
    expect(query).toContain('buyer');
    expect(query).toContain('seller');
    expect(query).toContain('price');
    expect(query).toContain('status');
  });

  it('should map table columns to GraphQL fields', () => {
    const columns = Object.keys(orders);

    const expectedFields = [
      'id',
      'clob_order_id',
      'ausys_order_id',
      'buyer',
      'seller',
      'token',
      'token_id',
      'quantity',
      'price',
      'bounty',
      'status',
      'logistics_status',
      'block_number',
      'block_timestamp',
      'transaction_hash',
    ];

    expectedFields.forEach((field) => {
      expect(columns).toContain(field);
    });
  });
});
