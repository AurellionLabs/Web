'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMainProvider } from '@/app/providers/main.provider';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { Asset } from '@/domain/shared';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '@/chain-constants';

// EVA Components
import {
  EvaPanel,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { LiveWaveform } from '@/app/components/eva/eva-animations';

// Components
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
import {
  PriceChart,
  CandlestickData,
  TimePeriod,
} from '@/app/components/trading/price-chart';
import { TradingErrorBoundary } from '@/app/components/error-boundary';
import { DepositForTradingModal } from '@/app/components/trading/deposit-for-trading-modal';

// Services
import { priceHistoryService } from '@/infrastructure/services/price-history-service';

// Hooks
import { useClassAssets } from '@/hooks/useClassAssets';
import { useAssetPrice } from '@/hooks/useAssetPrice';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useDiamond } from '@/app/providers/diamond.provider';
import { useWallet } from '@/hooks/useWallet';
import { useOrderBook } from '@/hooks/useOrderBook';

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
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [chartPeriod, setChartPeriod] = useState<TimePeriod>('1d');
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [clickedOrderBookPrice, setClickedOrderBookPrice] = useState<
    number | undefined
  >(undefined);
  const [clickedOrderBookSide, setClickedOrderBookSide] = useState<
    'buy' | 'sell' | undefined
  >(undefined);

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

  // Fetch order book data for best bid/ask prices
  const { orderBook } = useOrderBook(tradeableAsset?.id || '', {
    baseToken: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
    baseTokenId: tradeableAsset?.tokenId || '0',
    basePrice,
    levels: 10,
    updateInterval: 5000,
  });

  // Get best bid and ask prices from order book
  const bestAskPrice = orderBook?.asks[0]?.price || 0;
  const bestBidPrice = orderBook?.bids[0]?.price || 0;

  // Fetch chart data when asset or period changes
  useEffect(() => {
    const fetchChartData = async () => {
      if (!tradeableAsset?.tokenId || tradeableAsset.tokenId === '0') {
        setChartData([]);
        return;
      }

      setIsLoadingChart(true);
      try {
        const candles = await priceHistoryService.getCandlestickData(
          NEXT_PUBLIC_DIAMOND_ADDRESS,
          tradeableAsset.tokenId,
          chartPeriod,
        );

        // Convert OHLCV candles to chart format
        const formattedData: CandlestickData[] = candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        setChartData(formattedData);
      } catch (error) {
        console.error('[ClassTradingPage] Error fetching chart data:', error);
        setChartData([]);
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchChartData();
  }, [tradeableAsset?.tokenId, chartPeriod]);

  // Handle chart period change
  const handleChartPeriodChange = useCallback((period: TimePeriod) => {
    setChartPeriod(period);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Handle price click from order book — pre-fills the trade panel
  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    setClickedOrderBookPrice(price);
    // Clicking a bid (buy order) → user likely wants to sell into it (sell side)
    // Clicking an ask (sell order) → user likely wants to buy at that price (buy side)
    setClickedOrderBookSide(side === 'bid' ? 'sell' : 'buy');
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
      nodeHash?: string; // For sell orders - which node's inventory to use
    }): Promise<boolean> => {
      if (!tradeableAsset) {
        console.error('[ClassTradingPage] No asset selected for order');
        return false;
      }

      try {
        // Import services dynamically
        const { orderBridgeService } = await import(
          '@/infrastructure/services/order-bridge-service'
        );
        const { NEXT_PUBLIC_DIAMOND_ADDRESS, NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } =
          await import('@/chain-constants');

        // Convert price to proper format (wei)
        const priceInWei = BigInt(Math.round(order.price * 1e18));
        const quantity = BigInt(order.quantity);

        // Build CLOB order params
        // For sell orders, use the tokenId from order.assetId (set by TradePanel from selectedSellAsset)
        // For buy orders, use the tokenId from the platform catalog (tradeableAsset)
        const assetWithTokenId = tradeableAsset as TokenizedAssetUI & {
          tokenId: string;
        };

        // IMPORTANT: For sell orders, order.assetId contains the user's actual token ID
        // from their inventory (sellableAssets). For buy orders, we use the catalog token ID.
        const effectiveTokenId =
          order.side === 'sell' && order.assetId
            ? order.assetId
            : assetWithTokenId.tokenId || '0';

        const clobParams = {
          baseToken: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
          baseTokenId: effectiveTokenId,
          quoteToken: NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
          price: priceInWei,
          amount: quantity,
          isBuy: order.side === 'buy',
        };

        // For SELL orders: use Diamond's placeSellOrderFromNode
        // Node must have deposited tokens first
        if (order.side === 'sell' && order.type === 'limit') {
          // Use the nodeHash from the selected asset (passed via order.nodeHash)
          // This ensures we check/use the correct node's inventory
          let nodeHash = order.nodeHash;

          if (!nodeHash) {
            // Fallback: get user's owned nodes and use the first one
            // This should rarely happen if the asset was properly selected
            console.warn(
              '[ClassTradingPage] No nodeHash in order - falling back to first owned node',
            );
            const ownedNodes = await getOwnedNodes();
            if (ownedNodes.length === 0) {
              console.error(
                '[ClassTradingPage] No owned nodes found for selling',
              );
              return false;
            }
            nodeHash = ownedNodes[0];
          }

          // Use the effective token ID (from user's inventory for sell orders)
          const tokenId = effectiveTokenId;

          // Check node's deposited balance
          const nodeBalance = await getNodeTokenBalance(nodeHash, tokenId);

          // If insufficient balance, show deposit modal
          if (nodeBalance < quantity) {
            // Get wallet balance for the modal
            let walletBalance = BigInt(0);
            try {
              const { NEXT_PUBLIC_DIAMOND_ADDRESS } = await import(
                '@/chain-constants'
              );
              const { ethers } = await import('ethers');

              if (connectedWallet && address) {
                const ethereumProvider =
                  await connectedWallet.getEthereumProvider();
                const provider = new ethers.BrowserProvider(ethereumProvider);
                const auraAsset = new ethers.Contract(
                  NEXT_PUBLIC_DIAMOND_ADDRESS,
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

          try {
            // Place sell order directly from Diamond (tokens already deposited)
            const orderId = await placeSellOrderFromNode(
              nodeHash,
              tokenId,
              NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
              priceInWei,
              quantity,
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
                const { NEXT_PUBLIC_DIAMOND_ADDRESS } = await import(
                  '@/chain-constants'
                );
                const { ethers } = await import('ethers');

                if (connectedWallet && address) {
                  const ethereumProvider =
                    await connectedWallet.getEthereumProvider();
                  const provider = new ethers.BrowserProvider(ethereumProvider);
                  const auraAsset = new ethers.Contract(
                    NEXT_PUBLIC_DIAMOND_ADDRESS,
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

        // For MARKET SELL orders: use placeNodeMarketSellOrder with best bid price
        if (order.side === 'sell' && order.type === 'market') {
          // Use the nodeHash from the order (passed via order.nodeHash)
          let nodeHash = order.nodeHash;

          if (!nodeHash) {
            // Fallback: get user's owned nodes and use the first one
            console.warn(
              '[ClassTradingPage] No nodeHash in order - falling back to first owned node',
            );
            const ownedNodes = await getOwnedNodes();
            if (ownedNodes.length === 0) {
              console.error(
                '[ClassTradingPage] No owned nodes found for selling',
              );
              return false;
            }
            nodeHash = ownedNodes[0];
          }

          // Use the effective token ID (from user's inventory for sell orders)
          const tokenId = effectiveTokenId;

          // Check node's deposited balance
          const nodeBalance = await getNodeTokenBalance(nodeHash, tokenId);

          if (nodeBalance < quantity) {
            // Show deposit modal
            let walletBalance = BigInt(0);
            try {
              const { NEXT_PUBLIC_DIAMOND_ADDRESS } = await import(
                '@/chain-constants'
              );
              const { ethers } = await import('ethers');
              if (connectedWallet && address) {
                const ethereumProvider =
                  await connectedWallet.getEthereumProvider();
                const provider = new ethers.BrowserProvider(ethereumProvider);
                const auraAsset = new ethers.Contract(
                  NEXT_PUBLIC_DIAMOND_ADDRESS,
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
            return false;
          }

          // Fetch best bid price for market sell
          const { clobRepository } = await import(
            '@/infrastructure/repositories/clob-repository'
          );
          const orderBookData = await clobRepository.getOrderBook(
            NEXT_PUBLIC_DIAMOND_ADDRESS,
            tokenId,
            10,
          );

          const bestBid = orderBookData.bids[0]?.price;
          let sellPrice: bigint;

          if (bestBid && bestBid > 0) {
            // Use best bid price with 10% slippage (minimum acceptable)
            sellPrice = BigInt(Math.round(bestBid * 0.9 * 1e18));
          } else {
            // No bids - cannot execute market sell
            console.error(
              '[ClassTradingPage] No bids available for market sell',
            );
            return false;
          }

          try {
            const orderId = await placeSellOrderFromNode(
              nodeHash,
              tokenId,
              NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
              sellPrice,
              quantity,
            );
            return true;
          } catch (sellError: any) {
            console.error(
              '[ClassTradingPage] Failed to place market sell order:',
              sellError,
            );
            return false;
          }
        }

        // For BUY LIMIT orders: use CLOB V2 flow with auto-matching
        if (order.type === 'limit') {
          const { clobV2Service } = await import(
            '@/infrastructure/services/clob-v2-service'
          );
          const { TimeInForce } = await import('@/domain/clob/clob');

          const result = await clobV2Service.placeLimitOrder({
            ...clobParams,
            timeInForce: TimeInForce.GTC,
          });

          if (!result.success) {
            console.error(
              '[ClassTradingPage] CLOB order failed:',
              result.error,
            );
            return false;
          }

          return true;
        } else {
          // Market order — IOC limit order via CLOB V2 (auto-matches on submit)
          const { clobV2Service } = await import(
            '@/infrastructure/services/clob-v2-service'
          );

          const result = await clobV2Service.placeMarketOrder({
            baseToken: clobParams.baseToken,
            baseTokenId: clobParams.baseTokenId,
            quoteToken: clobParams.quoteToken,
            amount: clobParams.amount,
            isBuy: clobParams.isBuy,
            maxSlippageBps: 1000, // 10% slippage
          });

          if (!result.success) {
            console.error(
              '[ClassTradingPage] Market order failed:',
              result.error,
            );
            return false;
          }

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
              <div className="h-96 bg-card/60 rounded-xl border border-border/30 animate-pulse" />
            </div>
            <div className="lg:col-span-6">
              <AssetTableSkeleton rows={6} />
            </div>
            <div className="lg:col-span-3">
              <div className="h-96 bg-card/60 rounded-xl border border-border/30 animate-pulse" />
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
        {/* Decorative top accent */}
        <GreekKeyStrip color="gold" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6 mt-4">
          <Link
            href="/customer/trading"
            className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40 hover:text-gold transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Trading
          </Link>
          <span className="text-foreground/20 font-mono">/</span>
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/70 font-bold">
            {className}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase text-foreground">
                {className}
              </h1>
              <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40 mt-1">
                {assets.length} assets • {assetTypes.length} types available
              </p>
            </div>
            <LaurelAccent side="right" />
          </div>
          <div className="flex items-center gap-3">
            <EvaStatusBadge status="active" label="LIVE" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn(
                'p-2',
                'bg-card/60 border border-border/30',
                'hover:border-gold/30 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
              aria-label="Refresh assets"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-foreground/50',
                  (isRefreshing || isLoading) && 'animate-spin',
                )}
              />
            </button>
          </div>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Main content grid - Hyperliquid-style layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left sidebar - Asset Types & Filters */}
          <div className="lg:col-span-3 space-y-6">
            <EvaSectionMarker
              section="ASSETS"
              label="Type Selection"
              variant="gold"
            />

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
              <EvaPanel
                label="Matching Assets"
                sublabel={`${filteredAssets.length} found`}
                sysId="AST-FLT"
                accent="gold"
              >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredAssets.slice(0, 10).map((asset, i) => (
                    <div
                      key={`${asset.name}-${asset.tokenId || i}`}
                      className="flex items-center justify-between p-2 border-b border-border/10"
                    >
                      <span className="font-mono text-sm text-foreground/80">
                        {asset.name}
                      </span>
                      <span className="font-mono text-xs tracking-[0.15em] text-foreground/40">
                        Token #{asset.tokenId || 'N/A'}
                      </span>
                    </div>
                  ))}
                  {filteredAssets.length > 10 && (
                    <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/30 text-center py-2">
                      +{filteredAssets.length - 10} more assets
                    </p>
                  )}
                </div>
              </EvaPanel>
            )}
          </div>

          {/* Center - Price Chart + LiveWaveform */}
          <div className="lg:col-span-6 space-y-6">
            <EvaSectionMarker
              section="MARKET DATA"
              label="Price Analysis"
              variant="crimson"
            />

            {/* Prompt to select asset type */}
            {!selectedAssetType ? (
              <EvaPanel
                label="Market Data"
                sysId="MKT-00"
                status="pending"
                accent="gold"
                className="text-center"
              >
                <div className="py-12">
                  <div
                    className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
                    style={{
                      clipPath:
                        'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: 'hsl(43 65% 62% / 0.08)',
                    }}
                  >
                    <TrendingUp className="w-8 h-8 text-gold/60" />
                  </div>
                  <h3 className="font-serif text-xl tracking-[0.15em] uppercase text-foreground/80 mb-2">
                    Select an Asset Type
                  </h3>
                  <p className="font-mono text-xs tracking-[0.1em] text-foreground/40 max-w-md mx-auto">
                    Choose an asset type from the left panel to view price
                    charts, order book, and trading options.
                  </p>
                </div>
              </EvaPanel>
            ) : (
              <>
                {/* Professional Price Chart */}
                <PriceChart
                  data={chartData}
                  timePeriod={chartPeriod}
                  mode="candlestick"
                  height={500}
                  showVolume={true}
                  assetName={selectedAssetType}
                  currentPrice={basePrice}
                  onTimePeriodChange={handleChartPeriodChange}
                />

                {/* LiveWaveform - Real-time trading data feed */}
                <LiveWaveform
                  height={100}
                  label="Price Activity Feed"
                  sublabel={`TARGET: ${selectedAssetType?.toUpperCase()} / PATTERN BLUE`}
                />
              </>
            )}
          </div>

          {/* Right sidebar - Order Book + Trade Panel (stacked) */}
          <div className="lg:col-span-3">
            <EvaSectionMarker
              section="ORDERS"
              label="Execution"
              variant="crimson"
            />

            <div className="sticky top-20 space-y-6">
              {/* Order Book (compact) */}
              {selectedAssetType && tradeableAsset && (
                <OrderBook
                  assetId={tradeableAsset.id}
                  baseToken={NEXT_PUBLIC_DIAMOND_ADDRESS}
                  baseTokenId={tradeableAsset.tokenId}
                  basePrice={basePrice}
                  maxLevels={5}
                  onPriceClick={handlePriceClick}
                  compact
                />
              )}

              <EvaScanLine variant="gold" />

              {/* Trade Panel */}
              {selectedAssetType && tradeableAsset ? (
                <TradePanel
                  asset={tradeableAsset}
                  initialPrice={clickedOrderBookPrice ?? basePrice}
                  initialSide={clickedOrderBookSide}
                  bestAskPrice={bestAskPrice}
                  bestBidPrice={bestBidPrice}
                  sellableAssets={sellableAssets}
                  onPlaceOrder={handlePlaceOrder}
                />
              ) : (
                <EvaPanel
                  label="Trade"
                  sysId="TRD-00"
                  status="offline"
                  accent="crimson"
                  className="text-center"
                >
                  <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/30 py-8">
                    Select an asset type to place an order
                  </p>
                </EvaPanel>
              )}
            </div>
          </div>
        </div>

        {/* Bottom decorative accent */}
        <div className="mt-8">
          <GreekKeyStrip color="gold" />
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
