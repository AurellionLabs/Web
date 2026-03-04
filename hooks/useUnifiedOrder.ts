'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  orderBridgeService,
  UnifiedOrder,
  UnifiedOrderStatus,
} from '@/infrastructure/services/order-bridge-service';

/**
 * Order status display configuration
 */
export interface OrderStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

/**
 * Complete order lifecycle with tracking information
 */
export interface TrackedOrder extends UnifiedOrder {
  statusConfig: OrderStatusConfig;
  progressPercent: number;
  isActive: boolean;
  canCancel: boolean;
  estimatedDelivery?: Date;
}

/**
 * Configuration for each order status
 */
const ORDER_STATUS_CONFIG: Record<UnifiedOrderStatus, OrderStatusConfig> = {
  [UnifiedOrderStatus.NONE]: {
    label: 'Unknown',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: '❓',
    description: 'Order status is unknown',
  },
  [UnifiedOrderStatus.PENDING_TRADE]: {
    label: 'Order Placed',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: '📝',
    description: 'Your order is on the order book, waiting for a match',
  },
  [UnifiedOrderStatus.TRADE_MATCHED]: {
    label: 'Trade Executed',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: '🤝',
    description: 'Trade matched! Preparing logistics for delivery',
  },
  [UnifiedOrderStatus.LOGISTICS_CREATED]: {
    label: 'Preparing Delivery',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: '📦',
    description: 'Delivery order created, awaiting driver assignment',
  },
  [UnifiedOrderStatus.IN_TRANSIT]: {
    label: 'In Transit',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: '🚚',
    description: 'Package is on its way to you',
  },
  [UnifiedOrderStatus.DELIVERED]: {
    label: 'Delivered',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: '✅',
    description: 'Package delivered! Settlement in progress',
  },
  [UnifiedOrderStatus.SETTLED]: {
    label: 'Settled',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    icon: '💰',
    description: 'All payments completed successfully',
  },
  [UnifiedOrderStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: '❌',
    description: 'Order has been cancelled',
  },
};

/**
 * Calculate progress percentage based on order status
 */
const calculateProgress = (status: UnifiedOrderStatus): number => {
  const progressMap: Record<UnifiedOrderStatus, number> = {
    [UnifiedOrderStatus.NONE]: 0,
    [UnifiedOrderStatus.PENDING_TRADE]: 10,
    [UnifiedOrderStatus.TRADE_MATCHED]: 25,
    [UnifiedOrderStatus.LOGISTICS_CREATED]: 40,
    [UnifiedOrderStatus.IN_TRANSIT]: 70,
    [UnifiedOrderStatus.DELIVERED]: 90,
    [UnifiedOrderStatus.SETTLED]: 100,
    [UnifiedOrderStatus.CANCELLED]: 0,
  };
  return progressMap[status] || 0;
};

/**
 * Determine if order is active (can still be modified/cancelled)
 */
const isOrderActive = (status: UnifiedOrderStatus): boolean => {
  return status === UnifiedOrderStatus.PENDING_TRADE;
};

/**
 * Determine if order can be cancelled
 */
const canOrderBeCancelled = (status: UnifiedOrderStatus): boolean => {
  return (
    status === UnifiedOrderStatus.PENDING_TRADE ||
    status === UnifiedOrderStatus.TRADE_MATCHED
  );
};

/**
 * Estimate delivery date based on order status and creation time
 */
const estimateDelivery = (order: UnifiedOrder): Date | undefined => {
  if (
    order.status === UnifiedOrderStatus.SETTLED ||
    order.status === UnifiedOrderStatus.DELIVERED
  ) {
    return new Date(order.deliveredAt);
  }

  if (order.status === UnifiedOrderStatus.IN_TRANSIT) {
    // Estimate 24-48 hours from creation
    const created = new Date(order.createdAt);
    const estimated = new Date(created.getTime() + 36 * 60 * 60 * 1000);
    return estimated;
  }

  return undefined;
};

/**
 * useUnifiedOrder - Hook for tracking unified orders through complete lifecycle
 *
 * Features:
 * - Fetches and tracks unified orders from OrderBridge
 * - Calculates order progress and status
 * - Provides order actions (cancel, track)
 * - Polls for status updates
 *
 * @param orderId - Optional specific order ID to track
 * @param autoRefresh - Whether to auto-refresh order status
 * @param refreshInterval - Refresh interval in milliseconds
 *
 * @example
 * ```tsx
 * const { orders, isLoading, refresh, cancelOrder } = useUnifiedOrder();
 *
 * // Track specific order
 * const { order, isLoading } = useUnifiedOrder('0x...');
 * ```
 */
export function useUnifiedOrder(
  orderId?: string,
  autoRefresh: boolean = true,
  refreshInterval: number = 10000,
) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch and update order data
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (orderId) {
        // Fetch specific order
        const orderData = await orderBridgeService.getUnifiedOrder(orderId);

        if (orderData) {
          const tracked: TrackedOrder = {
            ...orderData,
            statusConfig: ORDER_STATUS_CONFIG[orderData.status],
            progressPercent: calculateProgress(orderData.status),
            isActive: isOrderActive(orderData.status),
            canCancel: canOrderBeCancelled(orderData.status),
            estimatedDelivery: estimateDelivery(orderData),
          };
          setOrder(tracked);
        } else {
          setOrder(null);
          setError('Order not found');
        }
      }
    } catch (err) {
      console.error('[useUnifiedOrder] Error fetching order:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  /**
   * Cancel an order
   */
  const cancelOrder = useCallback(async (): Promise<boolean> => {
    if (!orderId) return false;

    try {
      const result = await orderBridgeService.cancelUnifiedOrder(orderId);

      if (result.success) {
        await refresh();
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useUnifiedOrder] Error cancelling order:', err);
      return false;
    }
  }, [orderId, refresh]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    refresh();

    if (autoRefresh && orderId) {
      // Only poll when page is visible to save bandwidth and reduce RPC load
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      };

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      }, refreshInterval);

      document.addEventListener('visibilitychange', handleVisibilityChange);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      return () => {
        clearInterval(interval);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, autoRefresh, refreshInterval]);

  return {
    order,
    isLoading,
    error,
    refresh,
    cancelOrder,
    statusConfig: order?.statusConfig,
    progressPercent: order?.progressPercent || 0,
    isActive: order?.isActive || false,
    canCancel: order?.canCancel || false,
    estimatedDelivery: order?.estimatedDelivery,
  };
}

/**
 * useUnifiedOrders - Hook for tracking all user orders
 *
 * @param userAddress - User wallet address
 * @param autoRefresh - Whether to auto-refresh
 * @param refreshInterval - Refresh interval
 */
export function useUnifiedOrders(
  userAddress?: string,
  autoRefresh: boolean = true,
  refreshInterval: number = 30000,
) {
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all order IDs for user
   */
  const fetchOrderIds = useCallback(async () => {
    if (!userAddress) return;

    try {
      const ids = await orderBridgeService.getBuyerOrders(userAddress);
      setOrderIds(ids);
    } catch (err) {
      console.error('[useUnifiedOrders] Error fetching order IDs:', err);
    }
  }, [userAddress]);

  /**
   * Fetch details for all orders
   */
  const fetchOrders = useCallback(async () => {
    if (orderIds.length === 0) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      const orderPromises = orderIds.map(async (id) => {
        const orderData = await orderBridgeService.getUnifiedOrder(id);
        if (!orderData) return null;

        return {
          ...orderData,
          statusConfig: ORDER_STATUS_CONFIG[orderData.status],
          progressPercent: calculateProgress(orderData.status),
          isActive: isOrderActive(orderData.status),
          canCancel: canOrderBeCancelled(orderData.status),
          estimatedDelivery: estimateDelivery(orderData),
        } as TrackedOrder;
      });

      const fetchedOrders = await Promise.all(orderPromises);
      const validOrders = fetchedOrders.filter(
        (o): o is TrackedOrder => o !== null,
      );

      // Sort by creation date (newest first)
      validOrders.sort((a, b) => b.createdAt - a.createdAt);

      setOrders(validOrders);
    } catch (err) {
      console.error('[useUnifiedOrders] Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderIds]);

  /**
   * Refresh all orders
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchOrderIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrderIds]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [userAddress]);

  // Fetch order details when IDs change
  useEffect(() => {
    if (orderIds.length > 0) {
      fetchOrders();
    }
  }, [orderIds, fetchOrders]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && userAddress) {
      // Only poll when page is visible to save bandwidth and reduce RPC load
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      };

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      }, refreshInterval);

      document.addEventListener('visibilitychange', handleVisibilityChange);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      return () => {
        clearInterval(interval);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddress, autoRefresh, refreshInterval]);

  return {
    orders,
    orderIds,
    isLoading,
    error,
    refresh,
    activeOrders: orders.filter((o) => o.isActive),
    pendingOrders: orders.filter(
      (o) => o.status === UnifiedOrderStatus.PENDING_TRADE,
    ),
    inTransitOrders: orders.filter(
      (o) => o.status === UnifiedOrderStatus.IN_TRANSIT,
    ),
    completedOrders: orders.filter(
      (o) =>
        o.status === UnifiedOrderStatus.SETTLED ||
        o.status === UnifiedOrderStatus.DELIVERED,
    ),
  };
}

/**
 * Order progress step for UI
 */
export interface OrderProgressStep {
  status: UnifiedOrderStatus;
  label: string;
  icon: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

/**
 * Generate progress steps from order status
 */
export function useOrderProgressSteps(
  order: TrackedOrder | null,
): OrderProgressStep[] {
  return useMemo(() => {
    if (!order) return [];

    const steps: UnifiedOrderStatus[] = [
      UnifiedOrderStatus.PENDING_TRADE,
      UnifiedOrderStatus.TRADE_MATCHED,
      UnifiedOrderStatus.LOGISTICS_CREATED,
      UnifiedOrderStatus.IN_TRANSIT,
      UnifiedOrderStatus.DELIVERED,
      UnifiedOrderStatus.SETTLED,
    ];

    const currentIndex = steps.indexOf(order.status);

    return steps.map((status, index) => ({
      status,
      ...ORDER_STATUS_CONFIG[status],
      isCompleted: index < currentIndex,
      isCurrent:
        index === currentIndex && order.status !== UnifiedOrderStatus.CANCELLED,
    }));
  }, [order]);
}

export { UnifiedOrderStatus };
export default useUnifiedOrder;
