'use client';

import { FC, useEffect, useState, useCallback, useMemo } from 'react';

import { clobV2Repository } from '@/infrastructure/repositories/clob-v2-repository';
import { useWallet } from '@/hooks/useWallet';
import { useDiamond } from '@/app/providers/diamond.provider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { cn } from '@/lib/utils';
import {
  Loader2,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TimeInForce } from '@/domain/clob/clob';
import type { CLOBOrder, CLOBOrderStatus } from '@/domain/clob/clob';

// =============================================================================
// TYPES
// =============================================================================

interface UserOrdersProps {
  /** Base token address to filter orders (optional) */
  baseToken?: string;
  /** Base token ID to filter orders (optional) */
  baseTokenId?: string;
  /** Maximum number of orders to show */
  maxOrders?: number;
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Class name for styling */
  className?: string;
}

type OrderTab = 'open' | 'filled' | 'all';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format time remaining until expiry
 */
function formatTimeRemaining(expiryTimestamp: number): string {
  if (expiryTimestamp === 0) return '∞'; // GTC order

  const now = Date.now() / 1000;
  const remaining = expiryTimestamp - now;

  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get time-in-force display label
 */
function getTimeInForceLabel(tif: TimeInForce | string): string {
  switch (tif) {
    case TimeInForce.GTC:
    case 'GTC':
      return 'GTC';
    case TimeInForce.IOC:
    case 'IOC':
      return 'IOC';
    case TimeInForce.FOK:
    case 'FOK':
      return 'FOK';
    case TimeInForce.GTD:
    case 'GTD':
      return 'GTD';
    default:
      return 'GTC';
  }
}

/**
 * Get status color and icon
 */
function getStatusInfo(status: CLOBOrderStatus | string): {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle2;
} {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        icon: Clock,
      };
    case 'partial':
      return {
        label: 'Partial',
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
        icon: AlertCircle,
      };
    case 'filled':
      return {
        label: 'Filled',
        color: 'text-trading-buy',
        bgColor: 'bg-trading-buy/10',
        icon: CheckCircle2,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/10',
        icon: XCircle,
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/10',
        icon: AlertCircle,
      };
  }
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(2)}K`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export const UserOrders: FC<UserOrdersProps> = ({
  baseToken,
  baseTokenId,
  maxOrders = 20,
  refreshInterval = 15000,
  compact = false,
  className,
}) => {
  const { address } = useWallet();
  const { cancelCLOBOrder } = useDiamond();

  // State
  const [orders, setOrders] = useState<CLOBOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderTab>('open');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );

  // Fetch user orders
  const fetchOrders = useCallback(async () => {
    if (!address) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      const userOrders: CLOBOrder[] = await clobV2Repository
        .getUserOrders(address, undefined, maxOrders)
        .catch(() => []);

      // Filter by base token if specified
      let filteredOrders = userOrders;
      if (baseToken) {
        filteredOrders = userOrders.filter(
          (o) => o.baseToken.toLowerCase() === baseToken.toLowerCase(),
        );
      }
      if (baseTokenId) {
        filteredOrders = filteredOrders.filter(
          (o) => o.baseTokenId === baseTokenId,
        );
      }

      // Sort by creation time (newest first)
      filteredOrders.sort((a, b) => b.createdAt - a.createdAt);

      setOrders(filteredOrders);
    } catch (error) {
      console.error('[UserOrders] Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [address, baseToken, baseTokenId, maxOrders]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh - only poll when tab is visible to save RPC calls
  useEffect(() => {
    if (refreshInterval <= 0) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };

    // Initial tick
    tick();

    intervalId = setInterval(tick, refreshInterval);

    // Also trigger immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchOrders();
  }, [fetchOrders]);

  // Handle cancel order
  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      setCancellingOrderId(orderId);
      try {
        await cancelCLOBOrder(orderId);
        // Refresh orders after cancel
        await fetchOrders();
      } catch (error) {
        console.error('[UserOrders] Failed to cancel order:', error);
      } finally {
        setCancellingOrderId(null);
      }
    },
    [cancelCLOBOrder, fetchOrders],
  );

  // Filter orders by tab
  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'open':
        return orders.filter(
          (o) => o.status === 'open' || o.status === 'partial',
        );
      case 'filled':
        return orders.filter((o) => o.status === 'filled');
      case 'all':
      default:
        return orders;
    }
  }, [orders, activeTab]);

  // Count orders by status
  const orderCounts = useMemo(() => {
    return {
      open: orders.filter((o) => o.status === 'open' || o.status === 'partial')
        .length,
      filled: orders.filter((o) => o.status === 'filled').length,
      all: orders.length,
    };
  }, [orders]);

  // Toggle expanded order
  const toggleExpanded = useCallback((orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  }, []);

  // Render order row
  const renderOrderRow = (order: CLOBOrder) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = statusInfo.icon;
    const isExpanded = expandedOrderId === order.id;
    const isCancelling = cancellingOrderId === order.id;
    const canCancel = order.status === 'open' || order.status === 'partial';
    const fillPercent =
      (parseFloat(String(order.filledAmount)) /
        parseFloat(String(order.amount))) *
      100;

    // Determine time-in-force from order (default to GTC if not specified)
    const tif = order.timeInForce || TimeInForce.GTC;
    const expiry = order.expiry || 0;

    return (
      <div
        key={order.id}
        className={cn(
          'border-b border-glass-border last:border-b-0',
          'hover:bg-glass-bg/50 transition-colors',
        )}
      >
        {/* Main row */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 cursor-pointer',
            compact && 'py-2',
          )}
          onClick={() => toggleExpanded(order.id)}
        >
          {/* Side indicator */}
          <div
            className={cn(
              'w-1.5 h-8 rounded-full',
              order.isBuy ? 'bg-trading-buy' : 'bg-trading-sell',
            )}
          />

          {/* Order info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded',
                  order.isBuy
                    ? 'bg-trading-buy/10 text-trading-buy'
                    : 'bg-trading-sell/10 text-trading-sell',
                )}
              >
                {order.isBuy ? 'BUY' : 'SELL'}
              </span>
              <span className="text-xs text-muted-foreground">
                {order.orderType === 'market' ? 'Market' : 'Limit'}
              </span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  'bg-surface-overlay text-muted-foreground',
                )}
              >
                {getTimeInForceLabel(tif)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm text-foreground">
                {formatPrice(parseFloat(String(order.price)))}
              </span>
              <span className="text-xs text-muted-foreground">×</span>
              <span className="font-mono text-sm text-foreground">
                {order.amount}
              </span>
            </div>
          </div>

          {/* Fill progress */}
          <div className="w-20 hidden sm:block">
            <div className="text-xs text-muted-foreground mb-1">
              {order.filledAmount}/{order.amount}
            </div>
            <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  order.isBuy ? 'bg-trading-buy' : 'bg-trading-sell',
                )}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          {/* Time remaining (for GTD orders) */}
          {tif === TimeInForce.GTD && expiry > 0 && (
            <div className="text-xs text-muted-foreground hidden md:block">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatTimeRemaining(expiry)}
            </div>
          )}

          {/* Status */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
              statusInfo.bgColor,
              statusInfo.color,
            )}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </div>

          {/* Expand indicator */}
          <div className="text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 bg-surface-overlay/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">
                  Order ID
                </span>
                <span className="font-mono text-xs text-foreground truncate block">
                  {order.id.slice(0, 10)}...
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Created
                </span>
                <span className="text-foreground">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Total Value
                </span>
                <span className="font-mono text-foreground">
                  {formatPrice(
                    parseFloat(String(order.price)) *
                      parseFloat(String(order.amount)),
                  )}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Filled Value
                </span>
                <span className="font-mono text-foreground">
                  {formatPrice(
                    parseFloat(String(order.price)) *
                      parseFloat(String(order.filledAmount)),
                  )}
                </span>
              </div>
            </div>

            {/* Cancel button for open orders */}
            {canCancel && (
              <div className="mt-4 flex justify-end">
                <GlowButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelOrder(order.id);
                  }}
                  disabled={isCancelling}
                  className="text-trading-sell border-trading-sell/30 hover:bg-trading-sell/10"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3 mr-1.5" />
                      Cancel Order
                    </>
                  )}
                </GlowButton>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-overlay flex items-center justify-center mb-3">
        <Clock className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">
        {activeTab === 'open'
          ? 'No open orders'
          : activeTab === 'filled'
            ? 'No filled orders'
            : 'No orders yet'}
      </p>
      <p className="text-muted-foreground/60 text-xs mt-1">
        {address
          ? 'Place an order to get started'
          : 'Connect your wallet to view orders'}
      </p>
    </div>
  );

  return (
    <GlassCard padding={false} className={className}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border">
        <GlassCardTitle className="text-base">Your Orders</GlassCardTitle>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className={cn(
            'p-1.5 rounded-lg',
            'hover:bg-glass-bg transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label="Refresh orders"
        >
          <RefreshCw
            className={cn(
              'w-4 h-4 text-muted-foreground',
              (isRefreshing || isLoading) && 'animate-spin',
            )}
          />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-glass-border">
        {(['open', 'filled', 'all'] as OrderTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-accent/20 text-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-glass-bg',
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {orderCounts[tab] > 0 && (
              <span
                className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                  activeTab === tab ? 'bg-accent/30' : 'bg-surface-overlay',
                )}
              >
                {orderCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className={cn('max-h-96 overflow-y-auto', compact && 'max-h-64')}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          renderEmptyState()
        ) : (
          filteredOrders.map(renderOrderRow)
        )}
      </div>

      {/* Footer with legend */}
      {!compact && filteredOrders.length > 0 && (
        <div className="px-4 py-2 border-t border-glass-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-trading-buy" /> Buy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-trading-sell" /> Sell
            </span>
            <span className="flex items-center gap-1 ml-auto">
              GTC = Good Till Cancel
            </span>
            <span className="flex items-center gap-1">
              GTD = Good Till Date
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default UserOrders;
