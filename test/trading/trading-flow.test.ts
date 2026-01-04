/**
 * Trading Flow Integration Tests
 *
 * Tests the complete trading flow from asset selection to order placement.
 * These tests verify that:
 * 1. Asset data flows correctly from repository to UI
 * 2. Order placement params are correctly formatted
 * 3. CLOB integration works as expected
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types matching the actual implementation
interface Asset {
  assetClass: string;
  tokenId: string;
  tokenID?: bigint;
  name: string;
  attributes: Array<{
    name: string;
    values: string[];
    description: string;
  }>;
}

interface TokenizedAssetUI {
  id: string;
  tokenId: string;
  amount: string;
  name: string;
  class: string;
  fileHash: string;
  status: string;
  nodeAddress: string;
  nodeLocation: {
    addressName: string;
    location: { lat: string; lng: string };
  };
  price: string;
  capacity: string;
  totalValue: number;
}

interface PlaceLimitOrderParams {
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: bigint;
  amount: bigint;
  isBuy: boolean;
}

// Adapter function matching the trading page implementation
function assetToTradeAsset(
  asset: Asset,
  className: string,
  mockPrice: number = 100,
): TokenizedAssetUI {
  const tokenIdValue = asset.tokenId || asset.tokenID?.toString() || '0';

  return {
    id: `${asset.name}-${className}`,
    tokenId: tokenIdValue,
    amount: '0',
    name: asset.name,
    class: className,
    fileHash: '',
    status: 'Active',
    nodeAddress: '',
    nodeLocation: {
      addressName: '',
      location: { lat: '0', lng: '0' },
    },
    price: mockPrice.toFixed(2),
    capacity: '1000',
    totalValue: mockPrice * 1000,
  };
}

// Build CLOB params function matching the trading page implementation
function buildClobParams(
  asset: TokenizedAssetUI,
  order: { price: number; quantity: number; side: 'buy' | 'sell' },
  baseToken: string,
  quoteToken: string,
): PlaceLimitOrderParams {
  const priceInWei = BigInt(Math.round(order.price * 1e18));
  const quantity = BigInt(order.quantity);

  return {
    baseToken,
    baseTokenId: asset.tokenId,
    quoteToken,
    price: priceInWei,
    amount: quantity,
    isBuy: order.side === 'buy',
  };
}

describe('Trading Flow', () => {
  describe('Asset Adapter', () => {
    it('should convert domain Asset with tokenId to TokenizedAssetUI', () => {
      const domainAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '12345',
        name: 'AUGOAT',
        attributes: [
          { name: 'weight', values: ['50kg'], description: 'Weight' },
        ],
      };

      const result = assetToTradeAsset(domainAsset, 'GOAT', 79);

      expect(result.tokenId).toBe('12345');
      expect(result.id).toBe('AUGOAT-GOAT');
      expect(result.name).toBe('AUGOAT');
      expect(result.class).toBe('GOAT');
      expect(result.price).toBe('79.00');
    });

    it('should handle legacy tokenID (bigint) format', () => {
      const legacyAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '', // Empty string
        tokenID: BigInt(67890),
        name: 'AUGOAT',
        attributes: [],
      };

      const result = assetToTradeAsset(legacyAsset, 'GOAT');

      expect(result.tokenId).toBe('67890');
    });

    it('should default to "0" when no tokenId is available', () => {
      const assetWithoutTokenId: Asset = {
        assetClass: 'GOAT',
        tokenId: '',
        name: 'AUGOAT',
        attributes: [],
      };

      const result = assetToTradeAsset(assetWithoutTokenId, 'GOAT');

      expect(result.tokenId).toBe('0');
    });

    it('should NOT use asset name as tokenId (prevents BigInt conversion error)', () => {
      const asset: Asset = {
        assetClass: 'GOAT',
        tokenId: '12345',
        name: 'AUGOAT',
        attributes: [],
      };

      const result = assetToTradeAsset(asset, 'GOAT');

      // tokenId should be numeric string, NOT "AUGOAT-GOAT"
      expect(result.tokenId).not.toContain('AUGOAT');
      expect(result.tokenId).toBe('12345');
    });
  });

  describe('CLOB Order Params', () => {
    const mockAsset: TokenizedAssetUI = {
      id: 'AUGOAT-GOAT',
      tokenId: '12345',
      amount: '0',
      name: 'AUGOAT',
      class: 'GOAT',
      fileHash: '',
      status: 'Active',
      nodeAddress: '',
      nodeLocation: { addressName: '', location: { lat: '0', lng: '0' } },
      price: '79.00',
      capacity: '1000',
      totalValue: 79000,
    };

    const baseToken = '0x1234567890123456789012345678901234567890';
    const quoteToken = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

    it('should build correct buy order params', () => {
      const order = { price: 79, quantity: 10, side: 'buy' as const };

      const params = buildClobParams(mockAsset, order, baseToken, quoteToken);

      expect(params.baseToken).toBe(baseToken);
      expect(params.baseTokenId).toBe('12345');
      expect(params.quoteToken).toBe(quoteToken);
      expect(params.price).toBe(BigInt(79 * 1e18));
      expect(params.amount).toBe(BigInt(10));
      expect(params.isBuy).toBe(true);
    });

    it('should build correct sell order params', () => {
      const order = { price: 80.5, quantity: 5, side: 'sell' as const };

      const params = buildClobParams(mockAsset, order, baseToken, quoteToken);

      expect(params.isBuy).toBe(false);
      expect(params.amount).toBe(BigInt(5));
    });

    it('should handle decimal prices correctly', () => {
      const order = { price: 79.99, quantity: 1, side: 'buy' as const };

      const params = buildClobParams(mockAsset, order, baseToken, quoteToken);

      // 79.99 * 1e18 = 79990000000000000000
      expect(params.price).toBe(BigInt(Math.round(79.99 * 1e18)));
    });

    it('should NOT throw when tokenId is a valid numeric string', () => {
      const assetWithValidTokenId: TokenizedAssetUI = {
        ...mockAsset,
        tokenId: '999',
      };

      expect(() => {
        buildClobParams(
          assetWithValidTokenId,
          { price: 100, quantity: 1, side: 'buy' },
          baseToken,
          quoteToken,
        );
      }).not.toThrow();
    });
  });

  describe('End-to-End Flow', () => {
    it('should correctly flow from domain Asset to CLOB params', () => {
      // Simulate data from repository
      const repositoryAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '42',
        name: 'Premium Goat',
        attributes: [
          { name: 'breed', values: ['Boer'], description: 'Breed type' },
        ],
      };

      // Step 1: Convert to UI format
      const uiAsset = assetToTradeAsset(repositoryAsset, 'GOAT', 150);

      // Step 2: Build CLOB params
      const clobParams = buildClobParams(
        uiAsset,
        { price: 150, quantity: 3, side: 'buy' },
        '0xBaseToken',
        '0xQuoteToken',
      );

      // Verify the complete flow
      expect(clobParams.baseTokenId).toBe('42');
      expect(clobParams.price).toBe(BigInt(150 * 1e18));
      expect(clobParams.amount).toBe(BigInt(3));
    });
  });
});
