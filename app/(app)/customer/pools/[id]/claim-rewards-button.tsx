'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { useWallet } from '@/hooks/useWallet';
import { PoolStatus } from '@/domain/pool';
import { Loader2 } from 'lucide-react';

interface ClaimRewardsButtonProps {
  poolId: string;
  poolStatus: PoolStatus;
  onSuccess?: () => void;
}

export default function ClaimRewardsButton({
  poolId,
  poolStatus,
  onSuccess,
}: ClaimRewardsButtonProps) {
  const { address } = useWallet();
  const { claimReward, loading } = usePoolsProvider();
  const [isClaiming, setIsClaiming] = useState(false);

  const isCompleted = poolStatus === PoolStatus.COMPLETE;
  const isPaid = poolStatus === PoolStatus.PAID;

  const handleClaim = async () => {
    if (!address || isPaid || isClaiming || loading) {
      return;
    }

    setIsClaiming(true);
    try {
      await claimReward(poolId);
      onSuccess?.();
    } catch (error) {
      console.error('Error claiming rewards:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (isPaid) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Rewards Claimed
      </Button>
    );
  }

  if (!isCompleted) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Not Eligible
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClaim}
      variant="outline"
      className="w-full"
      disabled={isClaiming || loading}
    >
      {isClaiming || loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Claiming...
        </>
      ) : (
        'Claim Rewards'
      )}
    </Button>
  );
}
