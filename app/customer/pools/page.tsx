'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Plus,
  TrendingUp,
  Droplets,
  Zap,
  RefreshCw,
  Shield,
  Coins,
  Filter,
} from 'lucide-react';
import { PoolTable } from '@/app/components/ui/pool-table';
import { GlassCard } from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { AnimatedNumber } from '@/app/components/ui/animated-number';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { useEffect, useState, useMemo } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { cn } from '@/lib/utils';
import { formatTokenAmount } from '@/lib/formatters';
import { Pool } from '@/domain/pool';

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
type FilterType = 'all' | 'insured' | 'collateralized' | 'no-collateral';

export default function PoolsPage() {
  const { setCurrentUserRole, connected } = useMainProvider();
  const { pools, loading, error, loadAllPools } = usePoolsProvider();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  // Filter pools based on active filter
  const filteredPools = useMemo(() => {
    if (!pools) return [];

    switch (activeFilter) {
      case 'insured':
        return pools.filter((pool: Pool) => pool.insurance?.isInsured === true);
      case 'collateralized':
        return pools.filter(
          (pool: Pool) =>
            pool.collateralAmount && parseFloat(pool.collateralAmount) > 0,
        );
      case 'no-collateral':
        return pools.filter(
          (pool: Pool) =>
            !pool.collateralAmount || parseFloat(pool.collateralAmount) === 0,
        );
      default:
        return pools;
    }
  }, [pools, activeFilter]);

  // Count pools by type
  const poolCounts = useMemo(() => {
    if (!pools) return { insured: 0, collateralized: 0, noCollateral: 0 };

    return {
      insured: pools.filter((p: Pool) => p.insurance?.isInsured === true)
        .length,
      collateralized: pools.filter(
        (p: Pool) => p.collateralAmount && parseFloat(p.collateralAmount) > 0,
      ).length,
      noCollateral: pools.filter(
        (p: Pool) =>
          !p.collateralAmount || parseFloat(p.collateralAmount) === 0,
      ).length,
    };
  }, [pools]);

  // Calculate aggregate stats from actual pool data
  const { totalTvl, totalVolume, avgApy } = useMemo(() => {
    if (!pools || pools.length === 0) {
      return {
        totalTvl: 0,
        totalVolume: 0,
        avgApy: 0,
      };
    }

    // Sum total TVL across all pools
    const tvlSum = pools.reduce((sum, pool) => {
      const tvl = parseFloat(
        formatTokenAmount(pool.totalValueLocked || '0', 18, 2),
      );
      return sum + tvl;
    }, 0);

    // Sum 24h volume across all pools
    const volumeSum = pools.reduce((sum, pool) => {
      // Pool has PoolDynamicData merged in from getAllPoolsWithDynamicData
      const volume24h = (pool as any).volume24h || '0';
      const volume = parseFloat(formatTokenAmount(volume24h, 18, 2));
      return sum + volume;
    }, 0);

    // Calculate weighted average APY (weighted by TVL)
    const { weightedApySum, totalWeight } = pools.reduce(
      (acc, pool) => {
        const tvl = parseFloat(
          formatTokenAmount(pool.totalValueLocked || '0', 18, 2),
        );
        const apy = pool.rewardRate || 0;
        return {
          weightedApySum: acc.weightedApySum + apy * tvl,
          totalWeight: acc.totalWeight + tvl,
        };
      },
      { weightedApySum: 0, totalWeight: 0 },
    );

    const weightedAvgApy = totalWeight > 0 ? weightedApySum / totalWeight : 0;

    return {
      totalTvl: tvlSum,
      totalVolume: volumeSum,
      avgApy: weightedAvgApy,
    };
  }, [pools]);

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
            description="Last 24 hours"
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

        {/* Pool Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-400 mr-2">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeFilter === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent',
            )}
          >
            All Pools ({pools?.length || 0})
          </button>
          <button
            onClick={() => setActiveFilter('insured')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
              activeFilter === 'insured'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent',
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Insured ({poolCounts.insured})
          </button>
          <button
            onClick={() => setActiveFilter('collateralized')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
              activeFilter === 'collateralized'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent',
            )}
          >
            <Coins className="w-3.5 h-3.5" />
            Collateralized ({poolCounts.collateralized})
          </button>
          <button
            onClick={() => setActiveFilter('no-collateral')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeFilter === 'no-collateral'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent',
            )}
          >
            No Collateral ({poolCounts.noCollateral})
          </button>
        </div>

        {/* Pools section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {activeFilter === 'all'
                ? 'All Pools'
                : activeFilter === 'insured'
                  ? 'Insured Pools'
                  : activeFilter === 'collateralized'
                    ? 'Collateralized Pools'
                    : 'Pools Without Collateral'}
            </h2>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Clear filter
              </button>
            )}
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

          {filteredPools && filteredPools.length > 0 ? (
            <PoolTable pools={filteredPools} />
          ) : (
            !loading &&
            !error && (
              <GlassCard className="text-center py-12">
                <Droplets className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {activeFilter === 'all'
                    ? 'No Pools Available'
                    : `No ${activeFilter === 'insured' ? 'Insured' : activeFilter === 'collateralized' ? 'Collateralized' : 'Uncollateralized'} Pools`}
                </h3>
                <p className="text-neutral-400 mb-6">
                  {activeFilter === 'all'
                    ? 'Be the first to create a liquidity pool'
                    : 'Try a different filter or create a new pool'}
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
