'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AssetClass } from '@/domain/platform';
import { TrendingUp, Package, BarChart3 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetClassCardProps {
  /** The asset class data */
  assetClass: AssetClass;
  /** Optional additional className */
  className?: string;
  /** Optional test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const CLASS_ICONS: Record<string, React.ReactNode> = {
  goat: '🐐',
  sheep: '🐑',
  cow: '🐄',
  cattle: '🐄',
  gold: '🥇',
  silver: '🥈',
  wine: '🍷',
  whiskey: '🥃',
  art: '🎨',
  'real estate': '🏠',
  collectibles: '💎',
  commodities: '📦',
};

/**
 * Get icon for asset class
 */
function getClassIcon(className: string): React.ReactNode {
  const key = className.toLowerCase();
  return CLASS_ICONS[key] || <Package className="w-6 h-6" />;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AssetClassCard - Display card for an asset class
 *
 * Features:
 * - Glass-morphism design matching the app theme
 * - Shows class icon, name, and statistics
 * - Clickable to navigate to class detail page
 * - Hover animations
 *
 * @example
 * ```tsx
 * <AssetClassCard
 *   assetClass={{
 *     name: 'Goat',
 *     assetTypeCount: 5,
 *     assetCount: 120,
 *     totalVolume: '50000',
 *     isActive: true,
 *   }}
 * />
 * ```
 */
export const AssetClassCard = memo<AssetClassCardProps>(
  function AssetClassCard({ assetClass, className, testId }) {
    const { name, assetTypeCount, assetCount, totalVolume } = assetClass;
    const icon = getClassIcon(name);

    return (
      <Link
        href={`/customer/trading/class/${encodeURIComponent(name)}`}
        data-testid={testId}
        className={cn(
          'group block',
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border',
          'rounded-xl p-6',
          'transition-all duration-300 ease-out',
          'hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
          'hover:-translate-y-1',
          'focus:outline-none focus:ring-2 focus:ring-accent/50',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div
            className={cn(
              'w-14 h-14 rounded-xl',
              'bg-accent/10 border border-accent/20',
              'flex items-center justify-center',
              'text-2xl',
              'transition-transform duration-300',
              'group-hover:scale-110',
            )}
          >
            {typeof icon === 'string' ? icon : icon}
          </div>

          {/* Status indicator */}
          <div
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              'bg-trading-buy/10 text-trading-buy',
            )}
          >
            Active
          </div>
        </div>

        {/* Name */}
        <h3
          className={cn(
            'text-xl font-display font-semibold text-foreground',
            'mb-3 capitalize',
            'group-hover:text-accent transition-colors',
          )}
        >
          {name}
        </h3>

        {/* Stats */}
        <div className="space-y-2">
          {/* Asset Types */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Asset Types
            </span>
            <span className="font-mono text-foreground">{assetTypeCount}</span>
          </div>

          {/* Total Assets */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Total Assets
            </span>
            <span className="font-mono text-foreground">{assetCount}</span>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              24h Volume
            </span>
            <span className="font-mono text-foreground">
              ${Number(totalVolume).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Hover indicator */}
        <div
          className={cn(
            'mt-4 pt-4 border-t border-glass-border',
            'flex items-center justify-center',
            'text-sm text-muted-foreground',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <span className="text-accent">View Assets →</span>
        </div>
      </Link>
    );
  },
);

export default AssetClassCard;
