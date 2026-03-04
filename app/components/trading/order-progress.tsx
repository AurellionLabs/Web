'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GlassCard, GlassCardHeader, GlassCardTitle } from '../ui/glass-card';
import {
  OrderProgressStep,
  useOrderProgressSteps,
  OrderStatusConfig,
  UnifiedOrderStatus,
} from '@/hooks/useUnifiedOrder';
import {
  Check,
  Clock,
  Package,
  Truck,
  DollarSign,
  X,
  FileText,
} from 'lucide-react';

// Status configuration for order badges
const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-yellow-500/20',
    color: 'text-yellow-400',
    icon: '⏳',
  },
  matched: {
    label: 'Matched',
    bgColor: 'bg-blue-500/20',
    color: 'text-blue-400',
    icon: '✓',
  },
  in_transit: {
    label: 'In Transit',
    bgColor: 'bg-purple-500/20',
    color: 'text-purple-400',
    icon: '🚚',
  },
  delivered: {
    label: 'Delivered',
    bgColor: 'bg-green-500/20',
    color: 'text-green-400',
    icon: '📦',
  },
  settled: {
    label: 'Settled',
    bgColor: 'bg-emerald-500/20',
    color: 'text-emerald-400',
    icon: '💰',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-red-500/20',
    color: 'text-red-400',
    icon: '✕',
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-500/20',
    color: 'text-red-400',
    icon: '⚠',
  },
} as const;

/**
 * OrderProgressStepComponent - Visual step in the order lifecycle
 */
interface OrderProgressStepProps {
  step: OrderProgressStep;
  isLast: boolean;
}

const OrderProgressStepComponent: React.FC<OrderProgressStepProps> = ({
  step,
  isLast,
}) => {
  return (
    <div className={cn('flex items-start', !isLast && 'pb-8')}>
      {/* Step indicator */}
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center z-10',
            'transition-all duration-300',
            step.isCompleted && 'bg-green-500 text-white',
            step.isCurrent &&
              step.status !== 'cancelled' &&
              'bg-blue-500 text-white animate-pulse',
            !step.isCompleted && !step.isCurrent && 'bg-gray-700 text-white/80',
            step.status === 'cancelled' && 'bg-red-500 text-white',
          )}
        >
          {step.status === 'cancelled' ? (
            <X className="w-5 h-5" />
          ) : step.isCompleted ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="text-sm font-medium">{step.icon}</span>
          )}
        </div>

        {/* Connecting line */}
        {!isLast && (
          <div
            className={cn(
              'absolute left-1/2 w-0.5 h-full -translate-x-1/2 top-10',
              step.isCompleted ? 'bg-green-500' : 'bg-gray-700',
            )}
          />
        )}
      </div>

      {/* Step content */}
      <div className="ml-4 flex-1 pt-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium',
              step.isCompleted && 'text-green-500',
              step.isCurrent && 'text-blue-500',
              !step.isCompleted && !step.isCurrent && 'text-white/80',
              step.status === 'cancelled' && 'text-red-500',
            )}
          >
            {step.label}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mt-1">{step.description}</p>
      </div>
    </div>
  );
};

/**
 * OrderProgressComponent - Shows complete order lifecycle
 *
 * Features:
 * - Visual timeline of order progress
 * - Current status highlighted
 * - Completed steps marked
 * - Responsive design
 *
 * @example
 * ```tsx
 * <OrderProgressComponent order={trackedOrder} />
 * ```
 */
interface OrderProgressComponentProps {
  order: {
    status: string;
    createdAt: number;
    matchedAt?: number;
    deliveredAt?: number;
    settledAt?: number;
  } | null;
  className?: string;
}

export const OrderProgressComponent: React.FC<OrderProgressComponentProps> = ({
  order,
  className,
}) => {
  // Create a mock tracked order for the hook
  const mockOrder = order
    ? {
        ...order,
        statusConfig: {
          label: order.status,
          color: '',
          bgColor: '',
          icon: '',
          description: '',
        },
        progressPercent: 0,
        isActive: false,
        canCancel: false,
        estimatedDelivery: undefined,
        id: '',
        clobOrderId: '',
        clobTradeId: '',
        ausysOrderId: '',
        journeyIds: [],
        buyer: '',
        seller: '',
        sellerNode: '',
        token: '',
        tokenId: '',
        tokenQuantity: '',
        price: '',
        bounty: '',
        deliveryData: { lat: '', lng: '', name: '' },
      }
    : null;

  const steps = useOrderProgressSteps(mockOrder as any);

  if (!order) {
    return (
      <GlassCard className={className}>
        <GlassCardHeader>
          <GlassCardTitle>Order Progress</GlassCardTitle>
        </GlassCardHeader>
        <div className="p-4 text-center text-muted-foreground">
          No order to display
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={className}>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-accent" />
          Order Progress
        </GlassCardTitle>
      </GlassCardHeader>

      <div className="p-4">
        {/* Progress bar at top */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {steps.filter((s) => s.isCompleted).length} / {steps.length} steps
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{
                width: `${(steps.filter((s) => s.isCompleted).length / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {steps.map((step, index) => (
            <OrderProgressStepComponent
              key={step.status}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Timestamps */}
        <div className="mt-6 pt-4 border-t border-glass-border space-y-2">
          {order.createdAt > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Order Placed
              </span>
              <span className="font-mono">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          )}
          {order.matchedAt && order.matchedAt > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Trade Executed
              </span>
              <span className="font-mono">
                {new Date(order.matchedAt).toLocaleString()}
              </span>
            </div>
          )}
          {order.deliveredAt && order.deliveredAt > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Delivered
              </span>
              <span className="font-mono">
                {new Date(order.deliveredAt).toLocaleString()}
              </span>
            </div>
          )}
          {order.settledAt && order.settledAt > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Settled
              </span>
              <span className="font-mono">
                {new Date(order.settledAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

/**
 * OrderStatusBadge - Simple status badge for orders
 */
interface OrderStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const config =
    ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  if (!config) {
    return (
      <span
        className={cn(
          'rounded-full font-medium',
          sizeClasses[size],
          'bg-gray-500/10 text-white/70',
        )}
      >
        Unknown
      </span>
    );
  }

  return (
    <span
      className={cn(
        'rounded-full font-medium inline-flex items-center gap-1.5',
        sizeClasses[size],
        config.bgColor,
        config.color,
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

export default OrderProgressComponent;
