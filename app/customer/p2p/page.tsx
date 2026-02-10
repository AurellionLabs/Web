'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePlatform } from '@/app/providers/platform.provider';
import { cn } from '@/lib/utils';
import { GlowButton } from '@/app/components/ui/glow-button';
import {
  Plus,
  TrendingUp,
  Package,
  BarChart3,
  Handshake,
  Activity,
} from 'lucide-react';
import { formatUnits } from 'ethers';

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

/** Format wei volume to a readable USD string */
function formatVolume(weiVolume: string): string {
  if (!weiVolume || weiVolume === '0') return '$0';
  try {
    const num = parseFloat(formatUnits(weiVolume, 18));
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  } catch {
    return '$0';
  }
}

/**
 * P2P Trading Markets Page
 *
 * Market selection grid - choose an asset class before viewing P2P offers.
 * Shows per-market statistics: open offers, trade count, and volume.
 */
export default function P2PPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { assetClasses, isLoading } = usePlatform();
  const router = useRouter();

  // Set user role on mount
  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

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
                        {ac.p2pOpenOfferCount ?? 0}
                      </span>
                    </div>

                    {/* Trades */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Trades
                      </span>
                      <span className="font-mono text-foreground">
                        {ac.p2pTradeCount ?? 0}
                      </span>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        P2P Volume
                      </span>
                      <span className="font-mono text-foreground">
                        {formatVolume(ac.p2pVolume || '0')}
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
