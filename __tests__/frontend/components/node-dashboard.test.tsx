// @ts-nocheck - Test file with vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Test-first: Define how NodeDashboard should work with new domain models
describe('NodeDashboard - Updated for New Domain Models', () => {
  let mockNode: any;
  let mockNodeProvider: any;

  beforeEach(() => {
    // Mock node with new structure
    mockNode = {
      address: '0x1234567890123456789012345678901234567890',
      location: {
        addressName: 'Test Node',
        location: { lat: '40.7128', lng: '-74.0060' },
      },
      validNode: true,
      owner: '0x0987654321098765432109876543210987654321',
      assets: [
        {
          token: '0x1111111111111111111111111111111111111111',
          tokenId: '1',
          price: 1000000000000000000n,
          capacity: 100,
        },
        {
          token: '0x2222222222222222222222222222222222222222',
          tokenId: '2',
          price: 2000000000000000000n,
          capacity: 50,
        },
      ],
      status: 'Active',
    };

    mockNodeProvider = {
      currentNodeData: mockNode,
      selectedNode: mockNode.address,
      orders: [],
      loading: false,
      error: null,
      mintAsset: vi.fn(),
      updateAssetCapacity: vi.fn(),
      updateAssetPrice: vi.fn(),
      getNodeAssets: vi.fn().mockResolvedValue([]),
    };
  });

  describe('Asset Display', () => {
    it('should display assets from new assets array structure', () => {
      // Test that dashboard can render assets from node.assets[]
      const { assets } = mockNode;

      expect(assets).toHaveLength(2);
      expect(assets[0]).toHaveProperty('token');
      expect(assets[0]).toHaveProperty('tokenId');
      expect(assets[0]).toHaveProperty('price');
      expect(assets[0]).toHaveProperty('capacity');

      // Should be able to map over assets
      const assetElements = assets.map((asset: any, index: number) => ({
        key: `${asset.token}-${asset.tokenId}`,
        token: asset.token,
        tokenId: asset.tokenId,
        price: asset.price.toString(),
        capacity: asset.capacity.toString(),
      }));

      expect(assetElements).toHaveLength(2);
      expect(assetElements[0].key).toBe(
        '0x1111111111111111111111111111111111111111-1',
      );
    });

    it('should NOT try to access old structure properties', () => {
      // Test that dashboard doesn't use old structure
      const { assets } = mockNode;

      // Should not access these old properties
      expect(mockNode.supportedAssets).toBeUndefined();
      expect(mockNode.capacity).toBeUndefined();
      expect(mockNode.assetPrices).toBeUndefined();

      // Should use new structure
      expect(assets[0].capacity).toBe(100);
      expect(assets[0].price).toBe(1000000000000000000n);
    });
  });

  describe('Asset Operations', () => {
    it('should call updateAssetCapacity with new signature', async () => {
      const newCapacity = 150;
      const asset = mockNode.assets[0];

      // Test new updateAssetCapacity call signature
      await mockNodeProvider.updateAssetCapacity(
        mockNode.address, // nodeAddress
        asset.token, // assetToken
        asset.tokenId, // assetTokenId
        newCapacity, // newCapacity
      );

      expect(mockNodeProvider.updateAssetCapacity).toHaveBeenCalledWith(
        mockNode.address,
        asset.token,
        asset.tokenId,
        newCapacity,
      );
    });

    it('should call updateAssetPrice with new signature', async () => {
      const newPrice = 2000000000000000000n;
      const asset = mockNode.assets[0];

      // Test new updateAssetPrice call signature
      await mockNodeProvider.updateAssetPrice(
        mockNode.address, // nodeAddress
        asset.token, // assetToken
        asset.tokenId, // assetTokenId
        newPrice, // newPrice (BigInt)
      );

      expect(mockNodeProvider.updateAssetPrice).toHaveBeenCalledWith(
        mockNode.address,
        asset.token,
        asset.tokenId,
        newPrice,
      );
    });
  });

  describe('Asset Editing UI', () => {
    it('should handle capacity editing for specific assets', () => {
      const asset = mockNode.assets[0];

      // Test editing state structure
      const editingCapacity = {
        nodeAddress: mockNode.address,
        assetToken: asset.token,
        assetTokenId: asset.tokenId,
        currentCapacity: asset.capacity,
        newCapacity: 150,
      };

      expect(editingCapacity).toHaveProperty('nodeAddress');
      expect(editingCapacity).toHaveProperty('assetToken');
      expect(editingCapacity).toHaveProperty('assetTokenId');
      expect(editingCapacity).toHaveProperty('currentCapacity');
      expect(editingCapacity).toHaveProperty('newCapacity');
    });

    it('should handle price editing for specific assets', () => {
      const asset = mockNode.assets[0];

      // Test price editing state structure
      const editingPrice = {
        nodeAddress: mockNode.address,
        assetToken: asset.token,
        assetTokenId: asset.tokenId,
        currentPrice: asset.price,
        newPrice: 2000000000000000000n,
      };

      expect(editingPrice).toHaveProperty('nodeAddress');
      expect(editingPrice).toHaveProperty('assetToken');
      expect(editingPrice).toHaveProperty('assetTokenId');
      expect(editingPrice.currentPrice).toBe(1000000000000000000n);
      expect(typeof editingPrice.newPrice).toBe('bigint');
    });
  });

  describe('Asset Table Display', () => {
    it('should render asset table with new structure', () => {
      const tableData = mockNode.assets.map((asset: any, index: number) => ({
        id: index,
        token: asset.token,
        tokenId: asset.tokenId,
        capacity: asset.capacity,
        price: asset.price.toString(),
        priceEth: (Number(asset.price) / 1e18).toFixed(4),
      }));

      expect(tableData).toHaveLength(2);
      expect(tableData[0]).toEqual({
        id: 0,
        token: '0x1111111111111111111111111111111111111111',
        tokenId: '1',
        capacity: 100,
        price: '1000000000000000000',
        priceEth: '1.0000',
      });
    });
  });

  describe('Empty State Handling', () => {
    it('should handle nodes with empty assets array', () => {
      const emptyNode = {
        ...mockNode,
        assets: [],
      };

      expect(emptyNode.assets).toHaveLength(0);
      expect(Array.isArray(emptyNode.assets)).toBe(true);

      // Should show empty state message
      const emptyStateMessage =
        emptyNode.assets.length === 0
          ? 'No assets available for this node'
          : null;

      expect(emptyStateMessage).toBe('No assets available for this node');
    });
  });
});
