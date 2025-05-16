'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import {
  usePools,
  StakingOperationStatus,
} from '@/app/providers/pools.provider';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { formatUnits } from 'ethers'; // For displaying estimated amounts if needed

export default function RemoveLiquidityForm({ poolId }: { poolId: string }) {
  const [percentage, setPercentage] = useState(100); // Default to 100% as claim is full
  const {
    claimRewards,
    loadingClaimAction,
    selectedPoolDetails,
    fetchPoolDetails, // To get latest pool details if needed
    error,
    userStakeInSelectedPool, // Assuming this state exists and is populated for the user
    userRewardsInSelectedPool, // Assuming this state exists
  } = usePools();
  const { address: walletAddress, connected: isWalletConnected } = useWallet();

  // Fetch pool details if not already the selected one, or to ensure freshness
  useEffect(() => {
    if (poolId && (!selectedPoolDetails || selectedPoolDetails.id !== poolId)) {
      // This component might need to fetch its own details to be robust
      // fetchPoolDetails(poolId);
      // For now, relies on selectedPoolDetails being correct for poolId from parent context
    }
    // Also, if userStakeInSelectedPool/userRewardsInSelectedPool are not specific to selectedPoolDetails,
    // this component would need a way to fetch them for `poolId`.
  }, [poolId, selectedPoolDetails, fetchPoolDetails]);

  const canClaim =
    selectedPoolDetails &&
    selectedPoolDetails.id === poolId &&
    selectedPoolDetails.status === StakingOperationStatus.COMPLETE;

  const isPaid =
    selectedPoolDetails &&
    selectedPoolDetails.id === poolId &&
    selectedPoolDetails.status === StakingOperationStatus.PAID;

  // Estimated values (placeholders, as actual amounts come from contract on claim)
  // These would ideally use userStakeInSelectedPool and userRewardsInSelectedPool if available and reliable
  const estimatedStakeToReceive = userStakeInSelectedPool
    ? parseFloat(
        formatUnits(
          userStakeInSelectedPool,
          selectedPoolDetails?.tokenDecimals || 18,
        ),
      ) *
      (percentage / 100)
    : 0;
  const estimatedRewardsToReceive = userRewardsInSelectedPool
    ? parseFloat(
        formatUnits(
          userRewardsInSelectedPool,
          selectedPoolDetails?.tokenDecimals || 18,
        ),
      ) *
      (percentage / 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWalletConnected) {
      toast.error('Please connect your wallet.');
      return;
    }
    if (!selectedPoolDetails || selectedPoolDetails.id !== poolId) {
      toast.error('Pool details not loaded or mismatched. Please refresh.');
      return;
    }
    const tokenAddress = selectedPoolDetails.token;
    if (!tokenAddress) {
      toast.error('Token address for the pool is missing.');
      return;
    }

    if (isPaid) {
      toast.info('Stake and rewards have already been paid/claimed.');
      return;
    }
    if (selectedPoolDetails.status !== StakingOperationStatus.COMPLETE) {
      toast.warn(
        'Pool is not yet in COMPLETED state to remove liquidity (claim rewards).',
      );
      return;
    }

    // Note: The current IAuStakeService.claimReward does not take an amount or percentage.
    // It implies a full claim of stake + rewards.
    // The percentage slider is for UI indication but the tx will be a full claim.
    toast.info(
      `Attempting to claim full stake and rewards for pool ${poolId}...`,
    );

    try {
      const txReceipt = await claimRewards(poolId, tokenAddress);
      if (txReceipt) {
        toast.success(
          'Successfully claimed stake and rewards! Your balance will update after confirmation.',
        );
        // Optionally refresh pool details and user balances
        // fetchPoolDetails(poolId);
      } else if (!loadingClaimAction && error) {
        toast.error(error.message || 'Failed to claim stake and rewards.');
      } else if (!loadingClaimAction && !txReceipt) {
        toast.error('Claim transaction might have failed or was rejected.');
      }
    } catch (err: any) {
      console.error(`Error claiming stake/rewards for pool ${poolId}:`, err);
      toast.error(err.message || 'An unexpected error occurred.');
    }
  };

  if (isPaid) {
    return (
      <div className="text-center p-4">
        <p>Your stake and rewards for this pool have already been claimed.</p>
        <Button variant="outline" className="mt-2" disabled>
          Already Claimed
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-4 bg-gray-800 rounded-lg"
    >
      <div>
        <Label htmlFor="percentage" className="text-white">
          Percentage to Remove (Full Claim)
        </Label>
        <div className="flex items-center space-x-2 mt-1">
          <Slider
            id="percentage"
            min={0}
            max={100}
            step={1}
            value={[percentage]} // Kept for UI, but action is full claim
            onValueChange={(value) => setPercentage(value[0])} // Allows UI interaction
            disabled={!canClaim || loadingClaimAction || !isWalletConnected} // Disable if not claimable
            className="[&>span:first-child]:bg-amber-500"
          />
          <span className="text-amber-400 w-12 text-right">{percentage}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Note: The contract currently supports claiming your entire staked
          amount and accrued rewards. The percentage is for indicative UI
          purposes only; the transaction will process a full claim.
        </p>
      </div>
      {/* Remove estimated value display if it's confusing, or make it reflect full amount based on 100% */}
      {/* <div className="space-y-2">
        <Label className="text-white">You will receive (estimate for 100% claim):</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="text"
            value={`${(userStakeInSelectedPool ? formatUnits(userStakeInSelectedPool, selectedPoolDetails?.tokenDecimals || 18) : '0.00')} ${selectedPoolDetails?.tokenSymbol || 'Tokens'}`}
            readOnly
            className="bg-gray-700 border-gray-600 text-white"
          />
          <Input
            type="text"
            value={`${(userRewardsInSelectedPool ? formatUnits(userRewardsInSelectedPool, selectedPoolDetails?.tokenDecimals || 18) : '0.00')} ${selectedPoolDetails?.tokenSymbol || 'Tokens'}`}
            readOnly
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div> */}
      <Button
        type="submit"
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600"
        disabled={!canClaim || loadingClaimAction || !isWalletConnected}
      >
        {loadingClaimAction
          ? 'Processing Claim...'
          : 'Claim Full Stake & Rewards'}
      </Button>
      {!isWalletConnected && (
        <p className="text-xs text-red-500 text-center mt-1">
          Connect wallet to claim.
        </p>
      )}
      {isWalletConnected && !canClaim && !isPaid && (
        <p className="text-xs text-yellow-500 text-center mt-1">
          Pool not yet in COMPLETED state for claiming.
        </p>
      )}
    </form>
  );
}
