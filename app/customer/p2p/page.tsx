'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/app/components/ui/status-badge';
import type { Asset } from '@/domain/shared';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import {
  RefreshCw,
  Plus,
  ShoppingCart,
  Tag,
  Clock,
  User,
  X,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { P2POffer, P2POfferStatus } from '@/domain/p2p';
import { formatUnits } from 'ethers';

/**
 * P2P Trading Page
 *
 * Features:
 * - View all open P2P offers
 * - Filter by buy/sell offers
 * - View my offers
 * - Accept offers from others
 * - Cancel my offers
 * - Create new offers
 */
export default function P2PPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { address } = useWallet();
  const {
    p2pRepository,
    p2pService,
    initialized: diamondInitialized,
  } = useDiamond();
  const { getAssetByTokenId } = usePlatform();
  const router = useRouter();
  const searchParams = useSearchParams();
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [assetMetadataMap, setAssetMetadataMap] = useState<Map<string, Asset>>(
    new Map(),
  );
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [myOffers, setMyOffers] = useState<P2POffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(
    null,
  );

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Load offers
  const loadOffers = useCallback(async () => {
    if (!p2pRepository || !diamondInitialized) return;

    try {
      const openOffers = await p2pRepository.getOpenOffers();
      setOffers(openOffers);

      if (address) {
        const userOffers = await p2pRepository.getUserOffers(address);
        setMyOffers(userOffers);
      }
    } catch (error) {
      console.error('Error loading P2P offers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [p2pRepository, diamondInitialized, address]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Resolve asset metadata for all unique tokenIds from loaded offers
  useEffect(() => {
    const allOffers = [...offers, ...myOffers];
    const uniqueTokenIds = [
      ...new Set(allOffers.map((o) => o.tokenId).filter(Boolean)),
    ];
    // Only resolve tokenIds we don't already have
    const unresolvedIds = uniqueTokenIds.filter(
      (id) => !assetMetadataMap.has(id),
    );
    if (unresolvedIds.length === 0) return;

    console.log('[P2P] Resolving metadata for tokenIds:', unresolvedIds);

    let cancelled = false;
    const resolveMetadata = async () => {
      const results = await Promise.allSettled(
        unresolvedIds.map((id) => getAssetByTokenId(id)),
      );
      if (cancelled) return;

      console.log(
        '[P2P] Metadata resolution results:',
        results.map((r, i) => ({
          tokenId: unresolvedIds[i],
          status: r.status,
          value:
            r.status === 'fulfilled'
              ? (r.value?.name ?? null)
              : String((r as PromiseRejectedResult).reason),
        })),
      );

      setAssetMetadataMap((prev) => {
        const next = new Map(prev);
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            next.set(unresolvedIds[idx], result.value);
          }
        });
        return next;
      });
    };
    resolveMetadata();
    return () => {
      cancelled = true;
    };
  }, [offers, myOffers, getAssetByTokenId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-retry after returning from offer creation
  // RPC nodes may have slight read-after-write delay
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      // Clear the query param from URL without navigation
      router.replace('/customer/p2p', { scroll: false });

      // Retry loading a few times to catch the new offer
      const retryDelays = [2000, 4000, 8000];
      retryDelays.forEach((delay) => {
        const timer = setTimeout(() => {
          loadOffers();
        }, delay);
        // Store last timer for cleanup
        retryTimerRef.current = timer;
      });

      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }
  }, [searchParams, loadOffers, router]);

  // Refresh offers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadOffers();
    setIsRefreshing(false);
  }, [loadOffers]);

  // Accept an offer
  const handleAcceptOffer = useCallback(
    async (offerId: string) => {
      if (!p2pService) return;

      setProcessingOfferId(offerId);
      try {
        await p2pService.acceptOffer(offerId);
        await loadOffers();
      } catch (error) {
        console.error('Error accepting offer:', error);
      } finally {
        setProcessingOfferId(null);
      }
    },
    [p2pService, loadOffers],
  );

  // Cancel an offer
  const handleCancelOffer = useCallback(
    async (offerId: string) => {
      if (!p2pService) return;

      setProcessingOfferId(offerId);
      try {
        await p2pService.cancelOffer(offerId);
        await loadOffers();
      } catch (error) {
        console.error('Error canceling offer:', error);
      } finally {
        setProcessingOfferId(null);
      }
    },
    [p2pService, loadOffers],
  );

  // Filter offers based on type
  const filteredOffers = offers.filter((offer) => {
    if (filterType === 'buy') return !offer.isSellerInitiated;
    if (filterType === 'sell') return offer.isSellerInitiated;
    return true;
  });

  // Check if user is the creator of an offer
  const isMyOffer = (offer: P2POffer) => {
    if (!address) return false;
    return offer.creator.toLowerCase() === address.toLowerCase();
  };

  // Format price for display
  const formatPrice = (price: bigint) => {
    return parseFloat(formatUnits(price, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  // Format expiry time
  const formatExpiry = (expiresAt: number) => {
    if (expiresAt === 0) return 'No expiry';
    const date = new Date(expiresAt * 1000);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Expired';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h left`;
    return date.toLocaleDateString();
  };

  // Truncate address
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Render offer card
  const renderOfferCard = (offer: P2POffer) => {
    const isMine = isMyOffer(offer);
    const isProcessing = processingOfferId === offer.id;
    const assetMeta = assetMetadataMap.get(offer.tokenId);

    return (
      <GlassCard key={offer.id} className="relative overflow-hidden">
        {/* Offer type badge */}
        <div
          className={cn(
            'absolute top-0 right-0 px-3 py-1 text-xs font-medium rounded-bl-lg',
            offer.isSellerInitiated
              ? 'bg-emerald-500/20 text-emerald-400 border-l border-b border-emerald-500/30'
              : 'bg-blue-500/20 text-blue-400 border-l border-b border-blue-500/30',
          )}
        >
          {offer.isSellerInitiated ? 'SELL' : 'BUY'}
        </div>

        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="text-lg flex items-center gap-2">
            {offer.isSellerInitiated ? (
              <Tag className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShoppingCart className="w-4 h-4 text-blue-400" />
            )}
            {assetMeta ? (
              <>
                {assetMeta.name}
                {assetMeta.assetClass && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                    {assetMeta.assetClass}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-block h-5 w-24 bg-neutral-700/50 rounded animate-pulse" />
            )}
          </GlassCardTitle>
          <GlassCardDescription className="text-xs">
            {assetMeta
              ? `Token ID: ${offer.tokenId.slice(0, 10)}...${offer.tokenId.slice(-6)}`
              : truncateAddress(offer.token)}
          </GlassCardDescription>
        </GlassCardHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Asset Attributes */}
          {assetMeta?.attributes && assetMeta.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assetMeta.attributes.map((attr) => (
                <span
                  key={attr.name}
                  className="px-2 py-0.5 rounded-md text-xs bg-neutral-700/60 text-neutral-200"
                >
                  {attr.name
                    .split('_')
                    .filter(Boolean)
                    .map(
                      (w) =>
                        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                    )
                    .join(' ')}
                  : {attr.values.length > 0 ? attr.values.join(', ') : 'N/A'}
                </span>
              ))}
            </div>
          )}

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Quantity</p>
              <p className="text-lg font-semibold text-foreground">
                {offer.quantity.toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              <p className="text-lg font-semibold text-amber-400">
                ${formatPrice(offer.price)}
              </p>
            </div>
          </div>

          {/* Creator and Expiry */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3 h-3" />
              <span>{isMine ? 'You' : truncateAddress(offer.creator)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatExpiry(offer.expiresAt)}</span>
            </div>
          </div>

          {/* Target counterparty */}
          {offer.targetCounterparty && (
            <div className="text-xs text-muted-foreground bg-neutral-800/50 rounded-lg px-3 py-2">
              <span className="text-amber-400">Targeted:</span>{' '}
              {truncateAddress(offer.targetCounterparty)}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2">
            {isMine ? (
              <GlowButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleCancelOffer(offer.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Cancel Offer
              </GlowButton>
            ) : (
              <GlowButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => handleAcceptOffer(offer.id)}
                disabled={isProcessing || !connected}
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {offer.isSellerInitiated ? 'Buy Now' : 'Sell Now'}
              </GlowButton>
            )}
          </div>
        </div>
      </GlassCard>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800/50 flex items-center justify-center">
        <ShoppingCart className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {activeTab === 'my' ? 'No Offers Created' : 'No Open Offers'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {activeTab === 'my'
          ? "You haven't created any P2P offers yet. Create one to start trading!"
          : 'There are no open P2P offers at the moment. Be the first to create one!'}
      </p>
      <GlowButton
        variant="primary"
        onClick={() => router.push('/customer/p2p/create')}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Offer
      </GlowButton>
    </div>
  );

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-64 rounded-xl bg-neutral-800/30 animate-pulse"
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              P2P Trading
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trade directly with other users at fixed prices
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status="live" label="Live" pulse size="sm" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn(
                'p-2 rounded-lg',
                'bg-glass-bg border border-glass-border',
                'hover:border-accent/30 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label="Refresh offers"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-muted-foreground',
                  (isRefreshing || isLoading) && 'animate-spin',
                )}
              />
            </button>
            <GlowButton
              variant="primary"
              size="sm"
              onClick={() => router.push('/customer/p2p/create')}
              disabled={!connected}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </GlowButton>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 bg-neutral-800/50 rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'all'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              All Offers
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'my'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              My Offers
              {myOffers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500/20 rounded-full">
                  {myOffers.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as 'all' | 'buy' | 'sell')
                }
                className="bg-neutral-800/50 border border-glass-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">All Types</option>
                <option value="sell">Sell Offers</option>
                <option value="buy">Buy Offers</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          renderSkeleton()
        ) : activeTab === 'all' ? (
          filteredOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredOffers.map(renderOfferCard)}
            </div>
          ) : (
            renderEmptyState()
          )
        ) : myOffers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myOffers.map(renderOfferCard)}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
}
