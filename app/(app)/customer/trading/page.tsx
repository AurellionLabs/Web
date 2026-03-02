'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { cn } from '@/lib/utils';
import {
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { ChevronDataStream } from '@/app/components/eva/eva-animations';
import { RefreshCw } from 'lucide-react';

// Trading components
import { ClassGrid } from '@/app/components/trading/class-grid';
import {
  TradingSearch,
  TradingEmptyState,
  ClassGridSkeleton,
} from '@/app/components/trading/shared';
import { TradingErrorBoundary } from '@/app/components/error-boundary';

// Hooks
import { usePlatformClasses } from '@/hooks/usePlatformClasses';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * TradingPage - Asset class selection grid
 *
 * Features:
 * - Displays all available asset classes from blockchain
 * - Search functionality to filter classes
 * - Responsive grid layout
 * - Loading skeletons and error states
 * - Each class card links to the class detail page
 */
function TradingPageContent() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { classes, isLoading, error, refetch, searchClasses } =
    usePlatformClasses();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Filter classes by search query
  const filteredClasses = useMemo(() => {
    return searchClasses(searchQuery);
  }, [searchClasses, searchQuery]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Render content based on state
  const renderContent = () => {
    // Loading state
    if (isLoading && classes.length === 0) {
      return <ClassGridSkeleton count={8} />;
    }

    // Error state
    if (error && classes.length === 0) {
      return (
        <TradingEmptyState
          type="error"
          title="Failed to Load Asset Classes"
          description={error}
          actionLabel="Try Again"
          onAction={handleRefresh}
          isLoading={isRefreshing}
        />
      );
    }

    // No classes available
    if (classes.length === 0) {
      return (
        <TradingEmptyState
          type="empty"
          title="No Asset Classes Available"
          description={
            connected
              ? 'There are no tokenized asset classes available at the moment. Check back later.'
              : 'Connect your wallet to view available asset classes.'
          }
        />
      );
    }

    // No search results
    if (searchQuery && filteredClasses.length === 0) {
      return (
        <TradingEmptyState
          type="no-results"
          title="No Results Found"
          description={`No asset classes match "${searchQuery}". Try a different search term.`}
          actionLabel="Clear Search"
          onAction={handleClearSearch}
        />
      );
    }

    // Show class grid
    return <ClassGrid classes={filteredClasses} testId="asset-class-grid" />;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Decorative top accent */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-6">
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground tracking-[0.15em] uppercase">
                Trading
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1 tracking-[0.15em] uppercase">
                Trade tokenized real-world assets on the order book
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EvaStatusBadge status="active" label="LIVE" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn(
                'p-2',
                'bg-card/60 border border-border/40',
                'hover:border-gold/30 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'font-mono',
              )}
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
              aria-label="Refresh asset classes"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-muted-foreground',
                  (isRefreshing || isLoading) && 'animate-spin',
                )}
              />
            </button>
          </div>
        </div>

        {/* Section marker for search */}
        <EvaSectionMarker
          section="SEARCH"
          label="Filter Asset Classes"
          variant="gold"
        />

        {/* Search bar */}
        <div className="mb-8 max-w-md">
          <TradingSearch
            placeholder="Search asset classes..."
            value={searchQuery}
            onChange={setSearchQuery}
            debounceMs={300}
            testId="class-search"
          />
        </div>

        {/* Chevron data stream section divider */}
        <ChevronDataStream text="Asset Classes" speed="4s" />

        {/* Asset class count */}
        {!isLoading && classes.length > 0 && (
          <div className="flex items-center gap-2 mb-6 mt-6">
            <span className="text-sm font-mono text-muted-foreground tracking-[0.15em] uppercase">
              {searchQuery
                ? `${filteredClasses.length} of ${classes.length} asset classes`
                : `${classes.length} asset classes available`}
            </span>
          </div>
        )}

        <EvaScanLine variant="mixed" />

        {/* Main content */}
        <div className="mt-6">{renderContent()}</div>

        {/* Bottom decorative accent */}
        <div className="mt-8">
          <GreekKeyStrip color="crimson" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORT WITH ERROR BOUNDARY
// =============================================================================

export default function TradingPage() {
  return (
    <TradingErrorBoundary>
      <TradingPageContent />
    </TradingErrorBoundary>
  );
}
