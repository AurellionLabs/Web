'use client';

import { FC, useEffect, useState, useCallback } from 'react';
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
import { TradePanel } from '@/app/components/trading/trade-panel';
import {
  ArrowLeft,
  Share2,
  RefreshCw,
  ExternalLink,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { TokenizedAssetAttribute } from '@/domain/node';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import('./chart'), { ssr: false });

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
 * Generate mock recent trades
 */
const generateMockTrades = (basePrice: number) => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `trade-${i}`,
    time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    price: basePrice * (1 + (Math.random() - 0.5) * 0.02),
    quantity: Math.floor(Math.random() * 10) + 1,
  }));
};

/**
 * Generate mock price history for chart
 */
const generatePriceHistory = (basePrice: number, period: TimePeriod) => {
  let points = 24;
  switch (period) {
    case '1h':
      points = 12;
      break;
    case '1d':
      points = 24;
      break;
    case '1w':
      points = 7;
      break;
    case '1m':
      points = 30;
      break;
    case '1y':
      points = 12;
      break;
  }

  const dates = Array.from({ length: points }, (_, i) => {
    const date = new Date();
    if (period === '1h')
      date.setMinutes(date.getMinutes() - (points - 1 - i) * 5);
    else if (period === '1d') date.setHours(date.getHours() - (points - 1 - i));
    else if (period === '1w') date.setDate(date.getDate() - (points - 1 - i));
    else if (period === '1m') date.setDate(date.getDate() - (points - 1 - i));
    else date.setMonth(date.getMonth() - (points - 1 - i));

    return date.toLocaleDateString('en-US', {
      month: period === '1y' ? 'short' : undefined,
      day: period !== '1y' ? 'numeric' : undefined,
      hour: period === '1h' || period === '1d' ? 'numeric' : undefined,
      minute: period === '1h' ? 'numeric' : undefined,
    });
  });

  const prices = Array.from({ length: points }, () => {
    const variation = (Math.random() - 0.5) * 0.1;
    return basePrice * (1 + variation);
  });

  return { dates, prices };
};

/**
 * RecentTrades - List of recent trade executions
 */
interface RecentTradesProps {
  trades: ReturnType<typeof generateMockTrades>;
}

const RecentTrades: FC<RecentTradesProps> = ({ trades }) => (
  <GlassCard padding={false}>
    <div className="p-4 border-b border-glass-border">
      <h3 className="text-lg font-semibold text-foreground">Recent Trades</h3>
    </div>
    <div className="divide-y divide-glass-border max-h-64 overflow-y-auto">
      {trades.map((trade) => (
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
      ))}
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

  const asset = assets.find((a) => a.id === params.id);
  const basePrice = asset ? parseFloat(asset.price) : 100;
  const priceHistory = generatePriceHistory(basePrice, selectedPeriod);
  const recentTrades = generateMockTrades(basePrice);

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

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  // Handle price click from order book
  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    console.log(`Clicked ${side} at ${price}`);
  }, []);

  // Handle order placement
  const handlePlaceOrder = useCallback(async (order: any) => {
    console.log('Placing order:', order);
    return true;
  }, []);

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
                    ${formatTokenAmount(asset.price, 0, 2)}
                  </div>
                  <PriceChange value={(Math.random() - 0.3) * 10} showIcon />
                </div>

                {/* Time period tabs */}
                <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay">
                  {TIME_PERIODS.map((period) => (
                    <button
                      key={period.value}
                      onClick={() => setSelectedPeriod(period.value)}
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
                <Chart priceData={priceHistory} timeRange={selectedPeriod} />
              </div>
            </GlassCard>

            {/* Order book and Recent trades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OrderBook
                assetId={asset.id}
                basePrice={basePrice}
                maxLevels={8}
                onPriceClick={handlePriceClick}
              />
              <RecentTrades trades={recentTrades} />
            </div>
          </div>

          {/* Right side - Trade panel and Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Trade panel */}
            <TradePanel
              asset={asset}
              initialPrice={basePrice}
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
