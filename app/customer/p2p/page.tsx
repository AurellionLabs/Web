'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { cn } from '@/lib/utils';
import { GlowButton } from '@/app/components/ui/glow-button';
import { Plus, Package, BarChart3, Handshake } from 'lucide-react';
import type { P2POffer } from '@/domain/p2p';

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

function getClassIcon(className: string): React.ReactNode {
  const key = className.toLowerCase();
  return CLASS_ICONS[key] || <Package className="w-6 h-6" />;
}

/**
 * P2P Trading Markets Page
 *
 * Market selection grid - choose an asset class before viewing P2P offers.
 * Shows per-market statistics: open offers, trade count, and volume.
 */
export default function P2PPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { assetClasses, supportedAssets, isLoading } = usePlatform();
  const { p2pRepository, initialized: diamondInitialized } = useDiamond();
  const router = useRouter();

  const [openOffers, setOpenOffers] = useState<P2POffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Fetch open offers to compute per-class counts
  const loadOffers = useCallback(async () => {
    if (!p2pRepository || !diamondInitialized) return;
    setOffersLoading(true);
    try {
      const offers = await p2pRepository.getOpenOffers();
      setOpenOffers(offers);
    } catch (error) {
      console.error('[P2P Markets] Error loading offers:', error);
    } finally {
      setOffersLoading(false);
    }
  }, [p2pRepository, diamondInitialized]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Build tokenId → assetClass lookup from supportedAssets
  const tokenIdToClass = useMemo(() => {
    const map = new Map<string, string>();
    supportedAssets.forEach((a) => {
      if (a.tokenId && a.assetClass) {
        map.set(a.tokenId, a.assetClass);
        try {
          const normalized = BigInt(a.tokenId).toString(10);
          if (normalized !== a.tokenId) map.set(normalized, a.assetClass);
        } catch {
          /* ignore */
        }
      }
    });
    return map;
  }, [supportedAssets]);

  // Compute per-class open offer counts
  const classOfferCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const offer of openOffers) {
      let offerClass = tokenIdToClass.get(offer.tokenId);
      if (!offerClass) {
        try {
          const normalized = BigInt(offer.tokenId).toString(10);
          offerClass = tokenIdToClass.get(normalized);
        } catch {
          /* ignore */
        }
      }
      if (offerClass) {
        const key = offerClass.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [openOffers, tokenIdToClass]);

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
              Select a market to view and create peer-to-peer offers
            </p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Market Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-xl bg-neutral-800/30 animate-pulse"
              />
            ))}
          </div>
        ) : assetClasses.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Markets Available
            </h3>
            <p className="text-muted-foreground">
              No asset classes have been configured yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assetClasses.map((ac) => {
              const icon = getClassIcon(ac.name);
              return (
                <Link
                  key={ac.name}
                  href={`/customer/p2p/market/${encodeURIComponent(ac.name)}`}
                  className={cn(
                    'group block',
                    'bg-glass-bg backdrop-blur-md',
                    'border border-glass-border',
                    'rounded-xl p-6',
                    'transition-all duration-300 ease-out',
                    'hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
                    'hover:-translate-y-1',
                    'focus:outline-none focus:ring-2 focus:ring-accent/50',
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
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
                    {ac.name}
                  </h3>

                  {/* Stats */}
                  <div className="space-y-2">
                    {/* Open Offers */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Handshake className="w-4 h-4" />
                        Open Offers
                      </span>
                      <span className="font-mono text-foreground">
                        {offersLoading
                          ? '...'
                          : (classOfferCounts[ac.name.toLowerCase()] ?? 0)}
                      </span>
                    </div>

                    {/* Asset Types */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Asset Types
                      </span>
                      <span className="font-mono text-foreground">
                        {ac.assetTypeCount}
                      </span>
                    </div>

                    {/* Total Assets */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Total Assets
                      </span>
                      <span className="font-mono text-foreground">
                        {ac.assetCount}
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
                    <span className="text-accent">View Offers →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
