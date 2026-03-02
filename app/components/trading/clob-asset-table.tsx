'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../ui/glass-card';
import { PriceChange } from '../ui/price-change';
import { ArrowUpDown, TrendingUp } from 'lucide-react';
import { TokenizedAssetUI } from '@/app/providers/trade.provider';
import { formatTokenAmount } from '@/lib/formatters';

/**
 * Sort keys for the asset table
 */
export type SortKey = 'name' | 'price' | 'change' | 'volume' | 'bid' | 'ask';

/**
 * Sort configuration
 */
export interface SortConfig {
  key: SortKey | null;
  direction: 'asc' | 'desc';
}

/**
 * Props for the CLOBAssetTable component
 */
export interface CLOBAssetTableProps {
  /** Array of assets to display */
  assets: TokenizedAssetUI[];
  /** Current sort configuration */
  sortConfig: SortConfig;
  /** Callback when sort changes */
  onSort: (key: SortKey) => void;
  /** Callback when asset is selected */
  onAssetSelect: (asset: TokenizedAssetUI) => void;
  /** Currently selected asset ID */
  selectedAssetId?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * Table header cell with sort functionality
 */
interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortConfig;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'center' | 'right';
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left',
}) => {
  const isActive = currentSort.key === sortKey;

  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer',
        'hover:text-foreground transition-colors select-none',
        isActive ? 'text-accent' : 'text-muted-foreground',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            'w-3 h-3 transition-opacity',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
          )}
        />
      </span>
    </th>
  );
};

/**
 * Generate mock trading data for an asset
 */
const generateMockTradingData = (asset: TokenizedAssetUI) => {
  const price = parseFloat(asset.price) || 0;
  const spread = price * 0.002; // 0.2% spread

  return {
    change24h: (Math.random() - 0.5) * 20, // -10% to +10%
    volume24h: Math.random() * 100000,
    bid: price - spread / 2,
    ask: price + spread / 2,
  };
};

/**
 * AssetRow - Individual row in the asset table
 */
interface AssetRowProps {
  asset: TokenizedAssetUI;
  isSelected: boolean;
  onClick: () => void;
  tradingData: ReturnType<typeof generateMockTradingData>;
}

const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  isSelected,
  onClick,
  tradingData,
}) => {
  const price = parseFloat(asset.price) || 0;

  return (
    <tr
      onClick={onClick}
      className={cn(
        'group cursor-pointer transition-all duration-200',
        'hover:bg-glass-hover',
        isSelected && 'bg-accent/5 border-l-2 border-l-accent',
      )}
    >
      {/* Asset info */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">
              {asset.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-foreground">{asset.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {asset.class}
            </div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="px-4 py-4 text-right font-mono tabular-nums">
        <span className="text-foreground">
          ${formatTokenAmount(asset.price, 0, 2)}
        </span>
      </td>

      {/* 24h Change */}
      <td className="px-4 py-4 text-right">
        <PriceChange value={tradingData.change24h} showIcon size="sm" />
      </td>

      {/* Volume */}
      <td className="px-4 py-4 text-right font-mono tabular-nums text-muted-foreground">
        $
        {tradingData.volume24h.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}
      </td>

      {/* Bid */}
      <td className="px-4 py-4 text-right font-mono tabular-nums text-trading-buy">
        ${tradingData.bid.toFixed(2)}
      </td>

      {/* Ask */}
      <td className="px-4 py-4 text-right font-mono tabular-nums text-trading-sell">
        ${tradingData.ask.toFixed(2)}
      </td>

      {/* Quick trade button */}
      <td className="px-4 py-4 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          Trade
        </button>
      </td>
    </tr>
  );
};

/**
 * CLOBAssetTable - Trading terminal asset listing
 *
 * Features:
 * - Sortable columns with trading data
 * - Row highlighting for selected asset
 * - Price and change visualization
 * - Quick-trade buttons
 * - Responsive design
 *
 * @example
 * ```tsx
 * <CLOBAssetTable
 *   assets={filteredAssets}
 *   sortConfig={sortConfig}
 *   onSort={handleSort}
 *   onAssetSelect={setSelectedAsset}
 *   selectedAssetId={selectedAsset?.id}
 * />
 * ```
 */
export const CLOBAssetTable: React.FC<CLOBAssetTableProps> = ({
  assets,
  sortConfig,
  onSort,
  onAssetSelect,
  selectedAssetId,
  className,
}) => {
  // Generate mock trading data for each asset
  const assetsWithTradingData = useMemo(() => {
    return assets.map((asset) => ({
      asset,
      tradingData: generateMockTradingData(asset),
    }));
  }, [assets]);

  // Apply sorting
  const sortedAssets = useMemo(() => {
    if (!sortConfig.key) return assetsWithTradingData;

    return [...assetsWithTradingData].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.asset.name.toLowerCase();
          bValue = b.asset.name.toLowerCase();
          break;
        case 'price':
          aValue = parseFloat(a.asset.price) || 0;
          bValue = parseFloat(b.asset.price) || 0;
          break;
        case 'change':
          aValue = a.tradingData.change24h;
          bValue = b.tradingData.change24h;
          break;
        case 'volume':
          aValue = a.tradingData.volume24h;
          bValue = b.tradingData.volume24h;
          break;
        case 'bid':
          aValue = a.tradingData.bid;
          bValue = b.tradingData.bid;
          break;
        case 'ask':
          aValue = a.tradingData.ask;
          bValue = b.tradingData.ask;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [assetsWithTradingData, sortConfig]);

  if (assets.length === 0) {
    return (
      <GlassCard className={cn('', className)}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Assets Found
          </h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding={false} className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-glass-border">
            <tr>
              <SortableHeader
                label="Asset"
                sortKey="name"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                label="Price"
                sortKey="price"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />
              <SortableHeader
                label="24h Change"
                sortKey="change"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />
              <SortableHeader
                label="Volume"
                sortKey="volume"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />
              <SortableHeader
                label="Bid"
                sortKey="bid"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />
              <SortableHeader
                label="Ask"
                sortKey="ask"
                currentSort={sortConfig}
                onSort={onSort}
                align="right"
              />
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border">
            {sortedAssets.map(({ asset, tradingData }) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetId === asset.id}
                onClick={() => onAssetSelect(asset)}
                tradingData={tradingData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default CLOBAssetTable;
