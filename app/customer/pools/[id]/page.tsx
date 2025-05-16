'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { StatCard } from '@/app/components/ui/stat-card';
import { TransactionTable } from '@/app/components/ui/transaction-table';
import { Progress } from '@/app/components/ui/progress';
import { colors } from '@/lib/constants/colors';
import dynamic from 'next/dynamic';
import {
  usePools,
  StakingOperationStatus,
  StakingOperation,
} from '@/app/providers/pools.provider';
import { useWallet } from '@/hooks/useWallet';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';
import {
  getStakeHistory,
  GroupedStakes,
  groupStakesByInterval,
} from '@/dapp-connectors/staking-controller';
import { StakedEvent } from '@/typechain-types/contracts/AuStake';
import { toast } from 'sonner';

const Chart = dynamic(() => import('./chart'), { ssr: false });

const getDecimal = async (tokenAddress?: string): Promise<number> => {
  console.warn(
    '[PoolDetailsPage] getDecimal utility used as placeholder. Implement actual decimal fetching.',
    tokenAddress,
  );
  return 18;
};

export default function PoolDetails({ params }: { params: { id: string } }) {
  const {
    selectedPoolDetails,
    fetchPoolDetails,
    loadingSelectedPool,
    error: providerError,
    claimRewards,
    unlockOperationRewards,
    loadingClaimAction,
    loadingUnlockRewards,
  } = usePools();
  const { address: walletAddress, connected: isWalletConnected } = useWallet();

  const [remainingTime, setRemainingTime] = useState(0);
  const [operationProgress, setOperationProgress] = useState(0);
  const [decimals, setDecimals] = useState(18);
  const [isProvider, setIsProvider] = useState(false);
  const [groupedStake, setGroupedStake] = useState<GroupedStakes | undefined>();
  const [stakeHistory, setStakeHistory] = useState<
    StakedEvent.OutputObject[] | undefined
  >();
  const [dailyPercentageChange, setDailyPercentageChange] = useState('0');

  const operationId = params.id;
  const tokenAddress = selectedPoolDetails?.token;

  const currentPoolStatus = selectedPoolDetails?.status;
  const operationIsInactive =
    currentPoolStatus === StakingOperationStatus.INACTIVE;
  const operationIsActive = currentPoolStatus === StakingOperationStatus.ACTIVE;
  const operationIsComplete =
    currentPoolStatus === StakingOperationStatus.COMPLETE;
  const operationIsPaid = currentPoolStatus === StakingOperationStatus.PAID;

  const loadPoolData = useCallback(async () => {
    if (operationId) {
      console.log('[PoolDetailsPage] Fetching pool details for:', operationId);
      await fetchPoolDetails(operationId);
    }
  }, [operationId, fetchPoolDetails]);

  useEffect(() => {
    loadPoolData();
  }, [loadPoolData]);

  useEffect(() => {
    if (selectedPoolDetails && walletAddress) {
      setIsProvider(selectedPoolDetails.provider === walletAddress);
    } else {
      setIsProvider(false);
    }
  }, [selectedPoolDetails, walletAddress]);

  useEffect(() => {
    const fetchTokenDecimals = async () => {
      if (selectedPoolDetails?.token) {
        try {
          const fetchedDecimals = await getDecimal(selectedPoolDetails.token);
          setDecimals(fetchedDecimals);
        } catch (err) {
          console.error('Error fetching token decimals:', err);
          setDecimals(18);
        }
      }
    };
    if (selectedPoolDetails) {
      fetchTokenDecimals();
    }
  }, [selectedPoolDetails]);

  const calculateDateValues = useCallback(async () => {
    if (!operationId) return;
    try {
      const history = await getStakeHistory(operationId);
      if (history) {
        setStakeHistory(history);
        const grouped = await groupStakesByInterval(history);
        setGroupedStake(grouped);
        return grouped;
      }
    } catch (error) {
      console.error('Error in calculateDateValues:', error);
    }
    return undefined;
  }, [operationId]);

  useEffect(() => {
    if (selectedPoolDetails) {
      calculateDateValues();
    }
  }, [selectedPoolDetails, calculateDateValues]);

  const handleRefresh = () => {
    console.log('[PoolDetailsPage] Refreshing data...');
    loadPoolData();
    calculateDateValues();
  };

  const handleRewardAction = async () => {
    if (
      !isWalletConnected ||
      !walletAddress ||
      !selectedPoolDetails ||
      !tokenAddress
    ) {
      toast.error('Wallet not connected or missing required pool information.');
      return;
    }

    if (operationIsPaid) {
      toast.info('Rewards for this operation have already been paid.');
      return;
    }

    try {
      let txReceipt;
      if (isProvider && (operationIsActive || operationIsInactive)) {
        toast.info('Attempting to unlock rewards as provider...');
        txReceipt = await unlockOperationRewards(operationId, tokenAddress);
        if (txReceipt) {
          toast.success(
            'Rewards unlocked successfully! Pool state may take a moment to update.',
          );
        }
      } else if (operationIsComplete) {
        toast.info('Attempting to claim rewards...');
        txReceipt = await claimRewards(operationId, tokenAddress);
        if (txReceipt) {
          toast.success(
            'Rewards claimed successfully! Your balance will update after confirmation.',
          );
        }
      } else {
        toast.warning(
          'Pool is not in a state for reward claiming or unlocking currently.',
        );
        return;
      }

      if (txReceipt) {
        setTimeout(() => {
          loadPoolData();
          calculateDateValues();
        }, 2000);
      } else if (!loadingClaimAction && !loadingUnlockRewards) {
        toast.error('Reward action failed. Please check console or try again.');
      }
    } catch (error: any) {
      console.error('Error during reward action:', error);
      toast.error(
        error.message || 'An error occurred during the reward action.',
      );
    }
  };

  useEffect(() => {
    const getCurrentTimings = () => {
      if (!selectedPoolDetails?.startDate || !selectedPoolDetails?.deadline) {
        return { progress: 0, remainingTime: 0 };
      }
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = Number(selectedPoolDetails.startDate);
      const endTime = Number(selectedPoolDetails.deadline);

      if (startTime === 0 || endTime === 0 || startTime >= endTime) {
        setOperationProgress(currentTime >= endTime ? 100 : 0);
        setRemainingTime(0);
        return;
      }

      const durationInSeconds = endTime - startTime;
      let progress = 0;
      if (currentTime < startTime) {
        progress = 0;
      } else if (currentTime >= endTime) {
        progress = 100;
      } else {
        const elapsed = currentTime - startTime;
        progress = (elapsed * 100) / durationInSeconds;
      }
      const newProgress = Math.min(100, Math.max(0, progress));
      const newRemainingTime = Math.max(0, endTime - currentTime) * 1000;

      setOperationProgress(newProgress);
      setRemainingTime(newRemainingTime);
    };

    if (!selectedPoolDetails?.startDate || !selectedPoolDetails?.deadline) {
      setOperationProgress(0);
      setRemainingTime(0);
      return;
    }

    getCurrentTimings();

    const interval = setInterval(getCurrentTimings, 1000);
    return () => clearInterval(interval);
  }, [selectedPoolDetails]);

  const formatTime = (milliseconds: number) => {
    if (milliseconds <= 0) return '00d 00h 00m 00s';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const getCompletionPercentage = (
    tvlWei: bigint | undefined,
    goalWei: bigint | undefined,
  ): string => {
    if (!tvlWei || !goalWei || goalWei === BigInt(0)) return '0.00%';
    try {
      const percentage = (tvlWei * BigInt(10000)) / goalWei;
      return `${(Number(percentage) / 100).toFixed(2)}%`;
    } catch (error) {
      console.error('Error calculating completion percentage:', error);
      return '0.00%';
    }
  };

  const getTotalDailyVolume = (groupedStakes?: GroupedStakes) => {
    if (!groupedStakes?.daily) return '0.00';
    const today = new Date().toISOString().split('T')[0];
    const dailyVolumeInWei = groupedStakes.daily[today] || BigInt(0);
    const value = Number(groupedStakes.daily[today] || 0);
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const poolData = selectedPoolDetails
    ? {
        name: selectedPoolDetails.name || 'Pool Name N/A',
        description: selectedPoolDetails.description || 'No description.',
        tvl: `$${formatEthereumValue(selectedPoolDetails.currentFunding || BigInt(0), decimals, 2)}`,
        completionPercentage: getCompletionPercentage(
          selectedPoolDetails.currentFunding,
          selectedPoolDetails.fundingGoal,
        ),
        fundingGoal: `$${formatEthereumValue(selectedPoolDetails.fundingGoal || BigInt(0), decimals, 2)}`,
        volume24h: `$${getTotalDailyVolume(groupedStake)}`,
        volumeChange: dailyPercentageChange,
        fees24h: '$0.00',
        rwaName: selectedPoolDetails.rwaName || 'RWA Name N/A',
        lockupPeriod: remainingTime,
        rewardAPY: selectedPoolDetails.reward
          ? `${(Number(selectedPoolDetails.reward) / 100).toFixed(2)}%`
          : '0.00%',
        transactions:
          stakeHistory?.slice(0, 5).map((event: StakedEvent.OutputObject) => ({
            time: new Date(Number(event.timestamp) * 1000).toLocaleString(),
            type:
              event.user === selectedPoolDetails.provider
                ? 'Provide (Initial?)'
                : 'Stake',
            usdValue: 'N/A',
            token0Amount: formatEthereumValue(
              event.amount,
              decimals,
              Math.min(decimals, 6),
            ),
            token1Amount:
              event.user.substring(0, 6) +
              '...' +
              event.user.substring(event.user.length - 4),
          })) || [],
        statusText: operationIsPaid
          ? 'Paid'
          : operationIsComplete
            ? 'Complete'
            : operationIsActive
              ? 'Active'
              : operationIsInactive
                ? 'Inactive'
                : 'Unknown',
        tokenAddress: selectedPoolDetails.token,
        providerAddress: selectedPoolDetails.provider,
        startDate: selectedPoolDetails.startDate
          ? new Date(
              Number(selectedPoolDetails.startDate) * 1000,
            ).toLocaleString()
          : 'N/A',
        deadlineDate: selectedPoolDetails.deadline
          ? new Date(
              Number(selectedPoolDetails.deadline) * 1000,
            ).toLocaleString()
          : 'N/A',
        currentFundingNum: selectedPoolDetails.currentFunding || BigInt(0),
        fundingGoalNum: selectedPoolDetails.fundingGoal || BigInt(0),
      }
    : null;

  if (loadingSelectedPool && !selectedPoolDetails) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading pool details...
      </div>
    );
  }

  if (providerError && !selectedPoolDetails) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p>Error loading pool: {providerError.message}</p>
        <Button onClick={handleRefresh} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!selectedPoolDetails || !poolData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Pool <code>{operationId}</code> not found or data is currently
        unavailable. Please try refreshing.
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/customer/pools"
            className="inline-flex items-center text-sm text-amber-500 hover:text-amber-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pools
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">{poolData.name}</h1>
            <p className="text-gray-400 max-w-2xl">{poolData.description}</p>
            <div className="mt-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${operationIsActive ? 'bg-green-500/20 text-green-400' : operationIsComplete ? 'bg-blue-500/20 text-blue-400' : operationIsPaid ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}
              >
                Status: {poolData.statusText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              aria-label="Refresh data"
              disabled={loadingSelectedPool}
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingSelectedPool ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button variant="outline" size="icon" aria-label="Share pool">
              <Share2 className="h-4 w-4" />
            </Button>
            {operationIsActive && (
              <Button
                asChild
                className={`bg-amber-500 hover:bg-[${colors.primary[600]}]`}
              >
                <Link href={`/customer/pools/${operationId}/add-liquidity`}>
                  Add Liquidity
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Value Locked (TVL)" value={poolData.tvl} />
          <StatCard
            title="Funding Goal"
            value={poolData.fundingGoal}
            percentage={poolData.completionPercentage}
          />
          <StatCard
            title="24h Volume"
            value={poolData.volume24h}
            change={poolData.volumeChange}
          />
          <StatCard title="Reward APY" value={poolData.rewardAPY} />
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Pool Duration</h3>
          <Progress
            value={operationProgress}
            className="w-full bg-gray-700"
            indicatorClassName="bg-amber-500"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>Start: {poolData.startDate}</span>
            <span>Ends: {poolData.deadlineDate}</span>
          </div>
          <p className="text-sm text-center mt-1 text-gray-300">
            Time Remaining: {formatTime(remainingTime)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Pool Activity Chart</h2>
              </div>
              <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                <p className="text-gray-500">
                  Chart Placeholder (Integration needed)
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Recent Staking Transactions
              </h2>
              {poolData.transactions.length > 0 ? (
                <TransactionTable transactions={poolData.transactions} />
              ) : (
                <p className="text-gray-500">
                  No staking transactions recorded yet.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Your Position
              </h3>
              <div className="space-y-2 text-gray-300">
                <p>
                  Staked Amount:{' '}
                  <span className="font-medium text-white">
                    {poolData.rwaName}
                  </span>{' '}
                  {poolData.rwaName}
                </p>
                <p>
                  Claimable Rewards:{' '}
                  <span className="font-medium text-white">
                    {poolData.rwaName}
                  </span>{' '}
                  {poolData.rwaName}
                </p>
              </div>
              {!isWalletConnected && (
                <p className="text-sm text-amber-400 mt-3">
                  Connect your wallet to see your position.
                </p>
              )}
            </div>

            {isWalletConnected &&
              (operationIsComplete ||
                (isProvider && (operationIsActive || operationIsInactive))) &&
              !operationIsPaid && (
                <Button
                  onClick={handleRewardAction}
                  disabled={loadingClaimAction || loadingUnlockRewards}
                  className={`w-full ${isProvider && (operationIsActive || operationIsInactive) ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {isProvider && (operationIsActive || operationIsInactive)
                    ? loadingUnlockRewards
                      ? 'Unlocking Rewards...'
                      : 'Unlock Rewards (Provider)'
                    : loadingClaimAction
                      ? 'Claiming Rewards...'
                      : 'Claim Rewards'}
                </Button>
              )}
            {operationIsPaid && (
              <Button disabled className="w-full bg-gray-600">
                Rewards Already Paid
              </Button>
            )}
            {!isWalletConnected && operationIsActive && (
              <p className="text-sm text-center text-amber-400">
                Connect wallet to interact with the pool.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
