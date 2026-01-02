'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard, GlassCardHeader, GlassCardTitle } from '../ui/glass-card';
import { useOrderBook, OrderLevel } from '@/hooks/useOrderBook';

/**
 * Props for the OrderBook component
 */
export interface OrderBookProps {
  /** Asset ID to display order book for */
  assetId: string;
  /** Base price for the asset */
  basePrice?: number;
  /** Maximum levels to display per side */
  maxLevels?: number;
  /** Callback when a price is clicked */
  onPriceClick?: (price: number, side: 'bid' | 'ask') => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * OrderBookRow - Individual row in the order book
 */
interface OrderBookRowProps {
  level: OrderLevel;
  side: 'bid' | 'ask';
  maxDepth: number;
  onClick?: () => void;
}

const OrderBookRow: React.FC<OrderBookRowProps> = ({
  level,
  side,
  maxDepth,
  onClick,
}) => {
  const depthWidth = maxDepth > 0 ? (level.total / maxDepth) * 100 : 0;

  const isBid = side === 'bid';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full grid grid-cols-3 gap-2 px-3 py-1.5 text-sm font-mono tabular-nums',
        'hover:bg-white/5 transition-colors cursor-pointer',
        'focus:outline-none focus:ring-1 focus:ring-accent/50',
      )}
    >
      {/* Depth bar background */}
      <div
        className={cn(
          'absolute inset-y-0 h-full opacity-20',
          isBid ? 'right-0 bg-trading-buy' : 'left-0 bg-trading-sell',
        )}
        style={{
          width: `${depthWidth}%`,
          [isBid ? 'right' : 'left']: 0,
        }}
      />

      {/* Price */}
      <span
        className={cn(
          'relative z-10',
          isBid ? 'text-trading-buy text-left' : 'text-trading-sell text-left',
        )}
      >
        {level.price.toFixed(2)}
      </span>

      {/* Quantity */}
      <span className="relative z-10 text-foreground text-center">
        {level.quantity.toFixed(2)}
      </span>

      {/* Total */}
      <span className="relative z-10 text-muted-foreground text-right">
        {level.total.toFixed(2)}
      </span>
    </button>
  );
};

/**
 * SpreadIndicator - Shows the spread between best bid and ask
 */
interface SpreadIndicatorProps {
  spread: number;
  spreadPercent: number;
  midPrice: number;
}

const SpreadIndicator: React.FC<SpreadIndicatorProps> = ({
  spread,
  spreadPercent,
  midPrice,
}) => (
  <div className="flex items-center justify-between px-3 py-2 bg-surface-overlay/50 border-y border-glass-border">
    <span className="text-xs text-muted-foreground">Spread</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono tabular-nums text-foreground">
        ${spread.toFixed(4)}
      </span>
      <span className="text-xs font-mono tabular-nums text-muted-foreground">
        ({spreadPercent.toFixed(3)}%)
      </span>
    </div>
  </div>
);

/**
 * OrderBook - Displays bid/ask levels with depth visualization
 *
 * Features:
 * - Real-time bid/ask visualization
 * - Depth bars showing cumulative volume
 * - Spread indicator
 * - Click-to-fill price functionality
 * - Color-coded buy/sell sides
 *
 * @example
 * ```tsx
 * <OrderBook
 *   assetId="asset-123"
 *   basePrice={100}
 *   maxLevels={10}
 *   onPriceClick={(price, side) => console.log(`Clicked ${side} at ${price}`)}
 * />
 * ```
 */
export const OrderBook: React.FC<OrderBookProps> = ({
  assetId,
  basePrice = 100,
  maxLevels = 10,
  onPriceClick,
  className,
}) => {
  const { orderBook, isLoading } = useOrderBook(assetId, {
    levels: maxLevels,
    basePrice,
  });

  // Calculate max depth for scaling
  const maxDepth = useMemo(() => {
    if (!orderBook) return 0;
    const maxBid = orderBook.bids[orderBook.bids.length - 1]?.total || 0;
    const maxAsk = orderBook.asks[orderBook.asks.length - 1]?.total || 0;
    return Math.max(maxBid, maxAsk);
  }, [orderBook]);

  if (isLoading || !orderBook) {
    return (
      <GlassCard className={cn('h-full', className)}>
        <GlassCardHeader>
          <GlassCardTitle>Order Book</GlassCardTitle>
        </GlassCardHeader>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      padding={false}
      className={cn('h-full flex flex-col', className)}
    >
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Order Book</h3>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            Mid: ${orderBook.midPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-glass-border">
        <span className="text-left">Price</span>
        <span className="text-center">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (sell orders) - reversed so lowest ask is at bottom */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col-reverse">
          {orderBook.asks.map((level, index) => (
            <OrderBookRow
              key={`ask-${index}`}
              level={level}
              side="ask"
              maxDepth={maxDepth}
              onClick={() => onPriceClick?.(level.price, 'ask')}
            />
          ))}
        </div>
      </div>

      {/* Spread indicator */}
      <SpreadIndicator
        spread={orderBook.spread}
        spreadPercent={orderBook.spreadPercent}
        midPrice={orderBook.midPrice}
      />

      {/* Bids (buy orders) */}
      <div className="flex-1 overflow-y-auto">
        {orderBook.bids.map((level, index) => (
          <OrderBookRow
            key={`bid-${index}`}
            level={level}
            side="bid"
            maxDepth={maxDepth}
            onClick={() => onPriceClick?.(level.price, 'bid')}
          />
        ))}
      </div>
    </GlassCard>
  );
};

export default OrderBook;
