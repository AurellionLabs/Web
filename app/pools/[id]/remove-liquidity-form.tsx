'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export default function RemoveLiquidityForm({ poolId }: { poolId: string }) {
  const [percentage, setPercentage] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove liquidity logic here
    console.log(`Removing ${percentage}% liquidity from pool ${poolId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="percentage">Percentage to Remove</Label>
        <div className="flex items-center space-x-2">
          <Slider
            id="percentage"
            min={0}
            max={100}
            step={1}
            value={[percentage]}
            onValueChange={(value) => setPercentage(value[0])}
          />
          <span>{percentage}%</span>
        </div>
      </div>
      <div>
        <Label>You will receive (estimate):</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="text"
            value={((1000 * percentage) / 100).toFixed(2)}
            readOnly
          />
          <Input
            type="text"
            value={((1000 * percentage) / 100).toFixed(2)}
            readOnly
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        Remove Liquidity
      </Button>
    </form>
  );
}
