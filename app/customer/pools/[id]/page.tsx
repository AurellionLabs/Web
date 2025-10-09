'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Share2,
  FileText,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { StatCard } from '@/app/components/ui/stat-card';
import { TransactionTable } from '@/app/components/ui/transaction-table';
import { PoolBalance } from '@/app/components/ui/pool-balance';
import { Progress } from '@/app/components/ui/progress';
import { colors } from '@/lib/constants/colors';
import dynamic from 'next/dynamic';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { Pool, PoolDynamicData, PoolStatus } from '@/domain/pool';
import { useToast } from '@/hooks/use-toast';
import { WalletConnection } from '@/app/components/ui/wallet-connection';
import { useWallet } from '@/hooks/useWallet';
import { formatWeiToCurrency, formatWeiToEther } from '@/lib/utils';

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
            volume24h,
            volumeChangePercentage,
            ...poolData
          } = poolWithDynamics;
          setPool(poolData);
          setPoolDynamics({
            progressPercentage,
            timeRemainingSeconds,
            tvlFormatted,
            fundingGoalFormatted,
            rewardFormatted,
            volume24h,
            volumeChangePercentage,
          });
          setDailyPercentageChange(volumeChangePercentage || '+0.0%');
          selectPool(poolData);
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
    // Convert wei to ether, then format
    const etherValue = formatWeiToEther(poolDynamics.volume24h);
    const value = parseFloat(etherValue);
    if (isNaN(value)) return '0.00';

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
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
        toast('Rewards have already been paid out');
        return;
      }

      if (pool.status === PoolStatus.COMPLETE) {
        await claimReward(pool.id);
        toast({ title: 'Success', description: 'Reward claimed successfully' });
        return;
      }

      // Check if user is provider
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
    tvl: poolDynamics?.tvlFormatted || '$0',
    completionPercentage: `${poolDynamics?.progressPercentage || 0}%`,
    fundingGoal: poolDynamics?.fundingGoalFormatted || '$0',
    volume24h: `$${getTotalDailyVolume()}`,
    volumeChange: dailyPercentageChange,
    token0Balance: pool?.assetName || '',
    token1Balance: 'Funding',
    lockupPeriod: pool ? pool.startDate + pool.durationDays * 24 * 60 * 60 : 0,
    reward: poolDynamics?.rewardFormatted || '0%',
    timeRemaining: poolDynamics?.timeRemainingSeconds || 0,
    status: pool ? getStatusText(pool.status) : 'Unknown',
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/customer/pools">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{poolData.name}</h1>
              <p className="text-gray-400 mt-1">{poolData.description}</p>
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

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Content - Takes 3 columns */}
          <div className="xl:col-span-3 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <StatCard title="Total Rewards" value={'$ToDo'} />
              <StatCard
                title="APR"
                value={poolData.reward}
                description="Current reward rate"
              />
            </div>

            {/* Chart */}
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
              <Chart timeRange={timeRange} groupedStakes={groupedStake} />
            </div>

            {/* Transactions */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <h2 className="text-xl font-semibold mb-6">
                Recent Transactions
              </h2>
              <TransactionTable poolId={params.id} />
            </div>
          </div>

          {/* Right Sidebar - Takes 1 column */}
          <div className="xl:col-span-1 space-y-6">
            {/* Completion Progress */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold mb-4">
                Completion Progress
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-green-500 font-semibold">
                    {poolData.completionPercentage}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-red-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: poolData.completionPercentage }}
                  />
                </div>
                <div className="text-sm text-gray-400 text-center">
                  {poolData.tvl} of {poolData.fundingGoal} raised
                </div>
              </div>
            </div>

            {/* Pool Details */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Pool Details</h3>
              <div className="space-y-4">
                {/* Description */}
                {poolData.description && (
                  <div className="pb-4 border-b border-zinc-800">
                    <span className="text-gray-400 text-sm block mb-2">
                      Description
                    </span>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {poolData.description}
                    </p>
                  </div>
                )}

                {/* Supporting Documents */}
                {poolData.supportingDocuments.length > 0 && (
                  <div className="pb-4 border-b border-zinc-800">
                    <span className="text-gray-400 text-sm block mb-3">
                      Supporting Documents
                    </span>
                    <div className="space-y-2">
                      {poolData.supportingDocuments.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-zinc-800 rounded-lg"
                        >
                          <div className="flex-shrink-0">
                            <div className="p-1.5 bg-zinc-700 rounded-md">
                              <FileText className="w-3 h-3 text-gray-400" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium text-gray-300 truncate"
                              title={doc.name}
                            >
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.ipfsHash ? 'Available' : 'Processing...'}
                            </p>
                          </div>
                          {doc.ipfsHash && (
                            <div className="flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                                onClick={() => {
                                  // TODO: Open IPFS document
                                  window.open(
                                    `https://ipfs.io/ipfs/${doc.ipfsHash}`,
                                    '_blank',
                                  );
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-b-0">
                    <span className="text-gray-400">Asset</span>
                    <span className="font-medium">
                      {poolData.token0Balance}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-b-0">
                    <span className="text-gray-400">Funding Goal</span>
                    <span className="font-medium">{poolData.fundingGoal}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-b-0">
                    <span className="text-gray-400">Current TVL</span>
                    <span className="font-medium">{poolData.tvl}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-b-0">
                    <span className="text-gray-400">Time Remaining</span>
                    <span className="font-medium">
                      {formatTime(poolData.timeRemaining)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">Status</span>
                    <span
                      className={`font-medium px-3 py-1 text-xs rounded-full ${
                        poolData.status === 'Active'
                          ? 'bg-green-500/20 text-green-400'
                          : poolData.status === 'Complete'
                            ? 'bg-blue-500/20 text-blue-400'
                            : poolData.status === 'Paid'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {poolData.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {pool?.status === PoolStatus.ACTIVE && (
                <Button
                  className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    window.location.href = `/customer/pools/${params.id}/add-liquidity`;
                  }}
                >
                  Add Liquidity
                </Button>
              )}

              {(pool?.status === PoolStatus.COMPLETE ||
                pool?.status === PoolStatus.ACTIVE) && (
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-zinc-700 hover:bg-zinc-800"
                  onClick={handleRewardClaim}
                  disabled={isClaimingReward}
                >
                  {isClaimingReward ? 'Processing...' : 'Claim Reward'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
