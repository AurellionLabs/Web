'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { TransactionTable } from '@/components/ui/transaction-table';
import { PoolBalance } from '@/components/ui/pool-balance';
import { Progress } from '@/components/ui/progress';
import { colors } from '@/lib/constants/colors';
import dynamic from 'next/dynamic';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';
import {
  getDecimal,
  getOperation,
  getStakeHistory,
  GroupedStakes,
  groupStakesByInterval,
  StakeData,
  triggerReward,
  unlockReward,
  walletAddress,
} from '@/dapp-connectors/staking-controller';
import { StakedEvent } from '@/typechain-types/contracts/AuStake';
import { NEXT_PUBLIC_AURA_ADDRESS } from '@/chain-constants';
import { COMPLETE, PAID } from '@/constants';

const Chart = dynamic(() => import('./chart'), { ssr: false });

export default function PoolDetails({ params }: { params: { id: string } }) {
  const { setSelectedPool, selectedPool } = usePoolsProvider();
  const [timeRange, setTimeRange] = useState('1D');
  const [remainingTime, setRemainingTime] = useState(0);
  const [operationProgress, setOperationProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [decimals, setDecimals] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [status, setStatus] = useState('');
  const [isOperationComplete, setIsOperationComplete] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [groupedStake, setGroupedStake] = useState<GroupedStakes | undefined>();
  const [stakeHistory, setStakeHistory] = useState<
    StakedEvent.OutputObject[] | undefined
  >();
  const [dailyPercentageChange, setDailyPercentageChange] = useState('0');
  useEffect(() => {
    const _getDecimal = async () => {
      setDecimals(Number(await getDecimal()));
    };
    _getDecimal();
  }, []);
  const calculateDateValues = async () => {
    const history = await getStakeHistory(params.id);
    if (history) {
      setStakeHistory(history);
    } else console.log('no history');
    const groupedStaked = await groupStakesByInterval(history);
    return groupedStaked;
  };
  const getTotalDailyVolume = (groupedStake?: GroupedStakes) => {
    if (!groupedStake?.daily) return '0.00';
    const today = new Date().toISOString().split('T')[0];
    const value = Number(groupedStake.daily[today] || 0);
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const handleRewardClaim = async () => {
    await getPool();
    if (Number(selectedPool?.operationStatus) == PAID) {
      setIsPaid(true);
      setStatus('Paid');
    }
    if (Number(selectedPool?.operationStatus) == COMPLETE) {
      setIsComplete(true);
      setStatus('Complete');
      await triggerReward(NEXT_PUBLIC_AURA_ADDRESS, params.id);
    }
    if (
      selectedPool &&
      isProvider &&
      Number(selectedPool?.operationStatus) != COMPLETE &&
      Number(selectedPool?.operationStatus) != PAID
    ) {
      await unlockReward(NEXT_PUBLIC_AURA_ADDRESS, selectedPool);
      setIsComplete(true);
      setStatus('Complete');
    }
    try {
      await triggerReward(NEXT_PUBLIC_AURA_ADDRESS, params.id);
    } catch (e) {
      console.error('couldnt claim error with', e);
    }
  };
  const poolData = {
    name: selectedPool?.name || '',
    description: selectedPool?.description || '',
    tvl: `$${selectedPool ? formatEthereumValue(selectedPool.tokenTvl, decimals, 2) : '0'}`,
    completionPercentage:
      selectedPool?.tokenTvl && selectedPool?.fundingGoal
        ? `${(
            (Number(formatEthereumValue(selectedPool.tokenTvl, decimals)) /
              Number(formatEthereumValue(selectedPool.fundingGoal))) *
            100
          ).toFixed(2)}%`
        : '0%',
    fundingGoal: selectedPool?.fundingGoal
      ? `$${formatEthereumValue(selectedPool.fundingGoal, 18, 2)}`
      : '0',
    volume24h: `$${getTotalDailyVolume(groupedStake)}`,
    volumeChange: dailyPercentageChange,
    fees24h: '$87.3K',
    token0Balance: `${selectedPool?.rwaName}`,
    token1Balance: 'Funding',
    lockupPeriod: Number(selectedPool?.deadline) * 24 * 60 * 60 * 1000,
    reward: selectedPool?.reward
      ? `${(Number(selectedPool.reward) / 100).toFixed(2)}%`
      : '0%',
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

  useEffect(() => {
    const getCurrentTimings = () => {
      // First check if we have the required data
      if (!selectedPool?.startDate || !selectedPool?.deadline) {
        console.log('Timing data:', {
          startDate: selectedPool?.startDate,
          deadline: selectedPool?.deadline,
        });
        return {
          progress: 0,
          remainingTime: 0,
        };
      }

      // Get current time in seconds
      const currentTime = Math.floor(Date.now() / 1000);

      // Get start time from the contract
      const startTime = Number(selectedPool.startDate);

      // Convert the deadline (days) to seconds
      // We multiply by 24 hours * 60 minutes * 60 seconds to get total seconds
      const durationInSeconds = Number(selectedPool.deadline) * 24 * 60 * 60;

      // Calculate when the operation ends
      const endTime = startTime + durationInSeconds;

      // Calculate how much time is left (in seconds)
      const remainingTime = Math.max(0, endTime - currentTime);

      // Calculate the progress percentage
      let progress = 0;
      if (currentTime < startTime) {
        // Operation hasn't started yet
        progress = 0;
      } else if (currentTime >= endTime) {
        // Operation is complete
        if (Number(selectedPool.operationStatus) === COMPLETE) {
          setIsOperationComplete(true);
        }
        progress = 100;
      } else {
        // Operation is in progress
        const elapsed = currentTime - startTime;
        progress = (elapsed * 100) / durationInSeconds;
      }

      return {
        progress: Math.min(100, Math.max(0, progress)),
        // Convert remaining seconds to milliseconds for formatTime function
        remainingTime: remainingTime * 1000,
      };
    };

    // Only start the interval if we have the required data
    if (!selectedPool?.startDate || !selectedPool?.deadline) {
      console.error(
        `no deadline ${selectedPool?.deadline} or startdate ${selectedPool?.startDate}`,
      );
      return;
    }

    // Calculate initial values
    const initial = getCurrentTimings();
    setOperationProgress(initial.progress);
    setRemainingTime(initial.remainingTime);

    // Update values every second
    const interval = setInterval(() => {
      const current = getCurrentTimings();
      setOperationProgress(current.progress);
      setRemainingTime(current.remainingTime);

      if (current.progress >= 100) {
        clearInterval(interval);
      }
    }, 1000);

    // Clean up interval when component unmounts
    return () => clearInterval(interval);
  }, [selectedPool]); // We depend on selectedPool changes

  const getPool = async () => {
    const data = await calculateDateValues();
    setGroupedStake(data);
    setSelectedPool(await getOperation(params.id));
    // calculate daily percentage change
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    const todayValue = data?.daily?.[todayKey] ?? 0;
    const yesterdayValue = data?.daily?.[yesterdayKey] ?? 0;

    let percentageChange = 0;
    if (yesterdayValue !== 0) {
      const difference = todayValue - yesterdayValue;
      percentageChange = (difference / yesterdayValue) * 100;
    }
    const percentageChangeStr =
      percentageChange > 0
        ? `+${percentageChange.toFixed(2)}%`
        : percentageChange < 0
          ? `${percentageChange.toFixed(2)}%`
          : `${percentageChange.toFixed(2)}%`;
    setDailyPercentageChange(percentageChangeStr);
  };
  useEffect(() => {
    getPool();
  }, [selectedPool, status]);

  useEffect(() => {
    if (selectedPool) {
      if (Number(selectedPool.operationStatus) == COMPLETE) {
        setIsOperationComplete(true);
        console.log('set status to complete');
        setIsComplete(true);
        setStatus('Complete');
      }

      if (Number(selectedPool.operationStatus) == PAID) {
        setIsPaid(true);
        setStatus('Paid');
      }
    }
  }, [selectedPool]);

  useEffect(() => {
    setIsProvider(walletAddress == selectedPool?.provider);
  }, [isProvider, selectedPool]);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap">
          <Link href="/explore" className="text-gray-400 hover:text-white">
            Explore
          </Link>
          <span className="text-gray-600">/</span>
          <Link
            href="/customer/pools"
            className="text-gray-400 hover:text-white"
          >
            Pools
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{poolData.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden sm:flex"
            >
              <Link href="/customer/pools">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-gray-900" />
                <div className="w-8 h-8 rounded-full bg-red-700 border-2 border-gray-900" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {poolData.name}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="icon" className="sm:hidden">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              className={`bg-[${colors.primary[500]}] hover:bg-[${colors.primary[600]}] flex-grow sm:flex-grow-0`}
            >
              Swap
            </Button>
            <Button variant="default" asChild>
              <Link href={`/customer/pools/${params.id}/add-liquidity`}>
                Add liquidity
              </Link>
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Price and chart */}
            <div
              className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}
            >
              <div className="mb-6">
                <div className="text-2xl sm:text-3xl font-bold mb-1">
                  {poolData.tvl}
                </div>
              </div>
              <div className="h-[200px] sm:h-[300px]">
                <Chart groupedStakes={groupedStake} timeRange={timeRange} />
              </div>
              <div className="flex items-center gap-2 mt-4 overflow-x-auto">
                {['1H', '1D', '1W', '1M', '1Y'].map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="text-sm"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Operation Time */}
            <div
              className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}
            >
              <h2 className="text-lg font-semibold mb-4">Operation Time</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{operationProgress.toFixed(2)}%</span>
                </div>
                <Progress value={operationProgress} className="w-full" />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Time remaining</span>
                  <span>
                    {remainingTime ? formatTime(remainingTime) : 'Loading...'}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleRewardClaim}
                className="w-full mt-4"
                disabled={(!isComplete && !isProvider) || isPaid}
              >
                {isProvider
                  ? isComplete
                    ? status
                    : 'Unlock'
                  : isComplete
                    ? 'Withdraw'
                    : 'Withdraw (Locked)'}
              </Button>
            </div>

            {/* Transactions */}
            <TransactionTable transactions={stakeHistory} />
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <div
              className={`bg-[${colors.background.secondary}] rounded-2xl border border-[${colors.neutral[800]}] p-4 sm:p-6`}
            >
              <h2 className="text-lg font-semibold mb-4">Stats</h2>
              <div className="space-y-6">
                {poolData.description && (
                  <div className="border-b border-[#2D3139] pb-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Description
                    </h3>
                    <p className="text-sm text-gray-200">
                      {poolData.description}
                    </p>
                  </div>
                )}
                <StatCard title="Funding Goal" value={poolData.fundingGoal} />
                <StatCard title="Total TVL" value={poolData.tvl} />
                <PoolBalance
                  poolName={poolData.name}
                  completionPercentage={poolData.completionPercentage}
                />
                <StatCard
                  title="24h volume"
                  value={poolData.volume24h}
                  change={poolData.volumeChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
