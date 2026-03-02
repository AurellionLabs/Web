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
  /** Base token address (ERC1155 contract) */
  baseToken?: string;
  /** Base token ID */
  baseTokenId?: string;
  /** Base price for the asset */
  basePrice?: number;
  /** Maximum levels to display per side */
  maxLevels?: number;
  /** Callback when a price is clicked */
  onPriceClick?: (price: number, side: 'bid' | 'ask') => void;
  /** Optional className for styling */
  className?: string;
  /** Compact mode for sidebar display */
  compact?: boolean;
}

/**
 * OrderBookRow - Individual row in the order book
 */
interface OrderBookRowProps {
  level: OrderLevel;
  side: 'bid' | 'ask';
  maxDepth: number;
  onClick?: () => void;
  compact?: boolean;
}

const OrderBookRow: React.FC<OrderBookRowProps> = ({
  level,
  side,
  maxDepth,
  onClick,
  compact = false,
}) => {
  const depthWidth = maxDepth > 0 ? (level.total / maxDepth) * 100 : 0;

  const isBid = side === 'bid';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full grid grid-cols-3 gap-2 font-mono tabular-nums',
        'hover:bg-white/5 transition-colors cursor-pointer',
        'focus:outline-none focus:ring-1 focus:ring-accent/50',
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
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
  baseToken,
  baseTokenId,
  basePrice = 100,
  maxLevels = 10,
  onPriceClick,
  className,
  compact = false,
}) => {
  const { orderBook, isLoading } = useOrderBook(assetId, {
    levels: maxLevels,
    basePrice,
    baseToken,
    baseTokenId,
    updateInterval: 10000, // Refresh every 10 seconds
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
      <GlassCard className={cn(compact ? '' : 'h-full', className)}>
        <GlassCardHeader className={compact ? 'p-3' : undefined}>
          <GlassCardTitle className={compact ? 'text-sm' : undefined}>
            Order Book
          </GlassCardTitle>
        </GlassCardHeader>
        <div
          className={cn(
            'flex items-center justify-center',
            compact ? 'h-32' : 'h-64',
          )}
        >
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </GlassCard>
    );
  }

  // Check if order book is empty
  const hasOrders = orderBook.bids.length > 0 || orderBook.asks.length > 0;

  return (
    <GlassCard
      className={cn(compact ? '' : 'h-full', 'flex flex-col p-0', className)}
    >
      {/* Header */}
      <div
        className={cn('border-b border-glass-border', compact ? 'p-3' : 'p-4')}
      >
        <div className="flex items-center justify-between">
          <h3
            className={cn(
              'font-semibold text-foreground',
              compact ? 'text-sm' : 'text-lg',
            )}
          >
            Order Book
          </h3>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            Mid: ${orderBook.midPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        className={cn(
          'grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b border-glass-border',
          compact ? 'px-2 py-1.5' : 'px-3 py-2',
        )}
      >
        <span className="text-left">Price</span>
        <span className="text-center">Size</span>
        <span className="text-right">Total</span>
      </div>

      {hasOrders ? (
        <>
          {/* Asks (sell orders) - reversed so lowest ask is at bottom */}
          <div
            className={cn('overflow-y-auto', compact ? 'max-h-24' : 'flex-1')}
          >
            <div className="flex flex-col-reverse">
              {orderBook.asks.map((level, index) => (
                <OrderBookRow
                  key={`ask-${index}`}
                  level={level}
                  side="ask"
                  maxDepth={maxDepth}
                  onClick={() => onPriceClick?.(level.price, 'ask')}
                  compact={compact}
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
          <div
            className={cn('overflow-y-auto', compact ? 'max-h-24' : 'flex-1')}
          >
            {orderBook.bids.map((level, index) => (
              <OrderBookRow
                key={`bid-${index}`}
                level={level}
                side="bid"
                maxDepth={maxDepth}
                onClick={() => onPriceClick?.(level.price, 'bid')}
                compact={compact}
              />
            ))}
          </div>
        </>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center text-center',
            compact ? 'h-32' : 'flex-1 min-h-[200px]',
          )}
        >
          <p className="text-muted-foreground text-sm">No orders yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Place the first order to start trading
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default OrderBook;
