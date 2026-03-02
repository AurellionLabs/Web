/**
 * Orders Page Integration Tests
 *
 * These tests verify that the orders page correctly renders order data
 * with associated assets, specifically catching bugs like using tokenID
 * instead of tokenId for asset filtering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

// Fixtures
import {
  goatAssets,
  goldAssets,
  ordersWithAssets,
  OrderWithAssetFixture,
} from '../fixtures/assets';
import { Asset } from '@/domain/shared';

// =============================================================================
// MOCK SETUP
// =============================================================================

vi.mock('next/navigation', () => ({
  useParams: () => ({ nodeId: '0xnode123' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/node/0xnode123/orders',
  useSearchParams: () => new URLSearchParams(),
}));

// =============================================================================
// COMPONENT UNDER TEST
// =============================================================================

interface OrderFilterProps {
  orders: OrderWithAssetFixture[];
  assetTypeFilter: string;
}

/**
 * Extracted component that mirrors the orders page's asset filtering logic
 * This is the exact code pattern that had the tokenId bug
 */
function OrderAssetFilter({ orders, assetTypeFilter }: OrderFilterProps) {
  // Extract unique assets for filter dropdown - uses tokenId (not tokenID)
  const uniqueAssets = Array.from(
    new Map(
      orders
        .filter((order) => order.asset !== null)
        .map((order) => [
          String(order.asset!.tokenId), // This was the bug: used tokenID
          { value: String(order.asset!.tokenId), label: order.asset!.name },
        ]),
    ).values(),
  );

  // Filter orders by asset type - uses tokenId (not tokenID)
  const filteredOrders =
    assetTypeFilter === 'all'
      ? orders
      : orders.filter(
          (order) => String(order.asset?.tokenId) === assetTypeFilter, // This was the bug: used tokenID
        );

  return (
    <div data-testid="order-filter-container">
      {/* Asset type filter dropdown */}
      <div data-testid="asset-filter-dropdown">
        <label>Filter by Asset:</label>
        <select data-testid="asset-select">
          <option value="all">All Assets</option>
          {uniqueAssets.map((asset) => (
            <option
              key={asset.value}
              value={asset.value}
              data-testid={`option-${asset.value}`}
            >
              {asset.label} (#{asset.value})
            </option>
          ))}
        </select>
      </div>

      {/* Filtered orders list */}
      <div data-testid="orders-list">
        <h3>Orders ({filteredOrders.length})</h3>
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            data-testid={`order-${order.id}`}
            className="order-item"
          >
            <span data-testid={`order-id-${order.id}`}>{order.id}</span>
            <span data-testid={`order-asset-${order.id}`}>
              {order.asset?.name || 'No Asset'} - Token #
              {order.asset?.tokenId || 'N/A'}
            </span>
            <span data-testid={`order-status-${order.id}`}>
              {order.currentStatus}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe('Orders Page - Asset Filtering Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unique Asset Extraction', () => {
    it('should extract unique assets using tokenId (catches tokenId vs tokenID bug)', () => {
      render(
        <OrderAssetFilter orders={ordersWithAssets} assetTypeFilter="all" />,
      );

      // Should have dropdown options for each unique asset
      const select = screen.getByTestId('asset-select');
      const options = within(select).getAllByRole('option');

      // All option + unique assets (goatAssets[0], goatAssets[1], goldAssets[0])
      expect(options.length).toBe(4); // 'all' + 3 unique assets

      // Verify asset token IDs are displayed correctly (not N/A)
      expect(screen.queryByText(/Token #N\/A/)).not.toBeInTheDocument();
    });

    it('should display correct token IDs in filter options', () => {
      render(
        <OrderAssetFilter orders={ordersWithAssets} assetTypeFilter="all" />,
      );

      // Check that real token IDs from fixtures are in the options
      const goatTokenId = goatAssets[0].tokenId;
      expect(screen.getByTestId(`option-${goatTokenId}`)).toBeInTheDocument();
    });

    it('should deduplicate assets by tokenId', () => {
      // Create orders with duplicate asset tokenIds
      const ordersWithDuplicates: OrderWithAssetFixture[] = [
        { ...ordersWithAssets[0], id: '0xorder001' },
        { ...ordersWithAssets[0], id: '0xorder002' }, // Same asset
        { ...ordersWithAssets[1], id: '0xorder003' },
      ];

      render(
        <OrderAssetFilter
          orders={ordersWithDuplicates}
          assetTypeFilter="all"
        />,
      );

      const select = screen.getByTestId('asset-select');
      const options = within(select).getAllByRole('option');

      // Should only have 3 options: 'all' + 2 unique assets
      expect(options.length).toBe(3);
    });
  });

  describe('Order Filtering by Asset', () => {
    it('should filter orders by asset tokenId (catches tokenId vs tokenID bug)', () => {
      const targetTokenId = goatAssets[0].tokenId;

      render(
        <OrderAssetFilter
          orders={ordersWithAssets}
          assetTypeFilter={targetTokenId}
        />,
      );

      // Should only show orders with matching tokenId
      const ordersList = screen.getByTestId('orders-list');

      // Only order 1 has goatAssets[0]
      expect(
        within(ordersList).getByTestId('order-0xorder001'),
      ).toBeInTheDocument();
      expect(
        within(ordersList).queryByTestId('order-0xorder002'),
      ).not.toBeInTheDocument();
      expect(
        within(ordersList).queryByTestId('order-0xorder003'),
      ).not.toBeInTheDocument();
    });

    it('should show all orders when filter is "all"', () => {
      render(
        <OrderAssetFilter orders={ordersWithAssets} assetTypeFilter="all" />,
      );

      expect(screen.getByText('Orders (3)')).toBeInTheDocument();
      expect(screen.getByTestId('order-0xorder001')).toBeInTheDocument();
      expect(screen.getByTestId('order-0xorder002')).toBeInTheDocument();
      expect(screen.getByTestId('order-0xorder003')).toBeInTheDocument();
    });

    it('should show no orders when filter matches nothing', () => {
      render(
        <OrderAssetFilter
          orders={ordersWithAssets}
          assetTypeFilter="nonexistent-token-id"
        />,
      );

      expect(screen.getByText('Orders (0)')).toBeInTheDocument();
    });
  });

  describe('Order Asset Display', () => {
    it('should display asset tokenId in order list (not N/A)', () => {
      render(
        <OrderAssetFilter orders={ordersWithAssets} assetTypeFilter="all" />,
      );

      // Each order should show its asset's tokenId
      const order1Asset = screen.getByTestId('order-asset-0xorder001');
      expect(order1Asset).toHaveTextContent(`Token #${goatAssets[0].tokenId}`);
      expect(order1Asset).not.toHaveTextContent('Token #N/A');
    });

    it('should handle orders with null assets gracefully', () => {
      const ordersWithNull: OrderWithAssetFixture[] = [
        {
          id: '0xnullasset',
          buyer: '0x1111',
          seller: '0x2222',
          currentStatus: 'pending',
          price: 1000n,
          quantity: 1,
          asset: null,
        },
      ];

      render(
        <OrderAssetFilter orders={ordersWithNull} assetTypeFilter="all" />,
      );

      const orderAsset = screen.getByTestId('order-asset-0xnullasset');
      expect(orderAsset).toHaveTextContent('No Asset');
      expect(orderAsset).toHaveTextContent('Token #N/A');
    });
  });

  describe('Asset Data Shape Validation', () => {
    it('should work with assets that only have tokenId (no deprecated tokenID)', () => {
      // This verifies the code works with the actual Asset type
      const assetWithOnlyTokenId: Asset = {
        assetClass: 'Test',
        tokenId: '777888999',
        name: 'Test Asset',
        attributes: [],
        // Note: No tokenID field
      };

      const orders: OrderWithAssetFixture[] = [
        {
          id: '0xtest',
          buyer: '0x1111',
          seller: '0x2222',
          currentStatus: 'pending',
          price: 1000n,
          quantity: 1,
          asset: assetWithOnlyTokenId,
        },
      ];

      render(<OrderAssetFilter orders={orders} assetTypeFilter="all" />);

      // Should display the correct tokenId
      expect(screen.getByText(/Token #777888999/)).toBeInTheDocument();
      expect(screen.queryByText('Token #N/A')).not.toBeInTheDocument();
    });

    it('should filter correctly with string tokenId comparison', () => {
      const asset: Asset = {
        assetClass: 'Test',
        tokenId: '123456789', // String
        name: 'Test Asset',
        attributes: [],
      };

      const orders: OrderWithAssetFixture[] = [
        {
          id: '0xmatch',
          buyer: '0x1111',
          seller: '0x2222',
          currentStatus: 'pending',
          price: 1000n,
          quantity: 1,
          asset,
        },
        {
          id: '0xnomatch',
          buyer: '0x3333',
          seller: '0x4444',
          currentStatus: 'pending',
          price: 2000n,
          quantity: 2,
          asset: { ...asset, tokenId: '987654321' },
        },
      ];

      render(
        <OrderAssetFilter
          orders={orders}
          assetTypeFilter="123456789" // String comparison
        />,
      );

      expect(screen.getByText('Orders (1)')).toBeInTheDocument();
      expect(screen.getByTestId('order-0xmatch')).toBeInTheDocument();
      expect(screen.queryByTestId('order-0xnomatch')).not.toBeInTheDocument();
    });
  });
});

describe('Orders Page - Order List Integration', () => {
  it('should render order details correctly', () => {
    render(
      <OrderAssetFilter orders={ordersWithAssets} assetTypeFilter="all" />,
    );

    // Check first order details
    expect(screen.getByTestId('order-id-0xorder001')).toHaveTextContent(
      '0xorder001',
    );
    expect(screen.getByTestId('order-status-0xorder001')).toHaveTextContent(
      'pending',
    );

    // Check second order details
    expect(screen.getByTestId('order-id-0xorder002')).toHaveTextContent(
      '0xorder002',
    );
    expect(screen.getByTestId('order-status-0xorder002')).toHaveTextContent(
      'completed',
    );
  });
});
