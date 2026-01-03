'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { GlowButton } from '@/app/components/ui/glow-button';
import { Package, AlertCircle, Search, RefreshCw } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface TradingEmptyStateProps {
  /** Title of the empty state */
  title: string;
  /** Description text */
  description: string;
  /** Type of empty state for icon selection */
  type?: 'empty' | 'error' | 'no-results';
  /** Action button label */
  actionLabel?: string;
  /** Action button handler */
  onAction?: () => void;
  /** Whether action is loading */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
  /** Test ID for E2E */
  testId?: string;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICONS = {
  empty: Package,
  error: AlertCircle,
  'no-results': Search,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * TradingEmptyState - Empty/error state display for trading pages
 *
 * Features:
 * - Multiple variants (empty, error, no-results)
 * - Optional action button
 * - Glass-morphism styling
 *
 * @example
 * ```tsx
 * // Empty state
 * <TradingEmptyState
 *   type="empty"
 *   title="No Asset Classes"
 *   description="There are no asset classes available yet."
 * />
 *
 * // Error state with retry
 * <TradingEmptyState
 *   type="error"
 *   title="Failed to Load"
 *   description="Unable to load asset classes."
 *   actionLabel="Try Again"
 *   onAction={refetch}
 * />
 *
 * // No search results
 * <TradingEmptyState
 *   type="no-results"
 *   title="No Results"
 *   description="No classes match your search."
 *   actionLabel="Clear Search"
 *   onAction={clearSearch}
 * />
 * ```
 */
export const TradingEmptyState = memo<TradingEmptyStateProps>(
  function TradingEmptyState({
    title,
    description,
    type = 'empty',
    actionLabel,
    onAction,
    isLoading = false,
    className,
    testId,
  }) {
    const Icon = ICONS[type];
    const iconColor =
      type === 'error'
        ? 'text-trading-sell'
        : type === 'no-results'
          ? 'text-warning'
          : 'text-muted-foreground';

    return (
      <div
        data-testid={testId}
        className={cn(
          'flex flex-col items-center justify-center',
          'py-16 px-6',
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border rounded-xl',
          'text-center',
          className,
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'w-16 h-16 rounded-full',
            'flex items-center justify-center mb-4',
            type === 'error'
              ? 'bg-trading-sell/10'
              : type === 'no-results'
                ? 'bg-warning/10'
                : 'bg-muted/10',
          )}
        >
          <Icon className={cn('w-8 h-8', iconColor)} />
        </div>

        {/* Title */}
        <h3 className="text-xl font-display font-semibold text-foreground mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>

        {/* Action button */}
        {actionLabel && onAction && (
          <GlowButton
            variant={type === 'error' ? 'secondary' : 'primary'}
            onClick={onAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : type === 'error' ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : null}
            {actionLabel}
          </GlowButton>
        )}
      </div>
    );
  },
);

export default TradingEmptyState;
