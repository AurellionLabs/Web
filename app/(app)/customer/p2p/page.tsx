'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDiamond } from '@/app/providers/diamond.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { cn } from '@/lib/utils';
import {
  TrapButton,
  EvaPanel,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  HexStatCard,
} from '@/app/components/eva/eva-components';
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

  // Compute per-class open offer counts — mirror the same expiry filter used in market detail page
  const classOfferCounts = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const counts: Record<string, number> = {};
    for (const offer of openOffers) {
      // Skip locally expired, settled, or cancelled offers (same logic as filterOffersForMarket)
      const isLocallyExpired = offer.expiresAt > 0 && offer.expiresAt <= nowSec;
      if (isLocallyExpired) continue;
      if (
        offer.status === 'expired' ||
        offer.status === 'settled' ||
        offer.status === 'cancelled'
      )
        continue;

      // Fast path: use pre-resolved assetClass from repository
      let offerClass = offer.assetClass;
      if (!offerClass) {
        offerClass = tokenIdToClass.get(offer.tokenId);
        if (!offerClass) {
          try {
            const normalized = BigInt(offer.tokenId).toString(10);
            offerClass = tokenIdToClass.get(normalized);
          } catch {
            /* ignore */
          }
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
        {/* Decorative top strip */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 mt-6">
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground tracking-[0.15em] uppercase">
                P2P Trading
              </h1>
              <p className="font-mono text-sm text-foreground/40 mt-1 tracking-[0.1em] uppercase">
                Select a market to view and create peer-to-peer offers
              </p>
            </div>
            <LaurelAccent side="right" />
          </div>
          <div className="flex items-center gap-3">
            <TrapButton
              variant="gold"
              size="default"
              onClick={() => router.push('/customer/p2p/create')}
              disabled={!connected}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Offer
              </span>
            </TrapButton>
          </div>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Market Grid */}
        <EvaSectionMarker
          section="Markets"
          label="Asset Classes"
          variant="gold"
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-56 bg-card/40 animate-pulse"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
                }}
              />
            ))}
          </div>
        ) : assetClasses.length === 0 ? (
          <EvaPanel label="No Markets" sysId="MKT-000" status="offline">
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
              <h3 className="font-mono text-lg font-bold text-foreground tracking-[0.15em] uppercase mb-2">
                No Markets Available
              </h3>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.1em]">
                No asset classes have been configured yet.
              </p>
            </div>
          </EvaPanel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assetClasses.map((ac) => {
              const icon = getClassIcon(ac.name);
              const offerCount = offersLoading
                ? '...'
                : String(classOfferCounts[ac.name.toLowerCase()] ?? 0);

              return (
                <Link
                  key={ac.name}
                  href={`/customer/p2p/market/${encodeURIComponent(ac.name)}`}
                  className="group block"
                >
                  <EvaPanel
                    label={ac.name}
                    sysId={`MKT-${ac.name.slice(0, 3).toUpperCase()}`}
                    status="active"
                    className="transition-all duration-300 group-hover:ring-1 group-hover:ring-gold/30"
                  >
                    {/* Icon */}
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className={cn(
                          'w-14 h-14',
                          'bg-gold/10 border border-gold/20',
                          'flex items-center justify-center',
                          'text-2xl',
                          'transition-transform duration-300',
                          'group-hover:scale-110',
                        )}
                        style={{
                          clipPath:
                            'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
                        }}
                      >
                        {typeof icon === 'string' ? icon : icon}
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between font-mono text-sm">
                        <span className="text-foreground/40 flex items-center gap-2 tracking-[0.1em] uppercase">
                          <Handshake className="w-4 h-4" />
                          Open Offers
                        </span>
                        <span className="font-mono font-bold text-gold tabular-nums">
                          {offerCount}
                        </span>
                      </div>

                      <EvaScanLine variant="gold" />

                      <div className="flex items-center justify-between font-mono text-sm">
                        <span className="text-foreground/40 flex items-center gap-2 tracking-[0.1em] uppercase">
                          <BarChart3 className="w-4 h-4" />
                          Asset Types
                        </span>
                        <span className="font-mono font-bold text-foreground tabular-nums">
                          {ac.assetTypeCount}
                        </span>
                      </div>

                      <EvaScanLine variant="gold" />

                      <div className="flex items-center justify-between font-mono text-sm">
                        <span className="text-foreground/40 flex items-center gap-2 tracking-[0.1em] uppercase">
                          <Package className="w-4 h-4" />
                          Total Assets
                        </span>
                        <span className="font-mono font-bold text-foreground tabular-nums">
                          {ac.assetCount}
                        </span>
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div
                      className={cn(
                        'mt-4 pt-3',
                        'flex items-center justify-center',
                        'font-mono text-sm tracking-[0.15em] uppercase',
                        'text-foreground/20',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                      )}
                    >
                      <span className="text-gold font-bold">View Offers →</span>
                    </div>
                  </EvaPanel>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom decorative strip */}
        <div className="mt-8">
          <GreekKeyStrip color="crimson" />
        </div>
      </div>
    </div>
  );
}
