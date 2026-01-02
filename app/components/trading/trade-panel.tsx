'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../ui/glass-card';
import { GlowButton } from '../ui/glow-button';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { formatTokenAmount } from '@/lib/formatters';

/**
 * Order side type
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type
 */
export type OrderType = 'limit' | 'market';

/**
 * Order data structure
 */
export interface OrderData {
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  total: number;
  assetId: string;
}

/**
 * Props for the TradePanel component
 */
export interface TradePanelProps {
  /** Selected asset */
  asset?: TokenizedAssetUI | null;
  /** Initial price to populate */
  initialPrice?: number;
  /** Callback when order is placed */
  onOrderPlaced?: (order: OrderData) => void;
  /** Callback when order is submitted for placement */
  onPlaceOrder?: (order: OrderData) => Promise<boolean>;
  /** Optional className for styling */
  className?: string;
}

/**
 * SideToggle - Buy/Sell toggle tabs
 */
interface SideToggleProps {
  side: OrderSide;
  onSideChange: (side: OrderSide) => void;
}

const SideToggle: React.FC<SideToggleProps> = ({ side, onSideChange }) => (
  <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay">
    <button
      onClick={() => onSideChange('buy')}
      className={cn(
        'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200',
        side === 'buy'
          ? 'bg-trading-buy text-white shadow-glow-buy'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      Buy
    </button>
    <button
      onClick={() => onSideChange('sell')}
      className={cn(
        'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200',
        side === 'sell'
          ? 'bg-trading-sell text-white shadow-glow-sell'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      Sell
    </button>
  </div>
);

/**
 * TypeToggle - Limit/Market order type toggle
 */
interface TypeToggleProps {
  type: OrderType;
  onTypeChange: (type: OrderType) => void;
}

const TypeToggle: React.FC<TypeToggleProps> = ({ type, onTypeChange }) => (
  <div className="flex gap-2">
    <button
      onClick={() => onTypeChange('limit')}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
        type === 'limit'
          ? 'bg-accent/20 text-accent border border-accent/30'
          : 'text-muted-foreground hover:text-foreground border border-glass-border',
      )}
    >
      Limit
    </button>
    <button
      onClick={() => onTypeChange('market')}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
        type === 'market'
          ? 'bg-accent/20 text-accent border border-accent/30'
          : 'text-muted-foreground hover:text-foreground border border-glass-border',
      )}
    >
      Market
    </button>
  </div>
);

/**
 * NumberInput - Styled number input for trading
 */
interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  disabled?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder = '0.00',
  suffix,
  disabled = false,
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg font-mono tabular-nums text-sm',
          'bg-surface-overlay border border-glass-border',
          'focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20',
          'transition-all duration-200',
          'placeholder:text-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

/**
 * TradePanel - Buy/sell form with order type selection
 *
 * Features:
 * - Buy/Sell toggle tabs with distinct styling
 * - Limit/Market order type selector
 * - Price and quantity inputs
 * - Order summary with estimated fees
 * - Place order button with loading state
 *
 * @example
 * ```tsx
 * <TradePanel
 *   asset={selectedAsset}
 *   initialPrice={100}
 *   onPlaceOrder={async (order) => {
 *     await submitOrder(order);
 *     return true;
 *   }}
 * />
 * ```
 */
export const TradePanel: React.FC<TradePanelProps> = ({
  asset,
  initialPrice,
  onOrderPlaced,
  onPlaceOrder,
  className,
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [type, setType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(initialPrice?.toString() || '');
  const [quantity, setQuantity] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  // Calculate totals
  const { total, fee, netTotal } = useMemo(() => {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    const totalValue = priceNum * quantityNum;
    const feeValue = totalValue * 0.001; // 0.1% fee
    const netTotalValue =
      side === 'buy' ? totalValue + feeValue : totalValue - feeValue;

    return {
      total: totalValue,
      fee: feeValue,
      netTotal: netTotalValue,
    };
  }, [price, quantity, side]);

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!asset || !price || !quantity) return;

    const orderData: OrderData = {
      side,
      type,
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      total: netTotal,
      assetId: asset.id,
    };

    setIsPlacing(true);
    try {
      if (onPlaceOrder) {
        const success = await onPlaceOrder(orderData);
        if (success) {
          onOrderPlaced?.(orderData);
          setQuantity('');
          if (type === 'limit') setPrice('');
        }
      }
    } finally {
      setIsPlacing(false);
    }
  };

  // Update price when initialPrice changes
  React.useEffect(() => {
    if (initialPrice !== undefined) {
      setPrice(initialPrice.toString());
    }
  }, [initialPrice]);

  const isValid = asset && parseFloat(price) > 0 && parseFloat(quantity) > 0;

  return (
    <GlassCard className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Place Order
        </h3>
        {asset && <p className="text-sm text-muted-foreground">{asset.name}</p>}
      </div>

      {/* Buy/Sell toggle */}
      <SideToggle side={side} onSideChange={setSide} />

      {/* Order type toggle */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Order Type
        </span>
        <TypeToggle type={type} onTypeChange={setType} />
      </div>

      {/* Input fields */}
      <div className="mt-4 space-y-4">
        {type === 'limit' && (
          <NumberInput
            label="Price"
            value={price}
            onChange={setPrice}
            placeholder="0.00"
            suffix="USD"
          />
        )}

        <NumberInput
          label="Quantity"
          value={quantity}
          onChange={setQuantity}
          placeholder="0"
          suffix={asset?.name?.toUpperCase() || 'UNITS'}
        />

        {/* Quick quantity buttons */}
        {asset && (
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => {
                  const maxQty = parseFloat(asset.capacity) || 0;
                  setQuantity(((maxQty * percent) / 100).toString());
                }}
                className="flex-1 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-glass-hover border border-glass-border transition-all duration-200"
              >
                {percent}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order summary */}
      <div className="mt-6 pt-4 border-t border-glass-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Order Value</span>
          <span className="font-mono tabular-nums text-foreground">
            ${total.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Fee (0.1%)</span>
          <span className="font-mono tabular-nums text-muted-foreground">
            ${fee.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-medium pt-2 border-t border-glass-border">
          <span className="text-foreground">Total</span>
          <span
            className={cn(
              'font-mono tabular-nums',
              side === 'buy' ? 'text-trading-buy' : 'text-trading-sell',
            )}
          >
            ${netTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Place order button */}
      <GlowButton
        variant={side === 'buy' ? 'buy' : 'sell'}
        fullWidth
        className="mt-6"
        disabled={!isValid}
        loading={isPlacing}
        onClick={handlePlaceOrder}
      >
        {isPlacing
          ? 'Placing Order...'
          : `${side === 'buy' ? 'Buy' : 'Sell'} ${asset?.name || 'Asset'}`}
      </GlowButton>

      {/* Market price info for market orders */}
      {type === 'market' && (
        <p className="mt-3 text-xs text-center text-muted-foreground">
          Market orders execute at the best available price
        </p>
      )}
    </GlassCard>
  );
};

export default TradePanel;
