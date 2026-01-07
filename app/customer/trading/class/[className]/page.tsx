'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMainProvider } from '@/app/providers/main.provider';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { Asset } from '@/domain/shared';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';

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
import { DepositForTradingModal } from '@/app/components/trading/deposit-for-trading-modal';

// Hooks
import { useClassAssets } from '@/hooks/useClassAssets';
import { useAssetPrice } from '@/hooks/useAssetPrice';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useDiamond } from '@/app/providers/diamond.provider';
import { useWallet } from '@/hooks/useWallet';

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
  // Use tokenId from the domain Asset (now standardized as string)
  const tokenIdValue = asset.tokenId || asset.tokenID?.toString() || '0';

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
  const { getOwnedNodes, placeSellOrderFromNode, getNodeTokenBalance } =
    useDiamond();
  const { address, connectedWallet } = useWallet();

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [pendingSellOrder, setPendingSellOrder] = useState<{
    tokenId: string;
    tokenName: string;
    nodeHash: string;
    walletBalance: bigint;
    nodeBalance: bigint;
    requiredAmount: bigint;
    price: bigint;
  } | null>(null);

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

  // Find the selected asset
  const selectedAsset = useMemo(() => {
    if (!selectedAssetType) return null;
    return assets.find((a) => a.name === selectedAssetType) || null;
  }, [selectedAssetType, assets]);

  // Fetch real price from CLOB orderbook
  const { priceData, isLoading: isPriceLoading } = useAssetPrice(
    selectedAsset?.tokenId || '0',
  );

  // Create tradeable asset from selected type
  // Uses real price from CLOB when available, falls back to mock price
  const tradeableAsset = useMemo(():
    | (TokenizedAssetUI & { tokenId: string })
    | null => {
    if (!selectedAsset) return null;

    // Use real price from CLOB if available, otherwise use mock
    const price =
      priceData?.price && priceData.price > 0
        ? priceData.price
        : generateMockPrice(selectedAsset.name);

    return assetToTradeAsset(selectedAsset, className, price);
  }, [selectedAsset, className, priceData]);

  // Get base price for chart and order book
  const basePrice = useMemo(() => {
    // Use real price from CLOB if available
    if (priceData?.price && priceData.price > 0) {
      return priceData.price;
    }
    // Fall back to mock price
    if (selectedAssetType) {
      return generateMockPrice(selectedAssetType);
    }
    return 100;
  }, [priceData, selectedAssetType]);

  // Fetch user's owned assets for selling (filtered by this class)
  const {
    sellableAssets,
    isLoading: isLoadingSellable,
    hasAssets: hasSellableAssets,
  } = useUserAssets(className);

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

        // For SELL orders: use Diamond's placeSellOrderFromNode
        // Node must have deposited tokens first
        if (order.side === 'sell') {
          console.log(
            '[ClassTradingPage] Sell order - checking node inventory...',
          );

          // Get user's owned nodes
          const ownedNodes = await getOwnedNodes();
          if (ownedNodes.length === 0) {
            console.error(
              '[ClassTradingPage] No owned nodes found for selling',
            );
            return false;
          }

          // Use the first owned node
          const nodeHash = ownedNodes[0];
          const tokenId = assetWithTokenId.tokenId || '0';

          // Check node's deposited balance
          const nodeBalance = await getNodeTokenBalance(nodeHash, tokenId);
          console.log(
            '[ClassTradingPage] Node balance:',
            nodeBalance.toString(),
            'Required:',
            quantity.toString(),
          );

          // If insufficient balance, show deposit modal
          if (nodeBalance < quantity) {
            console.log(
              '[ClassTradingPage] Insufficient node balance - showing deposit modal',
            );

            // Get wallet balance for the modal
            let walletBalance = BigInt(0);
            try {
              const { NEXT_PUBLIC_AURA_ASSET_ADDRESS } = await import(
                '@/chain-constants'
              );
              const { ethers } = await import('ethers');

              if (connectedWallet && address) {
                const ethereumProvider =
                  await connectedWallet.getEthereumProvider();
                const provider = new ethers.BrowserProvider(ethereumProvider);
                const auraAsset = new ethers.Contract(
                  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
                  [
                    'function balanceOf(address account, uint256 id) view returns (uint256)',
                  ],
                  provider,
                );
                walletBalance = BigInt(
                  await auraAsset.balanceOf(address, tokenId),
                );
              }
            } catch (err) {
              console.error(
                '[ClassTradingPage] Error getting wallet balance:',
                err,
              );
            }

            // Set pending order and show modal
            setPendingSellOrder({
              tokenId,
              tokenName: tradeableAsset?.name || 'Asset',
              nodeHash,
              walletBalance,
              nodeBalance,
              requiredAmount: quantity,
              price: priceInWei,
            });
            setShowDepositModal(true);
            return false; // Don't place order yet
          }

          console.log(
            '[ClassTradingPage] Placing sell order from node:',
            nodeHash,
          );

          try {
            // Place sell order directly from Diamond (tokens already deposited)
            const orderId = await placeSellOrderFromNode(
              nodeHash,
              tokenId,
              NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
              priceInWei,
              quantity,
            );
            console.log(
              '[ClassTradingPage] Sell order placed from node:',
              orderId,
            );
            return true;
          } catch (sellError: any) {
            console.error(
              '[ClassTradingPage] Failed to place sell order from node:',
              sellError,
            );
            // Check if error is about insufficient balance
            if (
              sellError.message?.includes('Insufficient node balance') ||
              sellError.message?.includes('insufficient balance')
            ) {
              // Show deposit modal
              let walletBalance = BigInt(0);
              let nodeBalance = BigInt(0);
              try {
                const { NEXT_PUBLIC_AURA_ASSET_ADDRESS } = await import(
                  '@/chain-constants'
                );
                const { ethers } = await import('ethers');

                if (connectedWallet && address) {
                  const ethereumProvider =
                    await connectedWallet.getEthereumProvider();
                  const provider = new ethers.BrowserProvider(ethereumProvider);
                  const auraAsset = new ethers.Contract(
                    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
                    [
                      'function balanceOf(address account, uint256 id) view returns (uint256)',
                    ],
                    provider,
                  );
                  walletBalance = BigInt(
                    await auraAsset.balanceOf(address, tokenId),
                  );
                }

                // Fetch actual node balance
                try {
                  nodeBalance = await getNodeTokenBalance(nodeHash, tokenId);
                } catch (nodeErr) {
                  console.error(
                    '[ClassTradingPage] Error getting node balance:',
                    nodeErr,
                  );
                }
              } catch (err) {
                console.error(
                  '[ClassTradingPage] Error getting wallet balance:',
                  err,
                );
              }

              setPendingSellOrder({
                tokenId,
                tokenName: tradeableAsset?.name || 'Asset',
                nodeHash,
                walletBalance,
                nodeBalance,
                requiredAmount: quantity,
                price: priceInWei,
              });
              setShowDepositModal(true);
            }
            return false;
          }
        }

        // For BUY orders: use regular CLOB flow (buyer pays from wallet)
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
          // Market order - executes immediately at best available price
          // For market orders, we need to use the best available price from the order book
          const { clobRepository } = await import(
            '@/infrastructure/repositories/clob-repository'
          );

          // Fetch current order book to get best prices
          const orderBookData = await clobRepository.getOrderBook(
            NEXT_PUBLIC_AURA_GOAT_ADDRESS,
            clobParams.baseTokenId,
            10,
          );

          let marketMaxPrice: bigint;

          if (order.side === 'buy') {
            // For buy market orders: use best ask (lowest sell price) + 10% slippage
            const bestAsk = orderBookData.asks[0]?.price;
            if (bestAsk && bestAsk > 0) {
              const bestAskWei = BigInt(Math.round(bestAsk * 1e18));
              marketMaxPrice = (bestAskWei * BigInt(110)) / BigInt(100);
              console.log(
                '[ClassTradingPage] Market buy: using best ask',
                bestAsk,
                'with 10% slippage',
              );
            } else {
              marketMaxPrice = (priceInWei * BigInt(150)) / BigInt(100);
              console.log(
                '[ClassTradingPage] Market buy: no asks, using fallback price',
              );
            }
          } else {
            // For sell market orders: use best bid (highest buy price) - 10% slippage
            const bestBid = orderBookData.bids[0]?.price;
            if (bestBid && bestBid > 0) {
              const bestBidWei = BigInt(Math.round(bestBid * 1e18));
              marketMaxPrice = (bestBidWei * BigInt(90)) / BigInt(100);
              console.log(
                '[ClassTradingPage] Market sell: using best bid',
                bestBid,
                'with 10% slippage',
              );
            } else {
              marketMaxPrice = (priceInWei * BigInt(50)) / BigInt(100);
              console.log(
                '[ClassTradingPage] Market sell: no bids, using fallback price',
              );
            }
          }

          const result = await orderBridgeService.placeMarketOrder({
            ...clobParams,
            maxPrice: marketMaxPrice,
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
    [
      tradeableAsset,
      getOwnedNodes,
      placeSellOrderFromNode,
      getNodeTokenBalance,
      connectedWallet,
      address,
    ],
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
              {selectedAssetType && tradeableAsset && (
                <OrderBook
                  assetId={tradeableAsset.id}
                  baseToken={NEXT_PUBLIC_AURA_GOAT_ADDRESS}
                  baseTokenId={tradeableAsset.tokenId}
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
                  sellableAssets={sellableAssets}
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

      {/* Deposit Modal - shown when user tries to sell without deposited tokens */}
      {pendingSellOrder && (
        <DepositForTradingModal
          open={showDepositModal}
          onOpenChange={setShowDepositModal}
          tokenId={pendingSellOrder.tokenId}
          tokenName={pendingSellOrder.tokenName}
          nodeHash={pendingSellOrder.nodeHash}
          walletBalance={pendingSellOrder.walletBalance}
          nodeBalance={pendingSellOrder.nodeBalance}
          requiredAmount={pendingSellOrder.requiredAmount}
          onDepositComplete={async () => {
            // After deposit, retry the sell order
            if (pendingSellOrder) {
              try {
                const { NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } = await import(
                  '@/chain-constants'
                );
                const orderId = await placeSellOrderFromNode(
                  pendingSellOrder.nodeHash,
                  pendingSellOrder.tokenId,
                  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
                  pendingSellOrder.price,
                  pendingSellOrder.requiredAmount,
                );
                console.log(
                  '[ClassTradingPage] Sell order placed after deposit:',
                  orderId,
                );
              } catch (err) {
                console.error(
                  '[ClassTradingPage] Failed to place order after deposit:',
                  err,
                );
              }
            }
            setPendingSellOrder(null);
          }}
        />
      )}
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
