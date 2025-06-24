'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { Pool } from '@/domain/pool';
import { useWallet } from '@/hooks/useWallet';

const assetSchema = z.object({
  amount: z.string().refine(
    (val) => {
      if (val === '') return true;
      return /^\d+(\.\d+)?$/.test(val) && Number(val) >= 0;
    },
    { message: 'Please enter a valid number' },
  ),
});

export default function AddLiquidity({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { address } = useWallet();
  const { selectedPool, getPoolById, stake, loading } = usePoolsProvider();

  const [assetAmount, setAssetAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [stakeLoading, setStakeLoading] = useState(false);
  const [pool, setPool] = useState<Pool | null>(null);

  // Load pool data
  useEffect(() => {
    const loadPool = async () => {
      try {
        const poolData = await getPoolById(params.id);
        setPool(poolData);
      } catch (error) {
        console.error('Error loading pool:', error);
        toast.error('Failed to load pool data');
      }
    };

    loadPool();
  }, [params.id, getPoolById]);

  const poolData = {
    name: pool?.name || '',
    assetPrice: pool
      ? `1 ${pool.assetName} = $${parseFloat(pool.totalValueLocked) / 1000}`
      : '0',
    supplyAPY: pool ? `${(pool.rewardRate / 100).toFixed(2)}%` : '0%',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValidationError('');

    try {
      assetSchema.parse({ amount: value });
      setAssetAmount(value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors[0].message);
      }
    }
  };

  // Calculate token amount when asset amount changes
  useEffect(() => {
    if (assetAmount && pool) {
      try {
        // Simple calculation - in a real implementation, this would use the actual asset price
        const calculatedTokens = parseFloat(assetAmount) * 100; // Placeholder calculation
        setTokenAmount(calculatedTokens.toString());
      } catch (error) {
        console.error('Error calculating token amount:', error);
        setTokenAmount('');
      }
    } else {
      setTokenAmount('');
    }
  }, [assetAmount, pool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error('Please connect your wallet first.');
      return;
    }

    if (!pool) {
      toast.error('Pool data not loaded.');
      return;
    }

    if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setStakeLoading(true);
    try {
      await stake(pool.id, tokenAmount);
      toast.success('Successfully added liquidity');
      router.push(`/customer/pools/${params.id}`);
    } catch (error: any) {
      if (error.message?.includes('rejected')) {
        toast.error('Transaction rejected by user');
      } else {
        toast.error(error.message || 'Failed to add liquidity');
      }
      setError(error.message || 'An error occurred when adding liquidity');
    } finally {
      setStakeLoading(false);
    }
  };

  const handleSetMax = () => {
    // In a real implementation, this would get the user's actual token balance
    setAssetAmount('1000'); // Placeholder max amount
  };

  const isAmountValid = () => {
    try {
      return tokenAmount && parseFloat(tokenAmount) > 0;
    } catch (error) {
      return false;
    }
  };

  if (loading || !pool) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-400">Loading pool data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/customer/pools/${params.id}`}>
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Supply {pool.name}</h1>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/customer/pools/${params.id}`}>
              <X className="h-6 w-6" />
            </Link>
          </Button>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pool Information</h2>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <HelpCircle className="w-4 h-4" />
                <span>APY: {poolData.supplyAPY}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Asset Price:</span>
                <div className="font-medium">{poolData.assetPrice}</div>
              </div>
              <div>
                <span className="text-gray-400">Supply APY:</span>
                <div className="font-medium text-green-500">
                  {poolData.supplyAPY}
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Amount to Supply</label>
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="text-sm text-amber-500 hover:text-amber-400"
                >
                  MAX
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={assetAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-right text-lg font-medium focus:outline-none focus:border-amber-500"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-600" />
                  <span className="font-medium">{pool.assetName}</span>
                </div>
              </div>

              {validationError && (
                <p className="text-red-500 text-sm">{validationError}</p>
              )}
            </div>
          </div>

          {tokenAmount && (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <div className="space-y-4">
                <label className="text-sm font-medium">You will stake</label>

                <div className="relative">
                  <input
                    type="text"
                    value={tokenAmount}
                    readOnly
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-right text-lg font-medium"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600" />
                    <span className="font-medium">AURA</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium py-3"
            disabled={!isAmountValid() || stakeLoading || loading}
          >
            {stakeLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            By adding liquidity, you agree to the pool terms and conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
