'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Share2,
  FileText,
  ExternalLink,
  Droplets,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { AnimatedNumber } from '@/app/components/ui/animated-number';
import { TransactionTable } from '@/app/components/ui/transaction-table';
import dynamic from 'next/dynamic';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { Pool, PoolDynamicData, PoolStatus } from '@/domain/pool';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const Chart = dynamic(() => import('./chart'), { ssr: false });

/**
 * StatCard - Pool stat card component
 */
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}) => (
  <GlassCard hover className="relative overflow-hidden">
    <div
      className={cn(
        'absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20',
        iconColor,
      )}
    />
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            'p-2 rounded-lg',
            iconColor.replace('bg-', 'bg-opacity-20 '),
          )}
        >
          <Icon
            className={cn(
              'w-4 h-4',
              iconColor.replace('bg-', 'text-').replace('-500', '-400'),
            )}
          />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {change && (
          <span
            className={cn(
              'text-sm font-medium',
              change.startsWith('+') ? 'text-trading-buy' : 'text-trading-sell',
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  </GlassCard>
);

export default function PoolDetails({ params }: { params: { id: string } }) {
  const { address } = useWallet();
  const {
    selectedPool,
    selectPool,
    getPoolWithDynamicData,
    claimReward,
    unlockReward,
    loadStakeHistory,
    stakeHistory,
    getGroupedStakeHistory,
    loading,
  } = usePoolsProvider();
  const { toast } = useToast();

  const [timeRange, setTimeRange] = useState('1D');
  const [pool, setPool] = useState<Pool | null>(null);
  const [poolDynamics, setPoolDynamics] = useState<PoolDynamicData | null>(
    null,
  );
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [groupedStake, setGroupedStake] = useState<any>();
  const [dailyPercentageChange, setDailyPercentageChange] = useState('0');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load pool data on mount
  useEffect(() => {
    const loadPoolData = async () => {
      try {
        const poolWithDynamics = await getPoolWithDynamicData(params.id);
        if (poolWithDynamics) {
          const {
            progressPercentage,
            timeRemainingSeconds,
            volume24h,
            volumeChangePercentage,
          } = poolWithDynamics;

          setPool({
            id: poolWithDynamics.id,
            name: poolWithDynamics.name,
            description: poolWithDynamics.description,
            assetName: poolWithDynamics.assetName,
            tokenAddress: poolWithDynamics.tokenAddress,
            providerAddress: poolWithDynamics.providerAddress,
            fundingGoal: poolWithDynamics.fundingGoal,
            totalValueLocked: poolWithDynamics.totalValueLocked,
            startDate: poolWithDynamics.startDate,
            durationDays: poolWithDynamics.durationDays,
            rewardRate: poolWithDynamics.rewardRate,
            assetPrice: poolWithDynamics.assetPrice,
            status: poolWithDynamics.status,
            supportingDocuments: poolWithDynamics.supportingDocuments,
          });

          setPoolDynamics({
            progressPercentage,
            timeRemainingSeconds,
            tvl: poolWithDynamics.tvl,
            fundingGoal: poolWithDynamics.fundingGoal,
            reward: poolWithDynamics.rewardRate ?? 0,
            volume24h,
            volumeChangePercentage,
          });
          setDailyPercentageChange(volumeChangePercentage || '+0.0%');
        }
      } catch (error) {
        console.error('Error loading pool data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pool data',
          variant: 'destructive',
        });
      }
    };

    loadPoolData();
  }, [params.id, getPoolWithDynamicData, selectPool]);

  // Load stake history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        await loadStakeHistory(params.id);
        const grouped = await getGroupedStakeHistory(
          params.id,
          timeRange as '1H' | '1D' | '1W' | '1M' | '1Y',
        );
        setGroupedStake(grouped);
      } catch (error) {
        console.error('Error loading stake history:', error);
      }
    };

    loadHistory();
  }, [params.id, loadStakeHistory, getGroupedStakeHistory, timeRange]);

  const getTotalDailyVolume = () => {
    if (!poolDynamics?.volume24h) return '0.00';
    return formatTokenAmount(poolDynamics.volume24h, 18, 2);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const poolWithDynamics = await getPoolWithDynamicData(params.id);
      if (poolWithDynamics) {
        setPool(poolWithDynamics);
        setPoolDynamics({
          progressPercentage: poolWithDynamics.progressPercentage,
          timeRemainingSeconds: poolWithDynamics.timeRemainingSeconds,
          tvl: poolWithDynamics.tvl,
          fundingGoal: poolWithDynamics.fundingGoal,
          reward: poolWithDynamics.rewardRate ?? 0,
          volume24h: poolWithDynamics.volume24h,
          volumeChangePercentage: poolWithDynamics.volumeChangePercentage,
        });
      }
    } catch (error) {
      console.error('Error refreshing pool data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRewardClaim = async () => {
    if (!pool || !address) {
      toast({
        title: 'Error',
        description: 'Pool data not loaded or wallet not connected',
        variant: 'destructive',
      });
      return;
    }

    setIsClaimingReward(true);
    try {
      if (pool.status === PoolStatus.PAID) {
        toast({
          title: 'Info',
          description: 'Rewards have already been paid out',
        });
        return;
      }

      if (pool.status === PoolStatus.COMPLETE) {
        await claimReward(pool.id);
        toast({ title: 'Success', description: 'Reward claimed successfully' });
        return;
      }

      const isProvider =
        pool.providerAddress.toLowerCase() === address.toLowerCase();

      if (isProvider && pool.status === PoolStatus.ACTIVE) {
        await unlockReward(pool.id);
        toast({
          title: 'Success',
          description: 'Reward unlocked successfully',
        });
      } else {
        toast({
          title: 'Info',
          description: 'Pool is not ready for reward claiming',
        });
      }
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim reward',
        variant: 'destructive',
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadgeStatus = (status: PoolStatus) => {
    switch (status) {
      case PoolStatus.PENDING:
        return 'pending';
      case PoolStatus.ACTIVE:
        return 'success';
      case PoolStatus.COMPLETE:
        return 'info';
      case PoolStatus.PAID:
        return 'success';
      default:
        return 'neutral';
    }
  };

  const getStatusText = (status: PoolStatus) => {
    switch (status) {
      case PoolStatus.PENDING:
        return 'Pending';
      case PoolStatus.ACTIVE:
        return 'Active';
      case PoolStatus.COMPLETE:
        return 'Complete';
      case PoolStatus.PAID:
        return 'Paid';
      default:
        return 'Unknown';
    }
  };

  const poolData = {
    name: pool?.name || '',
    description: pool?.description || '',
    supportingDocuments: pool?.supportingDocuments || [],
    tvl: poolDynamics?.tvl
      ? formatTokenAmount(poolDynamics.tvl, 18, 2)
      : '0.00',
    completionPercentage: poolDynamics?.progressPercentage || 0,
    fundingGoal: poolDynamics?.fundingGoal
      ? formatTokenAmount(poolDynamics.fundingGoal, 18, 2)
      : '0.00',
    volume24h: getTotalDailyVolume(),
    volumeChange: dailyPercentageChange,
    token0Balance: pool?.assetName || '',
    lockupPeriod: pool ? pool.startDate + pool.durationDays * 24 * 60 * 60 : 0,
    reward: poolDynamics?.reward ? `${poolDynamics.reward.toFixed(2)}%` : '0%',
    timeRemaining: poolDynamics?.timeRemainingSeconds || 0,
    status: pool ? pool.status : PoolStatus.PENDING,
  };

  if (loading || !pool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading pool details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/pools"
              className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {poolData.name}
                </h1>
                <StatusBadge
                  status={getStatusBadgeStatus(poolData.status)}
                  label={getStatusText(poolData.status)}
                  size="sm"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {poolData.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-muted-foreground',
                  isRefreshing && 'animate-spin',
                )}
              />
            </button>
            <button className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Content - Takes 3 columns */}
          <div className="xl:col-span-3 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Value Locked"
                value={`$${poolData.tvl}`}
                change={poolData.volumeChange}
                icon={Droplets}
                iconColor="bg-accent"
              />
              <StatCard
                title="Volume (24h)"
                value={`$${poolData.volume24h}`}
                change={poolData.volumeChange}
                icon={TrendingUp}
                iconColor="bg-green-500"
              />
              <StatCard
                title="Time Remaining"
                value={formatTime(poolData.timeRemaining)}
                icon={Clock}
                iconColor="bg-blue-500"
              />
              <StatCard
                title="APR"
                value={poolData.reward}
                icon={Zap}
                iconColor="bg-purple-500"
              />
            </div>

            {/* Chart */}
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Pool Activity
                </h2>
                <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay">
                  {['1H', '1D', '1W', '1M'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                        timeRange === range
                          ? 'bg-accent/20 text-accent'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <Chart timeRange={timeRange} groupedStakes={groupedStake} />
            </GlassCard>

            {/* Transactions */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Recent Transactions</GlassCardTitle>
              </GlassCardHeader>
              <TransactionTable poolId={params.id} />
            </GlassCard>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Completion Progress */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Completion Progress
              </h3>
              <div className="space-y-4">
                {parseFloat(poolData.fundingGoal) > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-trading-buy font-semibold">
                        {poolData.completionPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-glass-bg rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-accent to-secondary h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(poolData.completionPercentage, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      ${poolData.tvl} of ${poolData.fundingGoal} raised
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Total Locked
                      </span>
                      <span className="text-accent font-semibold">
                        ${poolData.tvl}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No funding goal set - unlimited capacity
                    </div>
                  </>
                )}
              </div>
            </GlassCard>

            {/* Pool Details */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Pool Details
              </h3>
              <div className="space-y-4">
                {/* Supporting Documents */}
                {poolData.supportingDocuments.length > 0 && (
                  <div className="pb-4 border-b border-glass-border">
                    <span className="text-muted-foreground text-sm block mb-3">
                      Supporting Documents
                    </span>
                    <div className="space-y-2">
                      {poolData.supportingDocuments.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-glass-bg rounded-lg border border-glass-border"
                        >
                          <div className="p-1.5 bg-glass-bg rounded-md">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.ipfsHash ? 'Available' : 'Processing...'}
                            </p>
                          </div>
                          {doc.ipfsHash && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-glass-hover text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => {
                                window.open(
                                  `https://ipfs.io/ipfs/${doc.ipfsHash}`,
                                  '_blank',
                                );
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-glass-border">
                    <span className="text-muted-foreground text-sm">Asset</span>
                    <span className="font-medium text-foreground">
                      {poolData.token0Balance}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-glass-border">
                    <span className="text-muted-foreground text-sm">
                      Funding Goal
                    </span>
                    <span className="font-medium text-foreground">
                      ${poolData.fundingGoal}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-glass-border">
                    <span className="text-muted-foreground text-sm">
                      Current TVL
                    </span>
                    <span className="font-medium text-foreground">
                      ${poolData.tvl}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-glass-border">
                    <span className="text-muted-foreground text-sm">
                      Time Remaining
                    </span>
                    <span className="font-medium text-foreground">
                      {formatTime(poolData.timeRemaining)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground text-sm">
                      Status
                    </span>
                    <StatusBadge
                      status={getStatusBadgeStatus(poolData.status)}
                      label={getStatusText(poolData.status)}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Action Buttons */}
            <div className="space-y-3">
              {pool?.status === PoolStatus.ACTIVE && (
                <GlowButton
                  variant="primary"
                  className="w-full"
                  glow
                  onClick={() => {
                    window.location.href = `/customer/pools/${params.id}/add-liquidity`;
                  }}
                >
                  Add Liquidity
                </GlowButton>
              )}

              {(pool?.status === PoolStatus.COMPLETE ||
                pool?.status === PoolStatus.ACTIVE) && (
                <GlowButton
                  variant="outline"
                  className="w-full"
                  onClick={handleRewardClaim}
                  loading={isClaimingReward}
                >
                  Claim Reward
                </GlowButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
