'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreatePool() {
  const [poolName, setPoolName] = useState('');
  const [assetAddress, setAssetAddress] = useState('');
  const [initialLiquidity, setInitialLiquidity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create pool logic here
    console.log('Creating new pool:', {
      poolName,
      assetAddress,
      initialLiquidity,
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Liquidity Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="poolName">Pool Name</Label>
              <Input
                type="text"
                id="poolName"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="assetAddress">Asset Address</Label>
              <Input
                type="text"
                id="assetAddress"
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="initialLiquidity">Initial Liquidity</Label>
              <Input
                type="number"
                id="initialLiquidity"
                value={initialLiquidity}
                onChange={(e) => setInitialLiquidity(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Create Pool
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
