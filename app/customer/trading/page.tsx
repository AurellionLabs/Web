'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useTrade, TokenizedAssetUI } from '@/app/providers/trade.provider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/app/components/ui/glass-card';
import { OrderBook } from '@/app/components/trading/order-book';
import { TradePanel } from '@/app/components/trading/trade-panel';
import { AttributeFilter } from '@/app/components/trading/attribute-filter';
import {
  CLOBAssetTable,
  SortConfig,
  SortKey,
} from '@/app/components/trading/clob-asset-table';
import { FilterState, applyFilters } from '@/hooks/useAttributeFilters';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { RefreshCw, LayoutGrid, List } from 'lucide-react';

/**
 * Asset class tabs
 */
const ASSET_CLASSES = [
  { id: 'all', label: 'All Assets' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'art', label: 'Art' },
];

/**
 * View mode for the trading interface
 */
type ViewMode = 'full' | 'compact';

/**
 * TradingPage - Full CLOB interface for trading assets
 *
 * Features:
 * - Asset class tabs for filtering
 * - Dynamic attribute filters based on asset class
 * - Order book with bid/ask visualization
 * - Trade panel for placing orders
 * - Sortable asset listing table
 * - Responsive layout
 */
export default function TradingPage() {
  const router = useRouter();
  const { setCurrentUserRole, connected } = useMainProvider();
  const { assets, fetchAssets, isLoading, placeOrder } = useTrade();

  // State
  const [selectedAssetClass, setSelectedAssetClass] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<TokenizedAssetUI | null>(
    null,
  );
  const [filters, setFilters] = useState<FilterState>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Fetch assets when connected
  useEffect(() => {
    if (connected) {
      fetchAssets();
    }
  }, [connected, fetchAssets]);

  // Filter assets by class
  const classFilteredAssets = useMemo(() => {
    if (selectedAssetClass === 'all') return assets;
    return assets.filter((asset) => asset.class === selectedAssetClass);
  }, [assets, selectedAssetClass]);

  // Apply attribute filters
  const filteredAssets = useMemo(() => {
    if (Object.keys(filters).length === 0) return classFilteredAssets;

    return applyFilters(classFilteredAssets, filters, (asset, attributeId) => {
      // Map attribute IDs to asset properties
      switch (attributeId) {
        case 'priceRange':
          return parseFloat(asset.price) || 0;
        case 'verified':
          return true; // All assets are verified for demo
        default:
          return null;
      }
    });
  }, [classFilteredAssets, filters]);

  // Handle sort
  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Handle asset selection
  const handleAssetSelect = useCallback((asset: TokenizedAssetUI) => {
    setSelectedAsset(asset);
  }, []);

  // Handle asset class change
  const handleAssetClassChange = useCallback((classId: string) => {
    setSelectedAssetClass(classId);
    setFilters({}); // Clear filters when changing class
    setSelectedAsset(null);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAssets();
    setIsRefreshing(false);
  }, [fetchAssets]);

  // Handle order placement
  const handlePlaceOrder = useCallback(async (order: any) => {
    // In a real implementation, this would call the trade provider
    console.log('Placing order:', order);
    return true;
  }, []);

  // Handle price click from order book
  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    // This would update the trade panel's price input
    console.log(`Clicked ${side} at ${price}`);
  }, []);

  // Navigate to asset detail
  const handleAssetDetailClick = useCallback(
    (asset: TokenizedAssetUI) => {
      router.push(`/customer/trading/${asset.id}`);
    },
    [router],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading assets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Trading
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trade tokenized real-world assets on the order book
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status="live" label="Live" pulse size="sm" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-muted-foreground',
                  isRefreshing && 'animate-spin',
                )}
              />
            </button>
            <div className="flex rounded-lg bg-glass-bg border border-glass-border p-1">
              <button
                onClick={() => setViewMode('full')}
                className={cn(
                  'p-1.5 rounded',
                  viewMode === 'full'
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground',
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={cn(
                  'p-1.5 rounded',
                  viewMode === 'compact'
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground',
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Asset class tabs */}
        <div className="flex gap-1 p-1 mb-6 rounded-lg bg-glass-bg border border-glass-border overflow-x-auto">
          {ASSET_CLASSES.map((assetClass) => (
            <button
              key={assetClass.id}
              onClick={() => handleAssetClassChange(assetClass.id)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200',
                selectedAssetClass === assetClass.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {assetClass.label}
            </button>
          ))}
        </div>

        {/* Main content grid */}
        {viewMode === 'full' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar - Filters */}
            <div className="lg:col-span-2">
              <AttributeFilter
                assetClass={selectedAssetClass}
                filters={filters}
                onFilterChange={setFilters}
              />
            </div>

            {/* Center - Order book and Asset table */}
            <div className="lg:col-span-7 space-y-6">
              {/* Selected asset info */}
              {selectedAsset && (
                <GlassCard padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-accent">
                          {selectedAsset.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">
                          {selectedAsset.name}
                        </h2>
                        <p className="text-sm text-muted-foreground capitalize">
                          {selectedAsset.class}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-foreground">
                        ${parseFloat(selectedAsset.price).toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleAssetDetailClick(selectedAsset)}
                        className="text-sm text-accent hover:underline"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Order book */}
              {selectedAsset && (
                <OrderBook
                  assetId={selectedAsset.id}
                  basePrice={parseFloat(selectedAsset.price) || 100}
                  maxLevels={8}
                  onPriceClick={handlePriceClick}
                />
              )}

              {/* Asset table */}
              <CLOBAssetTable
                assets={filteredAssets}
                sortConfig={sortConfig}
                onSort={handleSort}
                onAssetSelect={handleAssetSelect}
                selectedAssetId={selectedAsset?.id}
              />
            </div>

            {/* Right sidebar - Trade panel */}
            <div className="lg:col-span-3">
              <div className="sticky top-20">
                <TradePanel
                  asset={selectedAsset}
                  initialPrice={
                    selectedAsset ? parseFloat(selectedAsset.price) : undefined
                  }
                  onPlaceOrder={handlePlaceOrder}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Compact view - just the table */
          <CLOBAssetTable
            assets={filteredAssets}
            sortConfig={sortConfig}
            onSort={handleSort}
            onAssetSelect={(asset) =>
              router.push(`/customer/trading/${asset.id}`)
            }
            selectedAssetId={selectedAsset?.id}
          />
        )}

        {/* No assets message */}
        {assets.length === 0 && !isLoading && (
          <GlassCard className="text-center py-12">
            <p className="text-muted-foreground">
              {connected
                ? 'No tokenized assets available at the moment.'
                : 'Connect your wallet to view available assets.'}
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
