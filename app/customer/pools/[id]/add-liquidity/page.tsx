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
    assetPrice: pool ? `1 ${pool.assetName} = $750` : '1 Asset = $750', // Fixed price for demo
    supplyAPY: pool ? `${pool.rewardRate.toFixed(2)}%` : '0%',
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
        // Convert asset amount to USD, then to tokens (assuming 1 token = $1 for demo)
        const assetValue = parseFloat(assetAmount) * 750; // $750 per asset
        setTokenAmount(assetValue.toString());
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
    setAssetAmount('100'); // Realistic max amount for demo
  };

  const isAmountValid = () => {
    try {
      return tokenAmount && parseFloat(tokenAmount) > 0;
    } catch (error) {
      return false;
    }
  };

  const formatAmount = (amount: string) => {
    if (!amount) return '0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading || !pool) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-400 text-lg">Loading pool data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/customer/pools/${params.id}`}>
                <ArrowLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Add Liquidity</h1>
              <p className="text-gray-400 mt-1">{pool.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/customer/pools/${params.id}`}>
              <X className="h-6 w-6" />
            </Link>
          </Button>
        </div>

        {/* Pool Information */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pool Information</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                <HelpCircle className="w-4 h-4" />
                <span>APY: {poolData.supplyAPY}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-gray-400 text-sm">Asset Price</span>
                <div className="text-lg font-semibold">
                  {poolData.assetPrice}
                </div>
              </div>
              <div className="space-y-2 md:text-right">
                <span className="text-gray-400 text-sm">Supply APY</span>
                <div className="text-lg font-semibold text-green-400">
                  {poolData.supplyAPY}
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold">
                  Amount to Supply
                </label>
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="px-3 py-1 text-sm bg-amber-500/20 text-amber-400 rounded-md hover:bg-amber-500/30 transition-colors"
                >
                  MAX
                </button>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {pool.assetName.slice(0, 1)}
                    </span>
                  </div>
                  <span className="font-semibold text-lg">
                    {pool.assetName}
                  </span>
                </div>
                <input
                  type="text"
                  value={assetAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-6 py-4 pr-20 text-right text-2xl font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>

              {validationError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{validationError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Calculated Token Amount */}
          {tokenAmount && (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <div className="space-y-4">
                <label className="text-lg font-semibold">You will stake</label>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                    <span className="font-semibold text-lg">AURA</span>
                  </div>
                  <input
                    type="text"
                    value={formatAmount(tokenAmount)}
                    readOnly
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-6 py-4 pr-20 text-right text-2xl font-medium cursor-not-allowed"
                  />
                </div>

                <div className="text-sm text-gray-400 text-center">
                  Conversion rate: 1 {pool.assetName} = $
                  {formatAmount(tokenAmount)} AURA
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold bg-amber-600 hover:bg-amber-700 text-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isAmountValid() || stakeLoading || loading}
          >
            {stakeLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Adding Liquidity...
              </div>
            ) : (
              'Add Liquidity'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            By adding liquidity, you agree to the pool terms and conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
