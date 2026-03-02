'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../ui/glass-card';
import { GlowButton } from '../ui/glow-button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { formatTokenAmount } from '@/lib/formatters';
import { ChevronDown, Package, Check, Info } from 'lucide-react';

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
  /** The node hash for sell orders - determines which node's inventory to use */
  nodeHash?: string;
}

/**
 * Asset attribute
 */
export interface AssetAttribute {
  name: string;
  value: string;
}

/**
 * Sellable asset with balance info
 */
export interface SellableAsset {
  id: string;
  tokenId: string;
  name: string;
  class: string;
  balance: string;
  price?: string;
  attributes?: AssetAttribute[];
  /** The node hash this asset belongs to - required for sell orders */
  nodeHash?: string;
}

/**
 * Props for the TradePanel component
 */
export interface TradePanelProps {
  /** Selected asset */
  asset?: TokenizedAssetUI | null;
  /** Initial price to populate */
  initialPrice?: number;
  /** Best ask price (lowest sell) - for market buy orders */
  bestAskPrice?: number;
  /** Best bid price (highest buy) - for market sell orders */
  bestBidPrice?: number;
  /** Available assets for selling (node's inventory) */
  sellableAssets?: SellableAsset[];
  /** Callback when asset is selected for selling */
  onAssetSelect?: (asset: SellableAsset) => void;
  /** Callback when order is placed */
  onOrderPlaced?: (order: OrderData) => void;
  /** Callback when order is submitted for placement */
  onPlaceOrder?: (order: OrderData) => Promise<boolean>;
  /** Optional className for styling */
  className?: string;
  /** Pre-select buy or sell side */
  initialSide?: OrderSide;
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
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        min="0"
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
 * AssetSelector - Elegant dropdown for selecting assets to sell
 */
interface AssetSelectorProps {
  assets: SellableAsset[];
  selectedAsset?: SellableAsset | null;
  onSelect: (asset: SellableAsset) => void;
}

const AssetSelector: React.FC<AssetSelectorProps> = ({
  assets,
  selectedAsset,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (assets.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-surface-overlay/50 border border-glass-border text-center">
        <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No assets available to sell
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full p-3 rounded-xl transition-all duration-200',
          'bg-gradient-to-br from-surface-overlay to-surface-overlay/50',
          'border border-glass-border hover:border-trading-sell/30',
          'flex items-center gap-3',
          isOpen && 'border-trading-sell/50 ring-1 ring-trading-sell/20',
        )}
      >
        {selectedAsset ? (
          <>
            <div className="w-10 h-10 rounded-lg bg-trading-sell/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-trading-sell">
                {selectedAsset.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-foreground truncate">
                  {selectedAsset.name}
                </p>
                {selectedAsset.attributes &&
                  selectedAsset.attributes.length > 0 && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="cursor-help">
                            <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-accent transition-colors" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-surface-elevated border-glass-border p-3 max-w-xs"
                        >
                          <p className="text-xs font-semibold text-foreground mb-2">
                            Asset Attributes
                          </p>
                          <div className="space-y-1">
                            {selectedAsset.attributes.map((attr, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-4 text-xs"
                              >
                                <span className="text-muted-foreground capitalize">
                                  {attr.name}
                                </span>
                                <span className="font-mono text-foreground bg-glass-hover px-1.5 py-0.5 rounded">
                                  {attr.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                Balance:{' '}
                <span className="font-mono text-trading-sell">
                  {selectedAsset.balance}
                </span>
                {selectedAsset.price && (
                  <span className="ml-2">
                    • ${formatTokenAmount(selectedAsset.price, 0, 2)}/unit
                  </span>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg bg-glass-hover flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground">
                Select asset to sell
              </p>
            </div>
          </>
        )}
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute z-20 w-full mt-2 py-2 rounded-xl bg-surface-elevated border border-glass-border shadow-xl shadow-black/20 max-h-64 overflow-y-auto">
            {assets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => {
                    onSelect(asset);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150',
                    'hover:bg-trading-sell/5',
                    isSelected && 'bg-trading-sell/10',
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-trading-sell/20' : 'bg-glass-hover',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isSelected
                          ? 'text-trading-sell'
                          : 'text-muted-foreground',
                      )}
                    >
                      {asset.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-trading-sell' : 'text-foreground',
                        )}
                      >
                        {asset.name}
                      </p>
                      {asset.attributes && asset.attributes.length > 0 && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="cursor-help">
                                <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-accent transition-colors" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-surface-elevated border-glass-border p-3 max-w-xs"
                            >
                              <p className="text-xs font-semibold text-foreground mb-2">
                                Asset Attributes
                              </p>
                              <div className="space-y-1">
                                {asset.attributes.map((attr, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-4 text-xs"
                                  >
                                    <span className="text-muted-foreground capitalize">
                                      {attr.name}
                                    </span>
                                    <span className="font-mono text-foreground bg-glass-hover px-1.5 py-0.5 rounded">
                                      {attr.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-glass-hover text-[10px] uppercase tracking-wider">
                        {asset.class}
                      </span>
                      <span className="font-mono">
                        {asset.balance} available
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-trading-sell flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

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
  bestAskPrice,
  bestBidPrice,
  sellableAssets = [],
  onAssetSelect,
  onOrderPlaced,
  onPlaceOrder,
  className,
  initialSide,
}) => {
  const [side, setSide] = useState<OrderSide>(initialSide ?? 'buy');
  const [type, setType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(initialPrice?.toString() || '');
  const [quantity, setQuantity] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedSellAsset, setSelectedSellAsset] =
    useState<SellableAsset | null>(null);

  // Get the effective price for display based on order type and side
  // For market orders: use best ask (buy) or best bid (sell)
  // For limit orders: use user-entered price
  const effectivePrice = useMemo(() => {
    if (type === 'market') {
      if (side === 'buy') {
        return bestAskPrice || initialPrice || 0;
      } else {
        return bestBidPrice || initialPrice || 0;
      }
    }
    return parseFloat(price) || 0;
  }, [type, side, bestAskPrice, bestBidPrice, initialPrice, price]);

  // Handle sell asset selection
  const handleSellAssetSelect = (sellAsset: SellableAsset) => {
    setSelectedSellAsset(sellAsset);
    onAssetSelect?.(sellAsset);
    // Pre-fill price if available
    if (sellAsset.price) {
      setPrice(sellAsset.price);
    }
  };

  // Get the effective asset based on side
  const effectiveAsset =
    side === 'sell' && selectedSellAsset
      ? ({
          ...asset,
          id: selectedSellAsset.id,
          name: selectedSellAsset.name,
          class: selectedSellAsset.class,
          capacity: selectedSellAsset.balance,
        } as TokenizedAssetUI)
      : asset;

  // Calculate totals using effective price (market price for market orders)
  const { total, fee, netTotal } = useMemo(() => {
    const priceNum =
      type === 'market' ? effectivePrice : parseFloat(price) || 0;
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
  }, [type, effectivePrice, price, quantity, side]);

  // Handle order placement
  const handlePlaceOrder = async () => {
    const orderAsset = side === 'sell' ? selectedSellAsset : asset;
    // For market orders, price field is not required (we use effectivePrice)
    if (!orderAsset || !quantity) return;
    if (type === 'limit' && !price) return;

    const orderData: OrderData = {
      side,
      type,
      // For market orders, use the effective price (best ask/bid)
      price: type === 'market' ? effectivePrice : parseFloat(price),
      quantity: parseFloat(quantity),
      total: netTotal,
      assetId:
        side === 'sell' && selectedSellAsset
          ? selectedSellAsset.tokenId
          : asset?.id || '',
      // Include nodeHash for sell orders - required to check correct node's inventory
      nodeHash:
        side === 'sell' && selectedSellAsset
          ? selectedSellAsset.nodeHash
          : undefined,
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

  // Update price when initialPrice changes (e.g. order book click)
  React.useEffect(() => {
    if (initialPrice !== undefined) {
      setPrice(initialPrice.toString());
    }
  }, [initialPrice]);

  // Update side when initialSide changes (e.g. order book click)
  React.useEffect(() => {
    if (initialSide !== undefined) {
      setSide(initialSide);
    }
  }, [initialSide]);

  // For sell orders, require a selected asset
  // For market orders, price is not required (determined by market)
  const hasValidPrice = type === 'market' || parseFloat(price) > 0;
  const hasValidQuantity = parseFloat(quantity) > 0;

  const isValid =
    side === 'sell'
      ? selectedSellAsset && hasValidPrice && hasValidQuantity
      : asset && hasValidPrice && hasValidQuantity;

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

      {/* Asset selector for sell orders */}
      {side === 'sell' && (
        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Select Asset to Sell
          </label>
          {sellableAssets.length > 0 ? (
            <AssetSelector
              assets={sellableAssets}
              selectedAsset={selectedSellAsset}
              onSelect={handleSellAssetSelect}
            />
          ) : (
            <div className="p-4 rounded-xl bg-surface-overlay/50 border border-glass-border text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No assets in your wallet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Mint or receive assets to sell them here
              </p>
            </div>
          )}
        </div>
      )}

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
          suffix={effectiveAsset?.name?.toUpperCase() || 'UNITS'}
        />

        {/* Quick quantity buttons */}
        {effectiveAsset && (
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => {
                  const maxQty = parseFloat(effectiveAsset.capacity) || 0;
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
          : `${side === 'buy' ? 'Buy' : 'Sell'} ${effectiveAsset?.name || 'Asset'}`}
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
