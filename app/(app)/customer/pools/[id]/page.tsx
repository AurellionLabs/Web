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
  EvaPanel,
  HexStatCard,
  TrapButton,
  EvaStatusBadge,
  EvaDataRow,
  EvaProgress,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { ATFieldGauge } from '@/app/components/eva/eva-animations';
import { TransactionTable } from '@/app/components/ui/transaction-table';
import dynamic from 'next/dynamic';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import {
  Pool,
  PoolDynamicData,
  PoolStatus,
  GroupedStakes,
} from '@/domain/pool';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const Chart = dynamic(() => import('./chart'), { ssr: false });

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
  const [groupedStake, setGroupedStake] = useState<GroupedStakes | undefined>();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, getPoolWithDynamicData, selectPool]); // toast excluded: stable callback, including would cause infinite re-render

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

  const getEvaStatus = (
    status: PoolStatus,
  ): 'active' | 'pending' | 'processing' | 'completed' | 'created' => {
    switch (status) {
      case PoolStatus.PENDING:
        return 'pending';
      case PoolStatus.ACTIVE:
        return 'active';
      case PoolStatus.COMPLETE:
        return 'completed';
      case PoolStatus.PAID:
        return 'completed';
      default:
        return 'pending';
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
    tvl: poolDynamics?.tvl || '0',
    completionPercentage: poolDynamics?.progressPercentage || 0,
    fundingGoal: poolDynamics?.fundingGoal || '0',
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
          <RefreshCw className="w-8 h-8 text-gold animate-spin" />
          <span className="font-mono text-sm text-foreground/40 tracking-[0.15em] uppercase">
            Loading pool details...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/pools"
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <ArrowLeft className="w-5 h-5 text-foreground/50" />
            </Link>
            <LaurelAccent side="left" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                  {poolData.name}
                </h1>
                <EvaStatusBadge
                  status={getEvaStatus(poolData.status)}
                  label={getStatusText(poolData.status)}
                />
              </div>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.08em] mt-1">
                {poolData.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 text-foreground/50',
                  isRefreshing && 'animate-spin',
                )}
              />
            </button>
            <button
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <Share2 className="w-4 h-4 text-foreground/50" />
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Content - Takes 3 columns */}
          <div className="xl:col-span-3 space-y-8">
            <EvaSectionMarker section="Pool Metrics" variant="gold" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <HexStatCard
                label="Total Value Locked"
                value={`$${formatTokenAmount(poolData.tvl, 18)}`}
                sub={poolData.volumeChange}
                color="gold"
                powerLevel={Math.min(
                  10,
                  Math.ceil(poolData.completionPercentage / 10),
                )}
              />
              <HexStatCard
                label="Volume (24h)"
                value={`$${formatTokenAmount(poolData.volume24h, 18)}`}
                sub={poolData.volumeChange}
                color="emerald"
                powerLevel={5}
              />
              <HexStatCard
                label="Time Remaining"
                value={formatTime(poolData.timeRemaining)}
                color="crimson"
                powerLevel={Math.min(
                  10,
                  Math.ceil((poolData.timeRemaining / (86400 * 30)) * 10),
                )}
              />
              <HexStatCard
                label="APR"
                value={poolData.reward}
                color="gold"
                powerLevel={7}
              />
            </div>

            <EvaScanLine variant="mixed" />

            {/* Chart */}
            <EvaPanel label="Pool Activity" sysId="CHART-01" status="active">
              <div className="flex items-center justify-end mb-6">
                <div className="flex gap-1 p-1 bg-background/40 border border-border/20">
                  {['1H', '1D', '1W', '1M'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'px-3 py-1.5 font-mono text-xs font-bold tracking-[0.12em] uppercase transition-all duration-200',
                        timeRange === range
                          ? 'bg-gold/15 text-gold'
                          : 'text-foreground/35 hover:text-foreground/60',
                      )}
                      style={{
                        clipPath:
                          'polygon(4px 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 4px 100%, 0 50%)',
                      }}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <Chart timeRange={timeRange} groupedStakes={groupedStake} />
            </EvaPanel>

            {/* Transactions */}
            <EvaPanel label="Recent Transactions" sysId="TXN-01">
              <TransactionTable poolId={params.id} />
            </EvaPanel>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* AT Field Gauge — Pool Capacity */}
            <ATFieldGauge label="Pool Capacity" cellCount={60} />

            {/* Completion Progress */}
            <EvaPanel label="Completion" sysId="PROG-01" accent="gold">
              <div className="space-y-4">
                {parseFloat(poolData.fundingGoal) > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs text-foreground/50 tracking-[0.15em] uppercase">
                        Progress
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                        {poolData.completionPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <EvaProgress
                      value={poolData.completionPercentage}
                      max={100}
                      color={
                        poolData.completionPercentage > 80
                          ? 'emerald'
                          : poolData.completionPercentage > 40
                            ? 'gold'
                            : 'crimson'
                      }
                    />
                    <div className="font-mono text-xs text-foreground/30 text-center tracking-wider">
                      ${formatTokenAmount(poolData.tvl, 18)} of $
                      {formatTokenAmount(poolData.fundingGoal, 18)} raised
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs text-foreground/50 tracking-[0.15em] uppercase">
                        Total Locked
                      </span>
                      <span className="font-mono text-sm font-bold text-gold tabular-nums">
                        ${formatTokenAmount(poolData.tvl, 18)}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-foreground/30 text-center py-2">
                      No funding goal set — unlimited capacity
                    </div>
                  </>
                )}
              </div>
            </EvaPanel>

            <EvaScanLine variant="crimson" />

            {/* Pool Details */}
            <EvaPanel label="Pool Details" sysId="DTL-01">
              <div className="space-y-1">
                {/* Supporting Documents */}
                {poolData.supportingDocuments.length > 0 && (
                  <div className="pb-4 mb-2 border-b border-border/15">
                    <span className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase block mb-3">
                      Supporting Documents
                    </span>
                    <div className="space-y-2">
                      {poolData.supportingDocuments.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-card/40 border border-border/20"
                          style={{
                            clipPath:
                              'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                          }}
                        >
                          <div className="p-1.5 bg-card/60">
                            <FileText className="w-3 h-3 text-foreground/40" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs font-bold text-foreground truncate">
                              {doc.name}
                            </p>
                            <p className="font-mono text-[10px] text-foreground/30">
                              {doc.ipfsHash ? 'Available' : 'Processing...'}
                            </p>
                          </div>
                          {doc.ipfsHash && (
                            <button
                              className="p-1.5 text-foreground/30 hover:text-gold transition-colors"
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

                <EvaDataRow
                  label="Asset"
                  value={poolData.token0Balance}
                  valueColor="gold"
                />
                <EvaDataRow
                  label="Funding Goal"
                  value={`$${formatTokenAmount(poolData.fundingGoal, 18)}`}
                  valueColor="gold"
                />
                <EvaDataRow
                  label="Current TVL"
                  value={`$${formatTokenAmount(poolData.tvl, 18)}`}
                  valueColor="emerald"
                />
                <EvaDataRow
                  label="Time Remaining"
                  value={formatTime(poolData.timeRemaining)}
                  valueColor="crimson"
                />
                <div className="flex items-center justify-between py-2.5">
                  <span className="font-mono text-sm text-foreground/50">
                    Status
                  </span>
                  <EvaStatusBadge
                    status={getEvaStatus(poolData.status)}
                    label={getStatusText(poolData.status)}
                  />
                </div>
              </div>
            </EvaPanel>

            {/* Action Buttons */}
            <div className="space-y-3">
              {pool?.status === PoolStatus.ACTIVE && (
                <TrapButton
                  variant="gold"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    window.location.href = `/customer/pools/${params.id}/add-liquidity`;
                  }}
                >
                  Add Liquidity
                </TrapButton>
              )}

              {(pool?.status === PoolStatus.COMPLETE ||
                pool?.status === PoolStatus.ACTIVE) && (
                <TrapButton
                  variant="crimson"
                  className="w-full"
                  onClick={handleRewardClaim}
                  disabled={isClaimingReward}
                >
                  {isClaimingReward ? 'Claiming...' : 'Claim Reward'}
                </TrapButton>
              )}
            </div>
          </div>
        </div>

        <GreekKeyStrip color="gold" />
      </div>
    </div>
  );
}
