'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useTrade } from '@/app/providers/trade.provider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { PriceChange } from '@/app/components/ui/price-change';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { OrderBook } from '@/app/components/trading/order-book';
import { TradePanel, OrderData } from '@/app/components/trading/trade-panel';
import type {
  PlaceLimitOrderParams,
  CLOBTrade,
  OrderBookData,
  MarketStats,
} from '@/infrastructure/repositories/clob-repository';
import { clobRepository } from '@/infrastructure/repositories/clob-repository';
import {
  priceHistoryService,
  type TimePeriod as PriceTimePeriod,
} from '@/infrastructure/services/price-history-service';
import { ArrowLeft, Share2, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { TokenizedAssetAttribute } from '@/domain/node';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';
import dynamic from 'next/dynamic';
import { useUserAssets } from '@/hooks/useUserAssets';

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import('./chart'), { ssr: false });

// Auto-refresh interval in milliseconds
const REFRESH_INTERVAL = 15000; // 15 seconds

/**
 * Time period options for the chart
 */
const TIME_PERIODS = [
  { label: '1H', value: '1h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '1Y', value: '1y' },
] as const;

type TimePeriod = (typeof TIME_PERIODS)[number]['value'];

/**
 * Props for the page
 */
interface PageProps {
  params: {
    id: string;
  };
}

/**
 * Format trade for display
 */
interface DisplayTrade {
  id: string;
  time: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
}

/**
 * Convert CLOB trades to display format
 */
const formatTradesForDisplay = (trades: CLOBTrade[]): DisplayTrade[] => {
  return trades.map((trade) => ({
    id: trade.id,
    time: new Date(trade.timestamp).toLocaleTimeString(),
    side: 'buy' as const, // Trades don't have side info directly, could be inferred
    price: trade.price,
    quantity: trade.amount,
  }));
};

/**
 * Convert OHLCV candles to chart format
 */
const candlesToChartData = (
  candles: { time: number; close: number }[],
  period: TimePeriod,
) => {
  if (candles.length === 0) {
    return { dates: [], prices: [] };
  }

  const dates = candles.map((c) => {
    const date = new Date(c.time * 1000);
    return date.toLocaleDateString('en-US', {
      month: period === '1y' ? 'short' : undefined,
      day: period !== '1y' ? 'numeric' : undefined,
      hour: period === '1h' || period === '1d' ? 'numeric' : undefined,
      minute: period === '1h' ? 'numeric' : undefined,
    });
  });

  const prices = candles.map((c) => c.close);

  return { dates, prices };
};

/**
 * RecentTrades - List of recent trade executions
 */
interface RecentTradesProps {
  trades: DisplayTrade[];
  isLoading?: boolean;
}

const RecentTrades: FC<RecentTradesProps> = ({ trades, isLoading }) => (
  <GlassCard padding={false}>
    <div className="p-4 border-b border-glass-border">
      <h3 className="text-lg font-semibold text-foreground">Recent Trades</h3>
    </div>
    <div className="divide-y divide-glass-border max-h-64 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm">No trades yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Be the first to trade this asset
          </p>
        </div>
      ) : (
        trades.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between px-4 py-2 text-sm"
          >
            <span className="text-muted-foreground font-mono text-xs">
              {trade.time}
            </span>
            <span
              className={cn(
                'font-mono',
                trade.side === 'buy' ? 'text-trading-buy' : 'text-trading-sell',
              )}
            >
              ${trade.price.toFixed(2)}
            </span>
            <span className="text-foreground font-mono">{trade.quantity}</span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded',
                trade.side === 'buy'
                  ? 'bg-trading-buy/10 text-trading-buy'
                  : 'bg-trading-sell/10 text-trading-sell',
              )}
            >
              {trade.side.toUpperCase()}
            </span>
          </div>
        ))
      )}
    </div>
  </GlassCard>
);

/**
 * TradingPoolPage - Asset detail page with trading interface
 */
const TradingPoolPage: FC<PageProps> = ({ params }) => {
  const router = useRouter();
  const { assets } = useTrade();
  const { getAssetAttributes } = useSelectedNode();

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');
  const [assetAttributes, setAssetAttributes] = useState<
    TokenizedAssetAttribute[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real data state
  const [recentTrades, setRecentTrades] = useState<DisplayTrade[]>([]);
  const [priceHistory, setPriceHistory] = useState<{
    dates: string[];
    prices: number[];
  }>({ dates: [], prices: [] });
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  // Ref for auto-refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const asset = assets.find((a) => a.id === params.id);
  const basePrice =
    marketStats?.lastPrice || (asset ? parseFloat(asset.price) : 100);

  // Fetch user's owned assets for selling (filtered by asset class)
  const { sellableAssets } = useUserAssets(asset?.class);

  // Get token ID from asset
  // The asset.id IS the tokenId (set in node-repository.ts: id: na.tokenId)
  const getTokenId = useCallback(() => {
    if (!asset) return '0';
    // asset.id is the tokenId from the indexer
    return asset.id || '0';
  }, [asset]);

  // Fetch real trading data
  const fetchTradingData = useCallback(async () => {
    if (!asset) return;

    const tokenId = getTokenId();

    try {
      // Fetch trades
      const trades = await clobRepository.getTrades(
        NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        tokenId,
        20,
      );
      setRecentTrades(formatTradesForDisplay(trades));

      // Fetch market stats
      const stats = await clobRepository.getMarketStats(
        NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        tokenId,
      );
      setMarketStats(stats);
    } catch (error) {
      console.error('[TradingPage] Error fetching trading data:', error);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [asset, getTokenId]);

  // Fetch price history for chart
  const fetchPriceHistory = useCallback(async () => {
    if (!asset) return;

    const tokenId = getTokenId();
    setIsLoadingChart(true);

    try {
      const candles = await priceHistoryService.getCandlestickData(
        NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        tokenId,
        selectedPeriod as PriceTimePeriod,
      );

      const chartData = candlesToChartData(candles, selectedPeriod);
      setPriceHistory(chartData);
    } catch (error) {
      console.error('[TradingPage] Error fetching price history:', error);
      setPriceHistory({ dates: [], prices: [] });
    } finally {
      setIsLoadingChart(false);
    }
  }, [asset, getTokenId, selectedPeriod]);

  // Initial data fetch
  useEffect(() => {
    fetchTradingData();
    fetchPriceHistory();
  }, [fetchTradingData, fetchPriceHistory]);

  // Auto-refresh trading data
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchTradingData();
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchTradingData]);

  // Fetch asset attributes
  useEffect(() => {
    const fetchAssetAttributes = async () => {
      if (asset) {
        const attributes = await getAssetAttributes(asset.id);
        setAssetAttributes(attributes);
      }
    };
    fetchAssetAttributes();
  }, [asset?.id, getAssetAttributes, asset]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTradingData(), fetchPriceHistory()]);
    setIsRefreshing(false);
  }, [fetchTradingData, fetchPriceHistory]);

  // Handle period change
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
  }, []);

  // Handle price click from order book
  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    console.log(`Clicked ${side} at ${price}`);
  }, []);

  // Handle order placement - connects TradePanel to CLOB with OrderBridge
  const handlePlaceOrder = useCallback(
    async (order: OrderData): Promise<boolean> => {
      console.log('[TradingPage] Placing order via CLOB + OrderBridge:', order);

      if (!asset) {
        console.error('[TradingPage] No asset selected for order');
        return false;
      }

      try {
        // Import the order bridge service dynamically
        const { orderBridgeService } = await import(
          '@/infrastructure/services/order-bridge-service'
        );

        // Convert price to proper format (wei)
        // Price in wei = price * 10^18
        const priceInWei = BigInt(Math.round(order.price * 1e18));
        const quantity = BigInt(order.quantity);

        // Build CLOB order params
        const { NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS } = await import(
          '@/chain-constants'
        );
        // asset.id IS the tokenId from the indexer
        const tokenId = asset.id || '0';
        const clobParams: PlaceLimitOrderParams = {
          baseToken: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
          baseTokenId: tokenId,
          quoteToken: NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
          price: priceInWei,
          amount: quantity,
          isBuy: order.side === 'buy',
        };

        console.log('[TradingPage] Placing CLOB order:', clobParams);

        // Place order on CLOB
        if (order.type === 'limit') {
          const result = await orderBridgeService.placeLimitOrderAndBridge(
            clobParams,
            false, // Don't bridge immediately - wait for match
          );

          if (!result.success) {
            console.error('[TradingPage] CLOB order failed:', result.error);
            return false;
          }

          console.log(
            '[TradingPage] CLOB order placed:',
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
            console.error('[TradingPage] Market order failed:', result.error);
            return false;
          }

          console.log('[TradingPage] Market order executed:', result.orderId);
          return true;
        }
      } catch (error) {
        console.error('[TradingPage] Error placing order:', error);
        return false;
      }
    },
    [asset],
  );

  if (!asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <GlassCard className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Asset Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The asset you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/customer/trading">
            <GlowButton variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trading
            </GlowButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6 overflow-x-auto whitespace-nowrap">
          <Link
            href="/customer/trading"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Trading
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-muted-foreground">
            {asset.nodeLocation.addressName}
          </span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium">{asset.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/trading"
              className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-lg font-bold text-accent">
                  {asset.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-display font-bold text-foreground">
                    {asset.name}
                  </h1>
                  <StatusBadge status="live" size="sm" />
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {asset.class}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-muted-foreground',
                  isRefreshing && 'animate-spin',
                )}
              />
            </button>
            <button className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <Link href={`/customer/trading/${params.id}/order`}>
              <GlowButton variant="primary">Place Order</GlowButton>
            </Link>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left side - Chart and Order book */}
          <div className="lg:col-span-8 space-y-6">
            {/* Price and chart */}
            <GlassCard>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="text-3xl font-display font-bold text-foreground mb-1">
                    ${formatTokenAmount(basePrice.toString(), 0, 2)}
                  </div>
                  <PriceChange value={marketStats?.change24h || 0} showIcon />
                </div>

                {/* Time period tabs */}
                <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay">
                  {TIME_PERIODS.map((period) => (
                    <button
                      key={period.value}
                      onClick={() => handlePeriodChange(period.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                        selectedPeriod === period.value
                          ? 'bg-accent/20 text-accent'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-[300px] md:h-[400px]">
                {isLoadingChart ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : priceHistory.dates.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground">
                      No price data available
                    </p>
                    <p className="text-muted-foreground/60 text-sm mt-1">
                      Price history will appear after trades occur
                    </p>
                  </div>
                ) : (
                  <Chart priceData={priceHistory} timeRange={selectedPeriod} />
                )}
              </div>
            </GlassCard>

            {/* Order book and Recent trades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OrderBook
                assetId={asset.id}
                baseToken={NEXT_PUBLIC_AURA_GOAT_ADDRESS}
                baseTokenId={getTokenId()}
                basePrice={basePrice}
                maxLevels={8}
                onPriceClick={handlePriceClick}
              />
              <RecentTrades trades={recentTrades} isLoading={isLoadingTrades} />
            </div>
          </div>

          {/* Right side - Trade panel and Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Trade panel */}
            <TradePanel
              asset={asset}
              initialPrice={basePrice}
              sellableAssets={sellableAssets}
              onPlaceOrder={handlePlaceOrder}
            />

            {/* Asset stats */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Asset Details</GlassCardTitle>
              </GlassCardHeader>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Available Quantity
                  </span>
                  <span className="font-mono text-foreground">
                    {parseInt(asset.capacity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Value
                  </span>
                  <span className="font-mono text-foreground">
                    ${asset.totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Asset Class
                  </span>
                  <span className="capitalize text-foreground">
                    {asset.class}
                  </span>
                </div>

                <div className="pt-4 border-t border-glass-border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Node Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Name
                      </span>
                      <p className="text-sm text-foreground">
                        {asset.nodeLocation.addressName}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Address
                      </span>
                      <p className="text-xs font-mono text-muted-foreground bg-surface-overlay p-2 rounded-lg break-all">
                        {asset.nodeAddress}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Asset Attributes */}
                {assetAttributes.length > 0 && (
                  <div className="pt-4 border-t border-glass-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Attributes
                    </h4>
                    <div className="space-y-2">
                      {assetAttributes.map((attribute, index) => (
                        <div key={index}>
                          <span className="text-xs text-muted-foreground">
                            {attribute.name}
                          </span>
                          <p className="text-sm text-foreground">
                            {attribute.value}
                          </p>
                          {attribute.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {attribute.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingPoolPage;
