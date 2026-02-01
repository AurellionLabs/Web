'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, X, Info, Droplets } from 'lucide-react';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { usePoolsProvider } from '@/app/providers/pools.provider';
import { Pool } from '@/domain/pool';
import { useWallet } from '@/hooks/useWallet';
import { formatTokenAmount } from '@/lib/formatters';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const assetSchema = z.object({
  amount: z.string().refine(
    (val) => {
      if (val === '') return true;
      return /^\d+(\.\d+)?$/.test(val) && Number(val) >= 0;
    },
    { message: 'Please enter a valid number' },
  ),
});

// Platform fee configuration
const PLATFORM_FEE_PERCENTAGE = 1; // 1%

export default function AddLiquidity({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { address } = useWallet();
  const { selectedPool, getPoolById, stake, loading } = usePoolsProvider();
  const { toast } = useToast();

  const [assetAmount, setAssetAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
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
        toast({
          title: 'Error',
          description: 'Failed to load pool data',
          variant: 'destructive',
        });
      }
    };

    loadPool();
  }, [params.id, getPoolById]);

  const poolData = {
    name: pool?.name || '',
    assetPrice: pool
      ? `1 ${pool.assetName} = $${formatTokenAmount(pool.assetPrice, 18, 2)}`
      : '1 Asset = $0',
    supplyAPY: pool ? `${pool.rewardRate?.toFixed(2) || '0.00'}%` : '0%',
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

  // Calculate amounts when asset amount changes
  useEffect(() => {
    if (assetAmount && pool) {
      try {
        // assetPrice is stored as wei (18 decimals), convert to USD for calculation
        const assetPriceRaw = parseFloat(pool.assetPrice);
        // Handle case where assetPrice is already in human-readable format (not wei)
        // If assetPrice is very large (> 1e10), it's likely in wei, otherwise it's in USD
        const assetPriceUsd =
          assetPriceRaw > 1e10 ? assetPriceRaw / 1e18 : assetPriceRaw;

        const inputAmount = parseFloat(assetAmount);

        // Validate inputs
        if (
          isNaN(inputAmount) ||
          isNaN(assetPriceUsd) ||
          !isFinite(inputAmount) ||
          !isFinite(assetPriceUsd)
        ) {
          setTokenAmount('');
          setPlatformFee('');
          setTotalAmount('');
          return;
        }

        const assetValue = inputAmount * assetPriceUsd;
        const feeAmount = assetValue * (PLATFORM_FEE_PERCENTAGE / 100);
        const total = assetValue + feeAmount;

        // Ensure we don't produce scientific notation - use toFixed for small numbers
        // Store in USD (no decimals) - the stake function will handle wei conversion
        setTokenAmount(assetValue < 0.01 ? '0' : assetValue.toFixed(6));
        setPlatformFee(feeAmount < 0.01 ? '0' : feeAmount.toFixed(6));
        setTotalAmount(total < 0.01 ? '0' : total.toFixed(6));
      } catch (error) {
        console.error('Error calculating amounts:', error);
        setTokenAmount('');
        setPlatformFee('');
        setTotalAmount('');
      }
    } else {
      setTokenAmount('');
      setPlatformFee('');
      setTotalAmount('');
    }
  }, [assetAmount, pool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }

    if (!pool) {
      toast({
        title: 'Error',
        description: 'Pool data not loaded.',
        variant: 'destructive',
      });
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    setStakeLoading(true);
    try {
      await stake(pool.id, totalAmount);
      toast({ title: 'Success', description: 'Successfully added liquidity' });
      router.push(`/customer/pools/${params.id}`);
    } catch (error: any) {
      if (error.message?.includes('rejected')) {
        toast({
          title: 'Error',
          description: 'Transaction rejected by user',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to add liquidity',
          variant: 'destructive',
        });
      }
      setError(error.message || 'An error occurred when adding liquidity');
    } finally {
      setStakeLoading(false);
    }
  };

  const isAmountValid = () => {
    try {
      return totalAmount && parseFloat(totalAmount) > 0;
    } catch (error) {
      return false;
    }
  };

  if (loading || !pool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading pool data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/customer/pools/${params.id}`}
              className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Add Liquidity
              </h1>
              <p className="text-sm text-muted-foreground">{pool.name}</p>
            </div>
          </div>
          <Link
            href={`/customer/pools/${params.id}`}
            className="p-2 rounded-lg bg-glass-bg border border-glass-border hover:border-accent/30 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>

        {/* Pool Information */}
        <GlassCard>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Pool Information
                </h2>
              </div>
              <StatusBadge
                status="success"
                label={`APY: ${poolData.supplyAPY}`}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-muted-foreground text-sm">
                  Asset Price
                </span>
                <div className="text-lg font-semibold text-foreground">
                  {poolData.assetPrice}
                </div>
              </div>
              <div className="space-y-2 md:text-right">
                <span className="text-muted-foreground text-sm">
                  Supply APY
                </span>
                <div className="text-lg font-semibold text-trading-buy">
                  {poolData.supplyAPY}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-foreground">
                  Amount to Supply
                </label>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent text-sm font-bold">
                      {pool.assetName.slice(0, 1)}
                    </span>
                  </div>
                  <span className="font-semibold text-lg text-foreground">
                    {pool.assetName}
                  </span>
                </div>
                <input
                  type="text"
                  value={assetAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full bg-surface-overlay border border-glass-border rounded-xl px-6 py-4 pr-20 text-right text-2xl font-medium text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>

              {validationError && (
                <div className="bg-trading-sell/10 border border-trading-sell/20 rounded-lg p-3">
                  <p className="text-trading-sell text-sm">{validationError}</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Fee Breakdown */}
          {tokenAmount && (
            <GlassCard>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  <label className="text-lg font-semibold text-foreground">
                    Transaction Summary
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Liquidity Amount
                    </span>
                    <span className="font-medium font-mono text-foreground">
                      ${formatTokenAmount(tokenAmount, 0, 2)} AURA
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Platform Fee ({PLATFORM_FEE_PERCENTAGE}%)
                    </span>
                    <span className="font-medium font-mono text-accent">
                      ${formatTokenAmount(platformFee, 0, 2)} AURA
                    </span>
                  </div>

                  <div className="border-t border-glass-border"></div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-foreground">
                      Total Amount
                    </span>
                    <span className="text-lg font-semibold font-mono text-foreground">
                      ${formatTokenAmount(totalAmount, 0, 2)} AURA
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-trading-sell/10 border border-trading-sell/20 rounded-xl p-4">
              <p className="text-trading-sell">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <GlowButton
            type="submit"
            variant="primary"
            className="w-full h-14 text-lg"
            glow
            loading={stakeLoading || loading}
            disabled={!isAmountValid()}
          >
            Add Liquidity - ${formatTokenAmount(totalAmount || '0', 0, 2)} AURA
          </GlowButton>
        </form>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">
            By adding liquidity, you agree to the pool terms and conditions.
          </p>
          <p className="text-muted-foreground/70 text-xs">
            Platform fee: {PLATFORM_FEE_PERCENTAGE}% • Total includes all fees
          </p>
        </div>
      </div>
    </div>
  );
}
