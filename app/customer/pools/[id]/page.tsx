'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { StatCard } from '@/app/components/ui/stat-card';
import { TransactionTable } from '@/app/components/ui/transaction-table';
import { PoolBalance } from '@/app/components/ui/pool-balance';
import { Progress } from '@/app/components/ui/progress';
import { colors } from '@/lib/constants/colors';
import dynamic from 'next/dynamic';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { Pool, PoolDynamicData, PoolStatus } from '@/domain/pool';
import { toast } from 'react-hot-toast';
import { WalletConnection } from '@/app/components/ui/wallet-connection';
import { useWallet } from '@/hooks/useWallet';

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

  const [timeRange, setTimeRange] = useState('1D');
  const [pool, setPool] = useState<Pool | null>(null);
  const [poolDynamics, setPoolDynamics] = useState<PoolDynamicData | null>(
    null,
  );
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [groupedStake, setGroupedStake] = useState<any>();
  const [dailyPercentageChange, setDailyPercentageChange] = useState('0');

  // Load pool data on mount
  useEffect(() => {
    const loadPoolData = async () => {
      try {
        const poolWithDynamics = await getPoolWithDynamicData(params.id);
        if (poolWithDynamics) {
          const {
            progressPercentage,
            timeRemainingSeconds,
            tvlFormatted,
            fundingGoalFormatted,
            rewardFormatted,
            ...poolData
          } = poolWithDynamics;
          setPool(poolData);
          setPoolDynamics({
            progressPercentage,
            timeRemainingSeconds,
            tvlFormatted,
            fundingGoalFormatted,
            rewardFormatted,
          });
          selectPool(poolData);
        }
      } catch (error) {
        console.error('Error loading pool data:', error);
        toast.error('Failed to load pool data');
      }
    };

    loadPoolData();
  }, [params.id, getPoolWithDynamicData, selectPool]);

  // Load stake history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        await loadStakeHistory(params.id);
        const grouped = await getGroupedStakeHistory(params.id, '1D');
        setGroupedStake(grouped);
      } catch (error) {
        console.error('Error loading stake history:', error);
      }
    };

    loadHistory();
  }, [params.id, loadStakeHistory, getGroupedStakeHistory]);

  const getTotalDailyVolume = (groupedStake?: any) => {
    if (!groupedStake?.daily) return '0.00';
    const today = new Date().toISOString().split('T')[0];
    const value = Number(groupedStake.daily[today] || 0);
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleRewardClaim = async () => {
    if (!pool || !address) {
      toast.error('Pool data not loaded or wallet not connected');
      return;
    }

    setIsClaimingReward(true);
    try {
      if (pool.status === PoolStatus.PAID) {
        toast.info('Rewards have already been paid out');
        return;
      }

      if (pool.status === PoolStatus.COMPLETE) {
        await claimReward(pool.id);
        toast.success('Reward claimed successfully');
        return;
      }

      // Check if user is provider
      const isProvider =
        pool.providerAddress.toLowerCase() === address.toLowerCase();

      if (isProvider && pool.status === PoolStatus.ACTIVE) {
        await unlockReward(pool.id);
        toast.success('Reward unlocked successfully');
      } else {
        toast.info('Pool is not ready for reward claiming');
      }
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      toast.error(error.message || 'Failed to claim reward');
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
    tvl: poolDynamics?.tvlFormatted || '$0',
    completionPercentage: `${poolDynamics?.progressPercentage || 0}%`,
    fundingGoal: poolDynamics?.fundingGoalFormatted || '$0',
    volume24h: `$${getTotalDailyVolume(groupedStake)}`,
    volumeChange: dailyPercentageChange,
    fees24h: '$87.3K',
    token0Balance: pool?.assetName || '',
    token1Balance: 'Funding',
    lockupPeriod: pool ? pool.startDate + pool.durationDays * 24 * 60 * 60 : 0,
    reward: poolDynamics?.rewardFormatted || '0%',
    timeRemaining: poolDynamics?.timeRemainingSeconds || 0,
    status: pool ? getStatusText(pool.status) : 'Unknown',
    transactions: [
      {
        time: '2m ago',
        type: 'Remove',
        usdValue: '$6,832.74',
        token0Amount: '0.04274',
        token1Amount: '2,800.14',
      },
      {
        time: '33m ago',
        type: 'Buy WBTC',
        usdValue: '$456.33',
        token0Amount: '0.00484',
        token1Amount: '456.663',
      },
    ],
  };

  if (loading || !pool) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-400">Loading pool details...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/customer/pools">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{poolData.name}</h1>
              <p className="text-gray-400">{poolData.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Value Locked"
            value={poolData.tvl}
            change={poolData.volumeChange}
          />
          <StatCard
            title="Volume (24h)"
            value={poolData.volume24h}
            change={poolData.volumeChange}
          />
          <StatCard title="Fees (24h)" value={poolData.fees24h} />
          <StatCard
            title="APR"
            value={poolData.reward}
            subtitle="Current reward rate"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Pool Activity</h2>
                <div className="flex items-center gap-2">
                  {['1H', '1D', '1W', '1M'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        timeRange === range
                          ? 'bg-amber-500 text-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <Chart timeRange={timeRange} />
            </div>
          </div>

          {/* Pool Balance */}
          <div>
            <PoolBalance
              token0={poolData.token0Balance}
              token1={poolData.token1Balance}
              completionPercentage={poolData.completionPercentage}
              fundingGoal={poolData.fundingGoal}
              tvl={poolData.tvl}
              timeRemaining={formatTime(poolData.timeRemaining)}
              status={poolData.status}
              onAddLiquidity={() => {
                window.location.href = `/customer/pools/${params.id}/add-liquidity`;
              }}
              onClaimReward={handleRewardClaim}
              isClaimingReward={isClaimingReward}
            />
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-6">Recent Transactions</h2>
          <TransactionTable transactions={poolData.transactions} />
        </div>
      </div>
    </div>
  );
}
