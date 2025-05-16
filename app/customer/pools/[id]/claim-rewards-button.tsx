'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  usePools,
  StakingOperationStatus,
} from '@/app/providers/pools.provider';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

export default function ClaimRewardsButton({ poolId }: { poolId: string }) {
  const {
    claimRewards,
    loadingClaimAction,
    selectedPoolDetails, // Assumes this is for the current poolId if button is on detail page
    fetchPoolDetails,
    error,
  } = usePools();
  const { address: walletAddress, connected: isWalletConnected } = useWallet();

  // If this button can be used outside a context where selectedPoolDetails is already for poolId,
  // it would need its own useEffect to fetchPoolDetails(poolId) and use its own local pool data.
  // For now, we assume selectedPoolDetails is relevant or will become relevant.

  const canClaim =
    selectedPoolDetails &&
    selectedPoolDetails.id === poolId &&
    selectedPoolDetails.status === StakingOperationStatus.COMPLETE;

  const isPaid =
    selectedPoolDetails &&
    selectedPoolDetails.id === poolId &&
    selectedPoolDetails.status === StakingOperationStatus.PAID;

  // Effect to fetch details if selectedPool is not for this specific poolId
  // This makes the button a bit more robust if selectedPoolDetails is not yet set for this ID.
  useEffect(() => {
    if (poolId && (!selectedPoolDetails || selectedPoolDetails.id !== poolId)) {
      // console.log(`[ClaimRewardsButton] Fetching details for ${poolId} as selectedPool is different or null.`);
      // fetchPoolDetails(poolId); // This might trigger too often if not careful, or if poolId changes.
      // Better to ensure parent sets up selectedPoolDetails, or this button takes full operation object.
      // For now, relies on parent context or the check in handleClaim.
    }
  }, [poolId, selectedPoolDetails, fetchPoolDetails]);

  const handleClaim = async () => {
    if (!isWalletConnected) {
      toast.error('Please connect your wallet to claim rewards.');
      return;
    }
    if (!selectedPoolDetails || selectedPoolDetails.id !== poolId) {
      toast.error(
        'Pool details not loaded or mismatched for this button. Please refresh.',
      );
      // Attempt to fetch details for this specific pool if not available
      // await fetchPoolDetails(poolId); // This makes the button async and potentially slow.
      // It's better if the parent component ensures selectedPoolDetails is up-to-date.
      return;
    }

    const tokenAddress = selectedPoolDetails.token;
    if (!tokenAddress) {
      toast.error('Token address for the pool is missing.');
      return;
    }

    if (selectedPoolDetails.status === StakingOperationStatus.PAID) {
      toast.info('Rewards have already been paid for this operation.');
      return;
    }

    if (selectedPoolDetails.status !== StakingOperationStatus.COMPLETE) {
      toast.warn('Pool is not yet in COMPLETED state for claiming rewards.');
      return;
    }

    try {
      toast.info('Attempting to claim rewards...');
      const txReceipt = await claimRewards(poolId, tokenAddress);
      if (txReceipt) {
        toast.success(
          'Rewards claimed successfully! Balance will update after confirmation.',
        );
        // Optionally, trigger a refresh of pool data or user balances
        // fetchPoolDetails(poolId); // Re-fetch to update status to PAID
      } else if (!loadingClaimAction && error) {
        // Check error from provider
        toast.error(error.message || 'Failed to claim rewards.');
      } else if (!loadingClaimAction && !txReceipt) {
        toast.error(
          'Claim rewards transaction might have failed or was rejected.',
        );
      }
    } catch (err: any) {
      console.error(`Error claiming rewards for pool ${poolId}:`, err);
      toast.error(err.message || 'An unexpected error occurred during claim.');
    }
  };

  if (isPaid) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Rewards Paid
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClaim}
      variant="outline"
      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500"
      disabled={loadingClaimAction || !canClaim || !isWalletConnected}
    >
      {loadingClaimAction ? 'Claiming...' : 'Claim Rewards'}
    </Button>
  );
}
