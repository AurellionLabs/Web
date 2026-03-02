'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { TrapButton } from '@/app/components/eva/eva-components';
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
 * - EVA design system styling with sharp corners
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
        ? 'text-crimson'
        : type === 'no-results'
          ? 'text-gold'
          : 'text-foreground/40';

    return (
      <div
        data-testid={testId}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'py-16 px-6',
          'bg-card/60',
          'border border-border/30',
          'text-center',
          className,
        )}
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        }}
      >
        {/* Left accent bar */}
        <div className="absolute top-0 left-0 w-1 bottom-4 bg-gold/30" />

        {/* Icon */}
        <div
          className={cn(
            'w-16 h-16',
            'flex items-center justify-center mb-4',
            type === 'error'
              ? 'bg-crimson/10'
              : type === 'no-results'
                ? 'bg-gold/10'
                : 'bg-foreground/5',
          )}
          style={{
            clipPath:
              'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          <Icon className={cn('w-8 h-8', iconColor)} />
        </div>

        {/* Title */}
        <h3 className="font-mono text-lg font-bold tracking-[0.15em] uppercase text-foreground/90 mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="font-mono text-sm text-foreground/40 max-w-md mb-6 tracking-wide">
          {description}
        </p>

        {/* Action button */}
        {actionLabel && onAction && (
          <TrapButton
            variant={type === 'error' ? 'crimson' : 'gold'}
            onClick={onAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin inline-block" />
            ) : type === 'error' ? (
              <RefreshCw className="w-4 h-4 mr-2 inline-block" />
            ) : null}
            {actionLabel}
          </TrapButton>
        )}
      </div>
    );
  },
);

export default TradingEmptyState;
