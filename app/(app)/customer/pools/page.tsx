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
import {
  EvaPanel,
  HexStatCard,
  TrapButton,
  EvaButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { useEffect, useState, useMemo } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { cn } from '@/lib/utils';
import { formatTokenAmount } from '@/lib/formatters';
import { Pool, PoolDynamicData } from '@/domain/pool';

/**
 * PoolsPage - Yield pools page with EVA protocol aesthetic
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
      const volume24h =
        (pool as Pool & Partial<PoolDynamicData>).volume24h || '0';
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
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                Yield Pools
              </h1>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.08em] mt-1">
                Earn yield on your real-world asset positions
              </p>
            </div>
            <LaurelAccent side="right" />
          </div>
          <div className="flex items-center gap-3">
            <EvaStatusBadge status="active" label="LIVE" />
            <TrapButton
              variant="crimson"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn(
                  'w-3.5 h-3.5 inline mr-1.5',
                  isRefreshing && 'animate-spin',
                )}
              />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </TrapButton>
            <Link href="/customer/pools/create-pool">
              <TrapButton variant="gold">
                <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                Create Pool
              </TrapButton>
            </Link>
          </div>
        </div>

        <EvaSectionMarker section="Protocol Stats" variant="gold" />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HexStatCard
            label="Total Value Locked"
            value={`$${totalTvl.toLocaleString(undefined, { maximumFractionDigits: totalTvl >= 1000 ? 0 : 1 })}`}
            sub="Across all pools"
            color="gold"
            powerLevel={
              totalTvl > 0 ? Math.min(10, Math.ceil(totalTvl / 10000) || 1) : 0
            }
          />
          <HexStatCard
            label="24h Volume"
            value={`$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: totalVolume >= 1000 ? 0 : 1 })}`}
            sub="Last 24 hours"
            color="emerald"
            powerLevel={
              totalVolume > 0
                ? Math.min(10, Math.ceil(totalVolume / 5000) || 1)
                : 0
            }
          />
          <HexStatCard
            label="Average APY"
            value={`${avgApy.toFixed(1)}%`}
            sub="Weighted by TVL"
            color="crimson"
            powerLevel={
              avgApy > 0 ? Math.min(10, Math.ceil(avgApy / 3) || 1) : 0
            }
          />
        </div>

        <EvaScanLine variant="mixed" />

        {/* Pool Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase mr-2">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <EvaButton
            variant="gold"
            size="sm"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          >
            All Pools ({pools?.length || 0})
          </EvaButton>
          <EvaButton
            variant="emerald"
            size="sm"
            active={activeFilter === 'insured'}
            onClick={() => setActiveFilter('insured')}
          >
            <Shield className="w-3.5 h-3.5 inline mr-1" />
            Insured ({poolCounts.insured})
          </EvaButton>
          <EvaButton
            variant="gold"
            size="sm"
            active={activeFilter === 'collateralized'}
            onClick={() => setActiveFilter('collateralized')}
          >
            <Coins className="w-3.5 h-3.5 inline mr-1" />
            Collateral ({poolCounts.collateralized})
          </EvaButton>
          <EvaButton
            variant="crimson"
            size="sm"
            active={activeFilter === 'no-collateral'}
            onClick={() => setActiveFilter('no-collateral')}
          >
            No Collateral ({poolCounts.noCollateral})
          </EvaButton>
        </div>

        {/* Pools section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <EvaSectionMarker
              section={
                activeFilter === 'all'
                  ? 'All Pools'
                  : activeFilter === 'insured'
                    ? 'Insured Pools'
                    : activeFilter === 'collateralized'
                      ? 'Collateralized Pools'
                      : 'No Collateral'
              }
              variant="crimson"
            />
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="font-mono text-xs text-foreground/40 hover:text-foreground tracking-[0.1em] uppercase transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {loading && (
            <EvaPanel label="Loading" sysId="POOL-LOAD" status="pending">
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-gold animate-spin" />
                  <span className="font-mono text-sm text-foreground/40 tracking-[0.1em] uppercase">
                    Loading pools...
                  </span>
                </div>
              </div>
            </EvaPanel>
          )}

          {error && (
            <EvaPanel
              label="Error"
              sysId="ERR-01"
              status="warning"
              accent="crimson"
            >
              <h3 className="font-mono text-lg font-bold text-crimson tracking-[0.1em] uppercase mb-2">
                Error Loading Pools
              </h3>
              <p className="font-mono text-sm text-foreground/40 mb-4">
                {error.message}
              </p>
              <TrapButton variant="crimson" size="sm" onClick={handleRefresh}>
                Try Again
              </TrapButton>
            </EvaPanel>
          )}

          {filteredPools && filteredPools.length > 0 ? (
            <PoolTable pools={filteredPools} />
          ) : (
            !loading &&
            !error && (
              <EvaPanel label="No Pools" sysId="POOL-EMPTY" status="pending">
                <div className="text-center py-12">
                  <Droplets className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                  <h3 className="font-mono text-lg font-bold text-foreground tracking-[0.1em] uppercase mb-2">
                    {activeFilter === 'all'
                      ? 'No Pools Available'
                      : `No ${activeFilter === 'insured' ? 'Insured' : activeFilter === 'collateralized' ? 'Collateralized' : 'Uncollateralized'} Pools`}
                  </h3>
                  <p className="font-mono text-sm text-foreground/40 mb-6">
                    {activeFilter === 'all'
                      ? 'Be the first to create a liquidity pool'
                      : 'Try a different filter or create a new pool'}
                  </p>
                  <Link href="/customer/pools/create-pool">
                    <TrapButton variant="gold">
                      <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                      Create Pool
                    </TrapButton>
                  </Link>
                </div>
              </EvaPanel>
            )
          )}
        </div>

        <EvaScanLine variant="gold" />

        {/* Learn more section */}
        <EvaPanel label="Learn" sublabel="Liquidity Provision" sysId="INFO-01">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-foreground tracking-[0.1em] uppercase mb-1">
                Learn About Liquidity Provision
              </h3>
              <p className="font-mono text-sm text-foreground/40 mb-3">
                Understand how to maximize your yields through strategic
                liquidity provision.
              </p>
              <a
                href="#"
                className="text-gold hover:text-gold/80 flex items-center gap-1 font-mono text-sm font-bold tracking-[0.1em] uppercase transition-colors"
              >
                Learn more
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </EvaPanel>

        <GreekKeyStrip color="gold" />
      </div>
    </div>
  );
}
