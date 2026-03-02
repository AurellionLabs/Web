'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useTrade } from '@/app/providers/trade.provider';
import { PriceChange } from '@/app/components/ui/price-change';
import { OrderBook } from '@/app/components/trading/order-book';
import { TradePanel, OrderData } from '@/app/components/trading/trade-panel';
import { DepositForTradingModal } from '@/app/components/trading/deposit-for-trading-modal';
import { UserOrders } from '@/app/components/trading/user-orders';
import { CircuitBreakerIndicator } from '@/app/components/trading/circuit-breaker-indicator';
import { MEVProtectionIndicator } from '@/app/components/trading/mev-protection-indicator';

// EVA Components
import {
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';

import type {
  CLOBTrade,
  OrderBookData,
  MarketStats,
} from '@/infrastructure/repositories/clob-repository';
import { clobRepository } from '@/infrastructure/repositories/clob-repository';
import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { clobV2Service } from '@/infrastructure/services/clob-v2-service';
import {
  CircuitBreaker,
  TimeInForce,
  type PlaceLimitOrderParams,
  type PlaceMarketOrderParams,
} from '@/domain/clob/clob';
import { calculateMarketId } from '@/hooks/useCLOBV2';
import {
  priceHistoryService,
  type TimePeriod as PriceTimePeriod,
} from '@/infrastructure/services/price-history-service';
import { ArrowLeft, Share2, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { useWallet } from '@/hooks/useWallet';
import { TokenizedAssetAttribute } from '@/domain/node';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '@/chain-constants';
import dynamic from 'next/dynamic';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useOrderBook } from '@/hooks/useOrderBook';

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
  <EvaPanel label="Recent Trades" sysId="TRD-LOG" accent="crimson" noPadding>
    <div className="divide-y divide-border/10 max-h-64 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
            No trades yet
          </p>
          <p className="font-mono text-[10px] tracking-[0.1em] text-foreground/25 mt-1">
            Be the first to trade this asset
          </p>
        </div>
      ) : (
        trades.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between px-4 py-2 text-sm"
          >
            <span className="text-foreground/40 font-mono text-xs">
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
                'font-mono text-[11px] tracking-[0.15em] uppercase font-bold px-2 py-0.5',
                trade.side === 'buy'
                  ? 'bg-trading-buy/10 text-trading-buy'
                  : 'bg-trading-sell/10 text-trading-sell',
              )}
              style={{
                clipPath:
                  'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              }}
            >
              {trade.side.toUpperCase()}
            </span>
          </div>
        ))
      )}
    </div>
  </EvaPanel>
);

/**
 * TradingPoolPage - Asset detail page with trading interface
 */
const TradingPoolPage: FC<PageProps> = ({ params }) => {
  const router = useRouter();
  const { assets } = useTrade();
  const { getAssetAttributes } = useSelectedNode();
  const { getOwnedNodes, placeSellOrderFromNode, getNodeTokenBalance } =
    useDiamond();
  const { address, connectedWallet } = useWallet();

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');
  const [assetAttributes, setAssetAttributes] = useState<
    TokenizedAssetAttribute[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Real data state
  const [recentTrades, setRecentTrades] = useState<DisplayTrade[]>([]);
  const [priceHistory, setPriceHistory] = useState<{
    dates: string[];
    prices: number[];
  }>({ dates: [], prices: [] });
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  // Circuit breaker + MEV protection state
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreaker | null>(
    null,
  );
  const [mevMinRevealDelay, setMevMinRevealDelay] = useState<number | null>(
    null,
  );
  const [requiresCommitReveal, setRequiresCommitReveal] = useState<
    boolean | null
  >(null);

  // Ref for auto-refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const asset = assets.find((a) => a.id === params.id);
  const basePrice =
    marketStats?.lastPrice || (asset ? parseFloat(asset.price) : 100);

  // Fetch user's owned assets for selling (filtered by asset class)
  // This automatically fetches from ALL nodes owned by the connected wallet
  const { sellableAssets } = useUserAssets(asset?.class);

  // Fetch order book data for best bid/ask prices
  const { orderBook } = useOrderBook(asset?.id || '', {
    baseToken: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
    baseTokenId: asset?.id || '0',
    basePrice,
    levels: 10,
    updateInterval: 5000,
  });

  // Get best bid and ask prices from order book
  const bestAskPrice = orderBook?.asks[0]?.price || 0;
  const bestBidPrice = orderBook?.bids[0]?.price || 0;

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
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        tokenId,
        20,
      );
      setRecentTrades(formatTradesForDisplay(trades));

      // Fetch market stats
      const stats = await clobRepository.getMarketStats(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
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
        NEXT_PUBLIC_DIAMOND_ADDRESS,
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

  // Fetch circuit breaker + MEV config (slower refresh, not critical path)
  const fetchMarketProtection = useCallback(async () => {
    if (!asset) return;
    try {
      const marketId = calculateMarketId(
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        asset.id || '0',
        NEXT_PUBLIC_AURA_ASSET_ADDRESS,
      );
      const [cb, mevCfg] = await Promise.all([
        clobV2Repository.getCircuitBreaker(marketId),
        clobV2Service.getMEVConfig(),
      ]);
      if (cb) setCircuitBreaker(cb);
      setMevMinRevealDelay(mevCfg.minRevealDelay);
      // Treat commit-reveal as required when minRevealDelay > 0 (protection is configured)
      setRequiresCommitReveal(mevCfg.minRevealDelay > 0);
    } catch {
      // Non-critical — silently ignore
    }
  }, [asset]);

  // Initial data fetch
  useEffect(() => {
    fetchTradingData();
    fetchPriceHistory();
    fetchMarketProtection();
  }, [fetchTradingData, fetchPriceHistory, fetchMarketProtection]);

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
  const handlePriceClick = useCallback(
    (price: number, side: 'bid' | 'ask') => {},
    [],
  );

  // Handle order placement - connects TradePanel to CLOB with OrderBridge
  const handlePlaceOrder = useCallback(
    async (order: OrderData): Promise<boolean> => {
      if (!asset) {
        console.error('[TradingPage] No asset selected for order');
        return false;
      }

      try {
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
          baseToken: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
          baseTokenId: tokenId,
          quoteToken: NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
          price: priceInWei,
          amount: quantity,
          isBuy: order.side === 'buy',
          timeInForce: TimeInForce.GTC,
        };

        // For LIMIT SELL orders: use Diamond's placeSellOrderFromNode
        // This transfers tokens directly from Diamond to CLOB without going through user's wallet
        if (order.side === 'sell' && order.type === 'limit') {
          // Get user's owned nodes
          const ownedNodes = await getOwnedNodes();
          if (ownedNodes.length === 0) {
            console.error('[TradingPage] No owned nodes found for selling');
            return false;
          }

          // Use the first owned node
          const nodeHash = ownedNodes[0];

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
              console.error('[TradingPage] Error getting wallet balance:', err);
            }

            // Set pending order and show modal
            setPendingSellOrder({
              tokenId,
              tokenName: asset?.name || 'Asset',
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
              clobParams.quoteToken,
              priceInWei,
              quantity,
            );
            return true;
          } catch (sellError: any) {
            console.error(
              '[TradingPage] Failed to place sell order from node:',
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
                    '[TradingPage] Error getting node balance:',
                    nodeErr,
                  );
                }
              } catch (err) {
                console.error(
                  '[TradingPage] Error getting wallet balance:',
                  err,
                );
              }

              setPendingSellOrder({
                tokenId,
                tokenName: asset?.name || 'Asset',
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

        // For MARKET SELL orders: use placeSellOrderFromNode with best bid price
        if (order.side === 'sell' && order.type === 'market') {
          // Get user's owned nodes
          const ownedNodes = await getOwnedNodes();
          if (ownedNodes.length === 0) {
            console.error('[TradingPage] No owned nodes found for selling');
            return false;
          }

          const nodeHash = ownedNodes[0];

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
              console.error('[TradingPage] Error getting wallet balance:', err);
            }
            setPendingSellOrder({
              tokenId,
              tokenName: asset?.name || 'Asset',
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
            console.error('[TradingPage] No bids available for market sell');
            return false;
          }

          try {
            const orderId = await placeSellOrderFromNode(
              nodeHash,
              tokenId,
              clobParams.quoteToken,
              sellPrice,
              quantity,
            );
            return true;
          } catch (sellError: any) {
            console.error(
              '[TradingPage] Failed to place market sell order:',
              sellError,
            );
            return false;
          }
        }

        // For BUY LIMIT orders: use CLOB V2 flow with auto-matching
        if (order.type === 'limit') {
          const result = await clobV2Service.placeLimitOrder(clobParams);

          if (!result.success) {
            console.error(
              '[TradingPage] CLOB V2 limit order failed:',
              result.error,
            );
            return false;
          }

          return true;
        } else {
          // Market order — IOC limit order via CLOB V2 (auto-matches on submit)
          const marketParams: PlaceMarketOrderParams = {
            baseToken: clobParams.baseToken,
            baseTokenId: clobParams.baseTokenId,
            quoteToken: clobParams.quoteToken,
            amount: clobParams.amount,
            isBuy: clobParams.isBuy,
            maxSlippageBps: 1000, // 10% slippage
          };
          const result = await clobV2Service.placeMarketOrder(marketParams);

          if (!result.success) {
            console.error(
              '[TradingPage] CLOB V2 market order failed:',
              result.error,
            );
            return false;
          }

          return true;
        }
      } catch (error) {
        console.error('[TradingPage] Error placing order:', error);
        return false;
      }
    },
    [
      asset,
      getOwnedNodes,
      placeSellOrderFromNode,
      getNodeTokenBalance,
      connectedWallet,
      address,
    ],
  );

  if (!asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <EvaPanel
          label="Asset Not Found"
          sysId="ERR-404"
          status="offline"
          accent="crimson"
          className="text-center max-w-md"
        >
          <div className="py-6">
            <h1 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-foreground mb-4">
              Asset Not Found
            </h1>
            <p className="font-mono text-xs tracking-[0.1em] text-foreground/40 mb-6">
              The asset you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link href="/customer/trading">
              <TrapButton variant="gold">
                <span className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Trading
                </span>
              </TrapButton>
            </Link>
          </div>
        </EvaPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Decorative top accent */}
        <GreekKeyStrip color="gold" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6 mt-4 overflow-x-auto whitespace-nowrap">
          <Link
            href="/customer/trading"
            className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40 hover:text-gold transition-colors"
          >
            Trading
          </Link>
          <span className="text-foreground/20 font-mono">/</span>
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
            {asset.nodeLocation.addressName}
          </span>
          <span className="text-foreground/20 font-mono">/</span>
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/70 font-bold">
            {asset.name}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/trading"
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <ArrowLeft className="w-5 h-5 text-foreground/50" />
            </Link>
            <div className="flex items-center gap-4">
              <LaurelAccent side="left" />
              <div
                className="w-12 h-12 flex items-center justify-center"
                style={{
                  clipPath:
                    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  background: 'hsl(43 65% 62% / 0.08)',
                }}
              >
                <span className="font-mono text-lg font-bold text-gold">
                  {asset.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                    {asset.name}
                  </h1>
                  <EvaStatusBadge status="active" label="LIVE" />
                  <CircuitBreakerIndicator
                    circuitBreaker={circuitBreaker}
                    compact
                  />
                  <MEVProtectionIndicator
                    requiresCommitReveal={requiresCommitReveal}
                    minRevealDelay={mevMinRevealDelay ?? undefined}
                    compact
                  />
                </div>
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                  {asset.class}
                </p>
              </div>
              <LaurelAccent side="right" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-foreground/50',
                  isRefreshing && 'animate-spin',
                )}
              />
            </button>
            <button
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <Share2 className="w-4 h-4 text-foreground/50" />
            </button>
            <Link href={`/customer/trading/${params.id}/order`}>
              <TrapButton variant="gold">Place Order</TrapButton>
            </Link>
          </div>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left side - Chart and Order book */}
          <div className="lg:col-span-8 space-y-6">
            <EvaSectionMarker
              section="Market Data"
              label="Price Analysis"
              variant="crimson"
            />

            {/* Price and chart */}
            <EvaPanel
              label={asset.name}
              sublabel="Price Chart"
              sysId="CHT-01"
              status="active"
              accent="gold"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="font-mono text-3xl font-bold text-gold tabular-nums mb-1">
                    ${formatTokenAmount(basePrice.toString(), 0, 2)}
                  </div>
                  <PriceChange value={marketStats?.change24h || 0} showIcon />
                </div>

                {/* Time period tabs */}
                <div
                  className="flex gap-1 p-1 bg-background/60 border border-border/20"
                  style={{
                    clipPath:
                      'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
                  }}
                >
                  {TIME_PERIODS.map((period) => (
                    <button
                      key={period.value}
                      onClick={() => handlePeriodChange(period.value)}
                      className={cn(
                        'px-3 py-1.5 font-mono text-xs tracking-[0.12em] uppercase font-bold transition-all duration-200',
                        selectedPeriod === period.value
                          ? 'bg-gold/15 text-gold'
                          : 'text-foreground/35 hover:text-foreground/60',
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
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                  </div>
                ) : priceHistory.dates.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                      No price data available
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.1em] text-foreground/25 mt-1">
                      Price history will appear after trades occur
                    </p>
                  </div>
                ) : (
                  <Chart priceData={priceHistory} timeRange={selectedPeriod} />
                )}
              </div>
            </EvaPanel>

            <EvaScanLine variant="gold" />

            {/* Order book and Recent trades */}
            <EvaSectionMarker
              section="Order Flow"
              label="Book & Trades"
              variant="gold"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OrderBook
                assetId={asset.id}
                baseToken={NEXT_PUBLIC_DIAMOND_ADDRESS}
                baseTokenId={getTokenId()}
                basePrice={basePrice}
                maxLevels={8}
                onPriceClick={handlePriceClick}
              />
              <RecentTrades trades={recentTrades} isLoading={isLoadingTrades} />
            </div>

            <EvaScanLine variant="crimson" />

            {/* User's Orders Section */}
            <EvaSectionMarker
              section="Your Orders"
              label="Active & History"
              variant="crimson"
            />
            <UserOrders
              baseToken={NEXT_PUBLIC_DIAMOND_ADDRESS}
              baseTokenId={getTokenId()}
              maxOrders={20}
              refreshInterval={REFRESH_INTERVAL}
            />
          </div>

          {/* Right side - Trade panel and Stats */}
          <div className="lg:col-span-4 space-y-6">
            <EvaSectionMarker
              section="Execute"
              label="Trade Panel"
              variant="crimson"
            />

            {/* Trade panel */}
            <TradePanel
              asset={asset}
              initialPrice={basePrice}
              bestAskPrice={bestAskPrice}
              bestBidPrice={bestBidPrice}
              sellableAssets={sellableAssets}
              onPlaceOrder={handlePlaceOrder}
            />

            <EvaScanLine variant="mixed" />

            {/* Asset stats */}
            <EvaPanel
              label="Asset Details"
              sysId="AST-DTL"
              status="active"
              accent="gold"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/10">
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                    Available Quantity
                  </span>
                  <span className="font-mono text-sm font-bold text-gold tabular-nums">
                    {parseInt(asset.capacity)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/10">
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                    Total Value
                  </span>
                  <span className="font-mono text-sm font-bold text-gold tabular-nums">
                    ${asset.totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/10">
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
                    Asset Class
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground/70 uppercase tracking-[0.1em]">
                    {asset.class}
                  </span>
                </div>

                <EvaScanLine variant="gold" />

                <div>
                  <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40 font-bold mb-3">
                    Node Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/30">
                        Name
                      </span>
                      <p className="font-mono text-sm text-foreground/70">
                        {asset.nodeLocation.addressName}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/30">
                        Address
                      </span>
                      <p
                        className="font-mono text-[11px] text-foreground/40 bg-background/60 p-2 break-all border border-border/15"
                        style={{
                          clipPath:
                            'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                        }}
                      >
                        {asset.nodeAddress}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Asset Attributes */}
                {assetAttributes.length > 0 && (
                  <>
                    <EvaScanLine variant="crimson" />
                    <div>
                      <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40 font-bold mb-3">
                        Attributes
                      </h4>
                      <div className="space-y-3">
                        {assetAttributes.map((attribute, index) => (
                          <div
                            key={index}
                            className="py-1 border-b border-border/10"
                          >
                            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/30">
                              {attribute.name}
                            </span>
                            <p className="font-mono text-sm text-foreground/70">
                              {attribute.value}
                            </p>
                            {attribute.description && (
                              <p className="font-mono text-[10px] text-foreground/25 mt-0.5">
                                {attribute.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </EvaPanel>
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
                  '[TradingPage] Failed to place order after deposit:',
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
};

export default TradingPoolPage;
