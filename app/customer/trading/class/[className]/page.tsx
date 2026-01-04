'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMainProvider } from '@/app/providers/main.provider';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { Asset } from '@/domain/shared';

// Components
import { GlassCard } from '@/app/components/ui/glass-card';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { OrderBook } from '@/app/components/trading/order-book';
import { TradePanel } from '@/app/components/trading/trade-panel';
import {
  AssetTypeSelector,
  AttributeFilterPanel,
} from '@/app/components/trading/class-detail';
import {
  TradingEmptyState,
  AssetTableSkeleton,
} from '@/app/components/trading/shared';
import { PriceChart } from '@/app/components/trading/price-chart';
import { TradingErrorBoundary } from '@/app/components/error-boundary';

// Hooks
import { useClassAssets } from '@/hooks/useClassAssets';

// Icons
import { ArrowLeft, RefreshCw, TrendingUp } from 'lucide-react';

// =============================================================================
// ASSET ADAPTER
// =============================================================================

/**
 * Converts a domain Asset to a TokenizedAssetUI for use with TradePanel.
 * This adapter bridges the gap between the platform data source and the trade UI.
 *
 * @param asset - Domain asset from useClassAssets
 * @param className - The asset class name
 * @param mockPrice - A mock price to use (will be replaced with real price data later)
 * @returns TokenizedAssetUI compatible object with tokenId for CLOB
 */
function assetToTradeAsset(
  asset: Asset,
  className: string,
  mockPrice: number = 100,
): TokenizedAssetUI & { tokenId: string } {
  // Handle both tokenID (bigint from domain) and tokenId (string from repository)
  // This is a workaround for the type mismatch between domain and repository
  const assetAny = asset as any;
  const tokenIdValue =
    assetAny.tokenId?.toString() || assetAny.tokenID?.toString() || '0';

  return {
    id: `${asset.name}-${className}`, // Display ID
    tokenId: tokenIdValue, // Numeric token ID for CLOB
    amount: '0', // Placeholder - actual balance would come from wallet
    name: asset.name,
    class: className,
    fileHash: '', // Would come from IPFS metadata
    status: 'Active',
    nodeAddress: '', // Would come from node data
    nodeLocation: {
      addressName: '',
      location: { lat: '0', lng: '0' },
    },
    price: mockPrice.toFixed(2),
    capacity: '1000', // Placeholder
    totalValue: mockPrice * 1000, // Computed field
  };
}

/**
 * Generate a mock base price for an asset type.
 * This is deterministic based on asset name for consistent UX.
 */
function generateMockPrice(assetName: string): number {
  // Create a simple hash from asset name for consistent pricing
  let hash = 0;
  for (let i = 0; i < assetName.length; i++) {
    hash = (hash << 5) - hash + assetName.charCodeAt(i);
    hash = hash & hash;
  }
  // Generate price between 50 and 200
  return 50 + (Math.abs(hash) % 150);
}

// =============================================================================
// PAGE CONTENT
// =============================================================================

function ClassDetailPageContent() {
  const params = useParams();
  const { setCurrentUserRole } = useMainProvider();

  // Get class name from URL params
  const className = decodeURIComponent(params.className as string);

  // Fetch class assets
  const {
    assets,
    filteredAssets,
    assetTypes,
    isLoading,
    error,
    filters,
    setFilters,
    selectedAssetType,
    setSelectedAssetType,
    refetch,
  } = useClassAssets(className);

  // State
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Create tradeable asset from selected type
  // This uses the first filtered asset matching the selected type
  const tradeableAsset = useMemo((): TokenizedAssetUI | null => {
    if (!selectedAssetType) return null;

    // Find the first asset matching the selected type
    const matchingAsset = assets.find((a) => a.name === selectedAssetType);
    if (!matchingAsset) return null;

    const mockPrice = generateMockPrice(selectedAssetType);
    return assetToTradeAsset(matchingAsset, className, mockPrice);
  }, [selectedAssetType, assets, className]);

  // Get base price for chart and order book
  const basePrice = useMemo(() => {
    if (selectedAssetType) {
      return generateMockPrice(selectedAssetType);
    }
    return 100;
  }, [selectedAssetType]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Handle price click from order book
  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    console.log(`Clicked ${side} at ${price}`);
    // TODO: Could pre-fill the trade panel price
  }, []);

  // Handle order placement - connects TradePanel to CLOB
  const handlePlaceOrder = useCallback(
    async (order: {
      side: 'buy' | 'sell';
      type: 'limit' | 'market';
      price: number;
      quantity: number;
      total: number;
      assetId: string;
    }): Promise<boolean> => {
      console.log('[ClassTradingPage] Placing order:', order);

      if (!tradeableAsset) {
        console.error('[ClassTradingPage] No asset selected for order');
        return false;
      }

      try {
        // Import services dynamically
        const { orderBridgeService } = await import(
          '@/infrastructure/services/order-bridge-service'
        );
        const {
          NEXT_PUBLIC_AURA_GOAT_ADDRESS,
          NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
        } = await import('@/chain-constants');

        // Convert price to proper format (wei)
        const priceInWei = BigInt(Math.round(order.price * 1e18));
        const quantity = BigInt(order.quantity);

        // Build CLOB order params
        // Note: tradeableAsset has tokenId (string) for CLOB compatibility
        const assetWithTokenId = tradeableAsset as TokenizedAssetUI & {
          tokenId: string;
        };
        const clobParams = {
          baseToken: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
          baseTokenId: assetWithTokenId.tokenId || '0',
          quoteToken: NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
          price: priceInWei,
          amount: quantity,
          isBuy: order.side === 'buy',
        };

        console.log('[ClassTradingPage] Placing CLOB order:', clobParams);

        // Place order on CLOB
        if (order.type === 'limit') {
          const result = await orderBridgeService.placeLimitOrderAndBridge(
            clobParams,
            false, // Don't bridge immediately - wait for match
          );

          if (!result.success) {
            console.error(
              '[ClassTradingPage] CLOB order failed:',
              result.error,
            );
            return false;
          }

          console.log(
            '[ClassTradingPage] CLOB order placed:',
            result.unifiedOrderId,
          );
          return true;
        } else {
          // Market order - executes immediately
          const result = await orderBridgeService.placeMarketOrder({
            ...clobParams,
            maxPrice: (priceInWei * BigInt(105)) / BigInt(100), // 5% slippage tolerance
          });

          if (!result.success) {
            console.error(
              '[ClassTradingPage] Market order failed:',
              result.error,
            );
            return false;
          }

          console.log(
            '[ClassTradingPage] Market order executed:',
            result.orderId,
          );
          return true;
        }
      } catch (error) {
        console.error('[ClassTradingPage] Error placing order:', error);
        return false;
      }
    },
    [tradeableAsset],
  );

  // Render loading state
  if (isLoading && assets.length === 0) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-[1800px] mx-auto">
          {/* Breadcrumb skeleton */}
          <div className="h-6 w-48 bg-muted/50 rounded mb-6 animate-pulse" />

          {/* Header skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="h-8 w-40 bg-muted/50 rounded mb-2 animate-pulse" />
              <div className="h-4 w-64 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <div className="h-96 bg-glass-bg rounded-xl border border-glass-border animate-pulse" />
            </div>
            <div className="lg:col-span-6">
              <AssetTableSkeleton rows={6} />
            </div>
            <div className="lg:col-span-3">
              <div className="h-96 bg-glass-bg rounded-xl border border-glass-border animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && assets.length === 0) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-[1800px] mx-auto">
          <TradingEmptyState
            type="error"
            title="Failed to Load Assets"
            description={error}
            actionLabel="Try Again"
            onAction={handleRefresh}
            isLoading={isRefreshing}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            href="/customer/trading"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Trading
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium capitalize">
            {className}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground capitalize">
              {className}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {assets.length} assets • {assetTypes.length} types available
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status="live" label="Live" pulse size="sm" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn(
                'p-2 rounded-lg',
                'bg-glass-bg border border-glass-border',
                'hover:border-accent/30 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label="Refresh assets"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-muted-foreground',
                  (isRefreshing || isLoading) && 'animate-spin',
                )}
              />
            </button>
          </div>
        </div>

        {/* Main content grid - Hyperliquid-style layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar - Asset Types & Filters */}
          <div className="lg:col-span-3 space-y-6">
            {/* Asset type selector */}
            <AssetTypeSelector
              assets={assets}
              selectedType={selectedAssetType}
              onSelect={setSelectedAssetType}
              testId="asset-type-selector"
            />

            {/* Attribute filters */}
            <AttributeFilterPanel
              assets={
                selectedAssetType
                  ? assets.filter((a) => a.name === selectedAssetType)
                  : assets
              }
              filters={filters}
              onFiltersChange={setFilters}
              testId="attribute-filters"
            />

            {/* Filtered assets summary */}
            {selectedAssetType && filteredAssets.length > 0 && (
              <GlassCard>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Matching Assets ({filteredAssets.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredAssets.slice(0, 10).map((asset, i) => (
                    <div
                      key={`${asset.name}-${asset.tokenID || i}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-overlay/50"
                    >
                      <span className="text-sm text-foreground">
                        {asset.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Token #{asset.tokenID?.toString() || 'N/A'}
                      </span>
                    </div>
                  ))}
                  {filteredAssets.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{filteredAssets.length - 10} more assets
                    </p>
                  )}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Center - Price Chart (larger) */}
          <div className="lg:col-span-6">
            {/* Prompt to select asset type */}
            {!selectedAssetType ? (
              <GlassCard className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  Select an Asset Type
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose an asset type from the left panel to view price charts,
                  order book, and trading options.
                </p>
              </GlassCard>
            ) : (
              /* Professional Price Chart */
              <PriceChart
                data={[]} // Empty array triggers mock data generation
                timePeriod="1d"
                mode="candlestick"
                height={500}
                showVolume={true}
                assetName={selectedAssetType}
                currentPrice={basePrice}
              />
            )}
          </div>

          {/* Right sidebar - Order Book + Trade Panel (stacked) */}
          <div className="lg:col-span-3">
            <div className="sticky top-20 space-y-6">
              {/* Order Book (compact) */}
              {selectedAssetType && (
                <OrderBook
                  assetId={tradeableAsset?.id || 'preview'}
                  basePrice={basePrice}
                  maxLevels={5}
                  onPriceClick={handlePriceClick}
                  compact
                />
              )}

              {/* Trade Panel */}
              {selectedAssetType && tradeableAsset ? (
                <TradePanel
                  asset={tradeableAsset}
                  initialPrice={basePrice}
                  onPlaceOrder={handlePlaceOrder}
                />
              ) : (
                <GlassCard className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    Select an asset type to place an order
                  </p>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORT WITH ERROR BOUNDARY
// =============================================================================

export default function ClassDetailPage() {
  return (
    <TradingErrorBoundary>
      <ClassDetailPageContent />
    </TradingErrorBoundary>
  );
}
