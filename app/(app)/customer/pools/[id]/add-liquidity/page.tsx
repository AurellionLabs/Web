'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, X, Info, Droplets } from 'lucide-react';
import {
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaDataRow,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
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

  // Calculate asset price for display
  const assetPriceDisplay = (() => {
    if (!pool) return '1 Asset = $0';
    const priceRaw = parseFloat(pool.assetPrice);
    // If price is in wei (very large number), convert to human readable
    const priceUsd = priceRaw > 1e10 ? priceRaw / 1e18 : priceRaw;
    const formattedPrice = priceUsd > 0 ? priceUsd.toFixed(2) : '0.00';
    return `1 ${pool.assetName} = $${formattedPrice}`;
  })();

  const poolData = {
    name: pool?.name || '',
    assetPrice: assetPriceDisplay,
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

  // Calculate remaining pool capacity
  const remainingCapacity = (() => {
    if (!pool) return null;
    const target = BigInt(pool.fundingGoal);
    const staked = BigInt(pool.totalValueLocked);
    const remaining = target - staked;
    return remaining > 0n ? remaining : 0n;
  })();

  const remainingCapacityFormatted = remainingCapacity
    ? parseFloat((Number(remainingCapacity) / 1e18).toFixed(6))
    : 0;

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

        // For RWY pools, the user stakes tokens directly (not USD value)
        // The amount is in token units, which will be converted to wei
        const stakeAmount = inputAmount; // Direct token amount
        const feeAmount = stakeAmount * (PLATFORM_FEE_PERCENTAGE / 100);
        const total = stakeAmount + feeAmount;

        // Ensure we don't produce scientific notation - use toFixed for small numbers
        setTokenAmount(stakeAmount < 0.000001 ? '0' : stakeAmount.toFixed(6));
        setPlatformFee(feeAmount < 0.000001 ? '0' : feeAmount.toFixed(6));
        setTotalAmount(total < 0.000001 ? '0' : total.toFixed(6));

        // Check if amount exceeds remaining capacity
        if (
          remainingCapacityFormatted > 0 &&
          total > remainingCapacityFormatted
        ) {
          setError(
            `Stake amount (${total.toFixed(2)}) exceeds remaining pool capacity (${remainingCapacityFormatted.toFixed(2)}). Please reduce your amount.`,
          );
        } else {
          setError('');
        }
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
      setError('');
    }
  }, [assetAmount, pool, remainingCapacityFormatted]);

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
          <RefreshCw className="w-8 h-8 text-gold animate-spin" />
          <span className="font-mono text-sm text-foreground/40 tracking-[0.15em] uppercase">
            Loading pool data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/customer/pools/${params.id}`}
              className="p-2 bg-card/60 border border-border/30 hover:border-gold/30 transition-colors"
              style={{
                clipPath:
                  'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <ArrowLeft className="w-5 h-5 text-foreground/50" />
            </Link>
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                Add Liquidity
              </h1>
              <p className="font-mono text-sm text-foreground/40 tracking-[0.08em]">
                {pool.name}
              </p>
            </div>
          </div>
          <Link
            href={`/customer/pools/${params.id}`}
            className="p-2 bg-card/60 border border-border/30 hover:border-crimson/30 transition-colors"
            style={{
              clipPath:
                'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
            }}
          >
            <X className="w-5 h-5 text-foreground/50" />
          </Link>
        </div>

        <EvaSectionMarker section="Pool Information" variant="gold" />

        {/* Pool Information */}
        <EvaPanel label="Pool Info" sysId="POOL-INF" status="active">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 bg-gold/10 flex items-center justify-center"
                  style={{
                    clipPath:
                      'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                >
                  <Droplets className="w-5 h-5 text-gold" />
                </div>
                <span className="font-mono text-lg font-bold tracking-[0.12em] uppercase text-foreground">
                  Pool Information
                </span>
              </div>
              <EvaStatusBadge
                status="active"
                label={`APY: ${poolData.supplyAPY}`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                  Asset Price
                </span>
                <div className="font-mono text-lg font-bold text-gold tabular-nums">
                  {poolData.assetPrice}
                </div>
              </div>
              <div className="space-y-2">
                <span className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                  Remaining Capacity
                </span>
                <div className="font-mono text-lg font-bold text-foreground tabular-nums">
                  {remainingCapacityFormatted > 0
                    ? `${remainingCapacityFormatted.toLocaleString()} AURA`
                    : 'Pool is full'}
                </div>
              </div>
              <div className="space-y-2 md:text-right">
                <span className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                  Supply APY
                </span>
                <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
                  {poolData.supplyAPY}
                </div>
              </div>
            </div>
          </div>
        </EvaPanel>

        <EvaScanLine variant="mixed" />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <EvaPanel label="Amount to Supply" sysId="AMT-01" accent="gold">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <div
                    className="w-8 h-8 bg-gold/10 flex items-center justify-center"
                    style={{
                      clipPath:
                        'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                  >
                    <span className="text-gold font-mono text-sm font-bold">
                      {pool.assetName.slice(0, 1)}
                    </span>
                  </div>
                  <span className="font-mono text-lg font-bold tracking-[0.1em] uppercase text-foreground">
                    {pool.assetName}
                  </span>
                </div>
                <input
                  type="text"
                  value={assetAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full bg-background/80 border border-border/40 px-6 py-4 pr-20 text-right font-mono text-2xl font-bold text-foreground tabular-nums focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                  }}
                />
              </div>

              {validationError && (
                <div
                  className="bg-crimson/10 border border-crimson/20 p-3"
                  style={{
                    clipPath:
                      'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                  }}
                >
                  <p className="font-mono text-sm text-crimson">
                    {validationError}
                  </p>
                </div>
              )}
            </div>
          </EvaPanel>

          {/* Fee Breakdown */}
          {tokenAmount && (
            <EvaPanel
              label="Transaction Summary"
              sysId="FEE-01"
              accent="crimson"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-gold/60" />
                  <span className="font-mono text-xs text-foreground/40 tracking-[0.15em] uppercase">
                    Fee Breakdown
                  </span>
                </div>

                <EvaDataRow
                  label="Liquidity Amount"
                  value={`$${formatTokenAmount(tokenAmount, 0, 2)} AURA`}
                  valueColor="gold"
                />
                <EvaDataRow
                  label={`Platform Fee (${PLATFORM_FEE_PERCENTAGE}%)`}
                  value={`$${formatTokenAmount(platformFee, 0, 2)} AURA`}
                  valueColor="crimson"
                />

                <EvaScanLine variant="gold" />

                <div className="flex items-center justify-between py-2">
                  <span className="font-mono text-sm font-bold text-foreground tracking-[0.1em] uppercase">
                    Total Amount
                  </span>
                  <span className="font-mono text-lg font-bold text-gold tabular-nums">
                    ${formatTokenAmount(totalAmount, 0, 2)} AURA
                  </span>
                </div>
              </div>
            </EvaPanel>
          )}

          {/* Error Display */}
          {error && (
            <div
              className="bg-crimson/10 border border-crimson/20 p-4"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              <p className="font-mono text-sm text-crimson">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <TrapButton
            variant="gold"
            size="lg"
            className="w-full"
            disabled={!isAmountValid() || stakeLoading || loading}
          >
            {stakeLoading || loading
              ? 'Processing...'
              : `Add Liquidity — $${formatTokenAmount(totalAmount || '0', 0, 2)} AURA`}
          </TrapButton>
        </form>

        <EvaScanLine variant="gold" />

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="font-mono text-xs text-foreground/30 tracking-[0.1em] uppercase">
            By adding liquidity, you agree to the pool terms and conditions.
          </p>
          <p className="font-mono text-[10px] text-foreground/20 tracking-wider">
            Platform fee: {PLATFORM_FEE_PERCENTAGE}% • Total includes all fees
          </p>
        </div>

        <GreekKeyStrip color="gold" />
      </div>
    </div>
  );
}
