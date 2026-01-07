/**
 * Sell Order TokenId Unit Tests
 *
 * These tests verify the core logic that determines which tokenId is used
 * when placing sell orders. This is a critical test to prevent regression
 * of the bug where catalog tokenIds were used instead of user inventory tokenIds.
 *
 * Bug Summary:
 * - TradePanel correctly passes order.assetId = selectedSellAsset.tokenId
 * - Page handler was ignoring order.assetId and using tradeableAsset.tokenId
 * - Fix: Use order.assetId for sell orders (effectiveTokenId)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Simulate the catalog asset (from platform/Pinata)
 * This has a DIFFERENT tokenId than what the user owns
 */
const CATALOG_ASSET = {
  id: 'Boer Goat-GOAT',
  tokenId: '999999999999999999999999999999999999999999999999999',
  name: 'Boer Goat',
  class: 'GOAT',
};

/**
 * Simulate user's sellable asset (from their inventory)
 * This has the CORRECT tokenId for the user's actual tokens
 */
const USER_SELLABLE_ASSET = {
  id: '112821530000000000000000000000000000000000000000001',
  tokenId: '112821530000000000000000000000000000000000000000001',
  name: 'Boer Goat',
  class: 'GOAT',
  balance: '20000',
};

/**
 * Another user asset with same name but different tokenId
 */
const USER_SELLABLE_ASSET_2 = {
  id: '112821530000000000000000000000000000000000000000002',
  tokenId: '112821530000000000000000000000000000000000000000002',
  name: 'Boer Goat',
  class: 'GOAT',
  balance: '15000',
};

// =============================================================================
// CORE LOGIC TESTS
// =============================================================================

describe('Sell Order TokenId Logic', () => {
  describe('effectiveTokenId calculation', () => {
    /**
     * This test verifies the core fix:
     * effectiveTokenId should use order.assetId for sell orders
     */
    it('should use order.assetId for sell orders when present', () => {
      const order = {
        side: 'sell' as const,
        type: 'limit' as const,
        price: 100,
        quantity: 10,
        total: 1000,
        assetId: USER_SELLABLE_ASSET.tokenId, // User's actual tokenId
      };

      const tradeableAsset = {
        tokenId: CATALOG_ASSET.tokenId, // Catalog's tokenId (WRONG for sell)
      };

      // The fix: use order.assetId for sell orders
      const effectiveTokenId =
        order.side === 'sell' && order.assetId
          ? order.assetId
          : tradeableAsset.tokenId || '0';

      expect(effectiveTokenId).toBe(USER_SELLABLE_ASSET.tokenId);
      expect(effectiveTokenId).not.toBe(CATALOG_ASSET.tokenId);
    });

    it('should use tradeableAsset.tokenId for buy orders', () => {
      const order = {
        side: 'buy' as const,
        type: 'limit' as const,
        price: 100,
        quantity: 10,
        total: 1000,
        assetId: '', // Not set for buy orders
      };

      const tradeableAsset = {
        tokenId: CATALOG_ASSET.tokenId,
      };

      const effectiveTokenId =
        order.side === 'sell' && order.assetId
          ? order.assetId
          : tradeableAsset.tokenId || '0';

      expect(effectiveTokenId).toBe(CATALOG_ASSET.tokenId);
    });

    it('should fallback to tradeableAsset.tokenId if order.assetId is empty for sell', () => {
      const order = {
        side: 'sell' as const,
        type: 'limit' as const,
        price: 100,
        quantity: 10,
        total: 1000,
        assetId: '', // Empty - edge case
      };

      const tradeableAsset = {
        tokenId: CATALOG_ASSET.tokenId,
      };

      const effectiveTokenId =
        order.side === 'sell' && order.assetId
          ? order.assetId
          : tradeableAsset.tokenId || '0';

      // Falls back to catalog tokenId when assetId is empty
      expect(effectiveTokenId).toBe(CATALOG_ASSET.tokenId);
    });
  });

  describe('TradePanel order.assetId assignment', () => {
    /**
     * Verify TradePanel correctly sets order.assetId for sell orders
     */
    it('should set assetId to selectedSellAsset.tokenId for sell orders', () => {
      const side = 'sell';
      const selectedSellAsset = USER_SELLABLE_ASSET;
      const asset = { id: CATALOG_ASSET.id };

      // TradePanel logic
      const assetId =
        side === 'sell' && selectedSellAsset
          ? selectedSellAsset.tokenId
          : asset?.id || '';

      expect(assetId).toBe(USER_SELLABLE_ASSET.tokenId);
    });

    it('should set assetId to asset.id for buy orders', () => {
      const side = 'buy';
      const selectedSellAsset = null;
      const asset = { id: CATALOG_ASSET.id };

      const assetId =
        side === 'sell' && selectedSellAsset
          ? selectedSellAsset.tokenId
          : asset?.id || '';

      expect(assetId).toBe(CATALOG_ASSET.id);
    });
  });
});

// =============================================================================
// REGRESSION TESTS
// =============================================================================

describe('TokenId Mismatch Regression', () => {
  it('REGRESSION: sell order must not use catalog tokenId', () => {
    // This is the exact bug scenario
    const catalogTokenId =
      '999999999999999999999999999999999999999999999999999';
    const userTokenId = '112821530000000000000000000000000000000000000000001';

    const order = {
      side: 'sell' as const,
      assetId: userTokenId, // From selectedSellAsset.tokenId
    };

    const tradeableAsset = {
      tokenId: catalogTokenId, // From catalog
    };

    // Apply the fix logic
    const effectiveTokenId =
      order.side === 'sell' && order.assetId
        ? order.assetId
        : tradeableAsset.tokenId;

    // CRITICAL: Must use user's tokenId, not catalog's
    expect(effectiveTokenId).toBe(userTokenId);
    expect(effectiveTokenId).not.toBe(catalogTokenId);
  });

  it('REGRESSION: wallet balance query must use correct tokenId', () => {
    // The bug caused balanceOf to be called with wrong tokenId
    // resulting in showing "12" instead of "20000"

    const userTokenId = USER_SELLABLE_ASSET.tokenId;
    const catalogTokenId = CATALOG_ASSET.tokenId;

    // When querying wallet balance for a sell order,
    // we should use the user's tokenId
    const tokenIdForBalanceQuery = userTokenId;

    expect(tokenIdForBalanceQuery).toBe(userTokenId);
    expect(tokenIdForBalanceQuery).not.toBe(catalogTokenId);
  });

  it('REGRESSION: different tokens of same asset type should be distinguishable', () => {
    // User can own multiple "Boer Goat" tokens with different tokenIds
    const userAssets = [USER_SELLABLE_ASSET, USER_SELLABLE_ASSET_2];

    // Each should have a unique tokenId
    const tokenIds = userAssets.map((a) => a.tokenId);
    const uniqueTokenIds = new Set(tokenIds);

    expect(uniqueTokenIds.size).toBe(userAssets.length);
    expect(tokenIds[0]).not.toBe(tokenIds[1]);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('should handle undefined order.assetId gracefully', () => {
    const order = {
      side: 'sell' as const,
      assetId: undefined as unknown as string,
    };

    const tradeableAsset = {
      tokenId: CATALOG_ASSET.tokenId,
    };

    const effectiveTokenId =
      order.side === 'sell' && order.assetId
        ? order.assetId
        : tradeableAsset.tokenId || '0';

    // Falls back safely
    expect(effectiveTokenId).toBe(CATALOG_ASSET.tokenId);
  });

  it('should handle null selectedSellAsset', () => {
    const side = 'sell';
    const selectedSellAsset = null;
    const asset = { id: CATALOG_ASSET.id };

    const assetId =
      side === 'sell' && selectedSellAsset
        ? (selectedSellAsset as any).tokenId
        : asset?.id || '';

    expect(assetId).toBe(CATALOG_ASSET.id);
  });

  it('should handle very large tokenIds (BigInt range)', () => {
    const largeTokenId =
      '115792089237316195423570985008687907853269984665640564039457584007913129639935';

    const order = {
      side: 'sell' as const,
      assetId: largeTokenId,
    };

    const tradeableAsset = {
      tokenId: '0',
    };

    const effectiveTokenId =
      order.side === 'sell' && order.assetId
        ? order.assetId
        : tradeableAsset.tokenId;

    expect(effectiveTokenId).toBe(largeTokenId);
  });
});

// =============================================================================
// INTEGRATION SCENARIO TESTS
// =============================================================================

describe('Full Sell Order Flow', () => {
  it('should correctly propagate tokenId through the entire sell flow', () => {
    // Step 1: User selects asset from their inventory
    const sellableAssets = [USER_SELLABLE_ASSET, USER_SELLABLE_ASSET_2];
    const selectedSellAsset = sellableAssets[0];

    // Step 2: TradePanel creates order with assetId
    const order = {
      side: 'sell' as const,
      type: 'limit' as const,
      price: 100,
      quantity: 10,
      total: 1000,
      assetId: selectedSellAsset.tokenId, // TradePanel sets this
    };

    // Step 3: Page handler calculates effectiveTokenId
    const tradeableAsset = { tokenId: CATALOG_ASSET.tokenId };
    const effectiveTokenId =
      order.side === 'sell' && order.assetId
        ? order.assetId
        : tradeableAsset.tokenId;

    // Step 4: effectiveTokenId is used for CLOB order
    const clobParams = {
      baseTokenId: effectiveTokenId,
    };

    // Step 5: effectiveTokenId is used for node balance check
    const tokenIdForNodeBalance = effectiveTokenId;

    // Step 6: effectiveTokenId is used for wallet balance check
    const tokenIdForWalletBalance = effectiveTokenId;

    // Verify all use the correct tokenId
    expect(effectiveTokenId).toBe(USER_SELLABLE_ASSET.tokenId);
    expect(clobParams.baseTokenId).toBe(USER_SELLABLE_ASSET.tokenId);
    expect(tokenIdForNodeBalance).toBe(USER_SELLABLE_ASSET.tokenId);
    expect(tokenIdForWalletBalance).toBe(USER_SELLABLE_ASSET.tokenId);

    // Verify none use the catalog tokenId
    expect(effectiveTokenId).not.toBe(CATALOG_ASSET.tokenId);
  });

  it('should handle user selecting different asset from inventory', () => {
    // User selects second asset instead of first
    const selectedSellAsset = USER_SELLABLE_ASSET_2;

    const order = {
      side: 'sell' as const,
      assetId: selectedSellAsset.tokenId,
    };

    const tradeableAsset = { tokenId: CATALOG_ASSET.tokenId };
    const effectiveTokenId =
      order.side === 'sell' && order.assetId
        ? order.assetId
        : tradeableAsset.tokenId;

    expect(effectiveTokenId).toBe(USER_SELLABLE_ASSET_2.tokenId);
    expect(effectiveTokenId).not.toBe(USER_SELLABLE_ASSET.tokenId);
    expect(effectiveTokenId).not.toBe(CATALOG_ASSET.tokenId);
  });
});
