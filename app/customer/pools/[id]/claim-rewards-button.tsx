'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';

export default function ClaimRewardsButton({ poolId }: { poolId: string }) {
  const handleClaim = () => {
    // Claim rewards logic here
    console.log(`Claiming rewards from pool ${poolId}`);
  };

  return (
    <Button onClick={handleClaim} variant="outline" className="w-full">
      Claim Rewards
    </Button>
  );
}
