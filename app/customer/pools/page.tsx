'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Plus,
  TrendingUp,
  Droplets,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { PoolTable } from '@/app/components/ui/pool-table';
import { GlassCard } from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { AnimatedNumber } from '@/app/components/ui/animated-number';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { cn } from '@/lib/utils';

/**
 * StatCard - Protocol stat card component
 */
interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  iconColor: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  icon: Icon,
  iconColor,
  description,
}) => (
  <GlassCard hover className="relative overflow-hidden">
    {/* Background glow */}
    <div
      className={cn(
        'absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20',
        iconColor,
      )}
    />

    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div
          className={cn(
            'p-2 rounded-lg',
            iconColor.replace('bg-', 'bg-') + '/10',
          )}
        >
          <Icon className={cn('w-5 h-5', iconColor.replace('bg-', 'text-'))} />
        </div>
        <StatusBadge status="live" size="sm" />
      </div>

      <p className="text-sm text-neutral-400 mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        {prefix && (
          <span className="text-2xl font-semibold text-white">{prefix}</span>
        )}
        <AnimatedNumber
          value={value}
          precision={value >= 1000 ? 0 : 1}
          size="lg"
          className="text-white"
        />
        {suffix && (
          <span className="text-lg text-neutral-400 ml-1">{suffix}</span>
        )}
      </div>
      {description && (
        <p className="text-xs text-neutral-500 mt-2">{description}</p>
      )}
    </div>
  </GlassCard>
);

/**
 * PoolsPage - Yield pools page with protocol aesthetic
 */
export default function PoolsPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { pools, loading, error, loadAllPools } = usePoolsProvider();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  useEffect(() => {
    if (connected) {
      loadAllPools();
    }
  }, [connected, loadAllPools]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllPools();
    setIsRefreshing(false);
  };

  // Mock aggregate stats
  const totalTvl = 12500000;
  const totalVolume = 2340000;
  const avgApy = 12.4;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Yield Pools</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Earn yield on your real-world asset positions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GlowButton
              variant="outline"
              onClick={handleRefresh}
              loading={isRefreshing}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </GlowButton>
            <Link href="/customer/pools/create-pool">
              <GlowButton
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Pool
              </GlowButton>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Value Locked"
            value={totalTvl}
            prefix="$"
            icon={Droplets}
            iconColor="bg-amber-500"
            description="Across all pools"
          />
          <StatCard
            title="24h Volume"
            value={totalVolume}
            prefix="$"
            icon={TrendingUp}
            iconColor="bg-green-500"
            description="+12.5% from yesterday"
          />
          <StatCard
            title="Average APY"
            value={avgApy}
            suffix="%"
            icon={Zap}
            iconColor="bg-purple-500"
            description="Weighted by TVL"
          />
        </div>

        {/* Pools section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Top Pools by TVL
            </h2>
          </div>

          {loading && (
            <GlassCard className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-neutral-400">Loading pools...</span>
              </div>
            </GlassCard>
          )}

          {error && (
            <GlassCard className="border-red-500/30">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Error Loading Pools
              </h3>
              <p className="text-neutral-400 mb-4">{error.message}</p>
              <GlowButton variant="outline" onClick={handleRefresh}>
                Try Again
              </GlowButton>
            </GlassCard>
          )}

          {pools && pools.length > 0 ? (
            <PoolTable pools={pools} />
          ) : (
            !loading &&
            !error && (
              <GlassCard className="text-center py-12">
                <Droplets className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No Pools Available
                </h3>
                <p className="text-neutral-400 mb-6">
                  Be the first to create a liquidity pool
                </p>
                <Link href="/customer/pools/create-pool">
                  <GlowButton
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create Pool
                  </GlowButton>
                </Link>
              </GlassCard>
            )
          )}
        </div>

        {/* Learn more section */}
        <GlassCard hover className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-purple-500/5" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">
                Learn About Liquidity Provision
              </h3>
              <p className="text-sm text-neutral-400 mb-3">
                Understand how to maximize your yields through strategic
                liquidity provision.
              </p>
              <a
                href="#"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm font-medium transition-colors"
              >
                Learn more
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
