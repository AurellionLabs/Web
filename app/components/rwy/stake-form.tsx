'use client';

import { useState, useEffect } from 'react';
import {
  RWYOpportunityWithDynamicData,
  isOpportunityStakeable,
  bpsToPercent,
  Address,
} from '@/domain/rwy';
import { useRWYStakeActions } from '@/hooks/useRWYActions';
import { useRWYStake, useRWYExpectedProfit } from '@/hooks/useRWYOpportunity';
import {
  EvaPanel,
  TrapButton,
  EvaProgress,
} from '@/app/components/eva/eva-components';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coins,
  TrendingUp,
  Percent,
} from 'lucide-react';
import {
  formatWeiToEther,
  parseTokenAmount,
  formatErc20Balance,
} from '@/lib/utils';

interface StakeFormProps {
  opportunity: RWYOpportunityWithDynamicData;
  userAddress?: Address;
  userBalance?: string; // User's balance of input token
  onSuccess?: () => void;
}

export function StakeForm({
  opportunity,
  userAddress,
  userBalance = '0',
  onSuccess,
}: StakeFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);

  const { stake, approveTokens, checkApproval, loading, error, txHash } =
    useRWYStakeActions();
  const { stake: existingStake } = useRWYStake(opportunity.id, userAddress);
  const { expectedProfit, userShareBps } = useRWYExpectedProfit(
    opportunity.id,
    amount ? parseTokenAmount(amount, 18).toString() : undefined,
  );

  const canStake = isOpportunityStakeable(opportunity);
  const balanceBigInt = BigInt(userBalance);
  const amountBigInt = amount ? parseTokenAmount(amount, 18) : 0n;
  const remainingCapacity =
    BigInt(opportunity.targetAmount) - BigInt(opportunity.stakedAmount);

  const isValidAmount =
    amountBigInt > 0n &&
    amountBigInt <= balanceBigInt &&
    amountBigInt <= remainingCapacity;

  // Check approval status on mount
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!userAddress) {
        setCheckingApproval(false);
        return;
      }
      try {
        const approved = await checkApproval(opportunity.inputToken);
        setIsApproved(approved);
      } catch (err) {
        console.error('Error checking approval:', err);
      } finally {
        setCheckingApproval(false);
      }
    };
    checkApprovalStatus();
  }, [userAddress, opportunity.inputToken, checkApproval]);

  const handleApprove = async () => {
    try {
      await approveTokens(opportunity.inputToken);
      setIsApproved(true);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleStake = async () => {
    if (!isValidAmount) return;

    try {
      await stake(opportunity.id, amountBigInt.toString());
      setAmount('');
      onSuccess?.();
    } catch (err) {
      console.error('Stake failed:', err);
    }
  };

  const handleMaxClick = () => {
    const maxAmount =
      balanceBigInt < remainingCapacity ? balanceBigInt : remainingCapacity;
    setAmount(formatErc20Balance(maxAmount, 18));
  };

  const handleSliderChange = (value: number[]) => {
    const percentage = value[0];
    const maxAmount =
      balanceBigInt < remainingCapacity ? balanceBigInt : remainingCapacity;
    const sliderAmount = (maxAmount * BigInt(percentage)) / 100n;
    setAmount(formatErc20Balance(sliderAmount, 18));
  };

  if (!canStake) {
    return (
      <EvaPanel label="Staking Closed" status="warning" accent="crimson">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-gold" />
          <p className="font-mono text-sm tracking-[0.05em] text-foreground/50">
            This opportunity is no longer accepting stakes.
          </p>
        </div>
      </EvaPanel>
    );
  }

  return (
    <EvaPanel
      label="Stake Commodities"
      sublabel={`Stake your ${opportunity.inputTokenName || 'tokens'} to earn ${bpsToPercent(opportunity.promisedYieldBps)} yield`}
      status="active"
    >
      <div className="space-y-6">
        {/* Existing Stake Info */}
        {existingStake && BigInt(existingStake.amount) > 0n && (
          <div
            className="flex items-center gap-3 p-3 bg-emerald-500/8 border border-emerald-500/20"
            style={{
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            }}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-xs tracking-[0.05em] text-emerald-400">
              You have staked {formatErc20Balance(existingStake.amount, 18)}{' '}
              tokens in this opportunity.
            </span>
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label
              htmlFor="amount"
              className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/45 font-bold"
            >
              Amount to Stake
            </Label>
            <span className="font-mono text-xs tracking-[0.05em] text-foreground/35">
              Balance: {formatErc20Balance(userBalance, 18)}
            </span>
          </div>
          <div className="relative group">
            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors" />
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16 pl-4 font-mono bg-background/80 border-border/40 focus:border-gold/50"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            />
            <button
              type="button"
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.15em] uppercase font-bold text-gold/60 hover:text-gold px-2 py-1 bg-gold/8 hover:bg-gold/15 transition-colors"
              style={{
                clipPath:
                  'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
              }}
            >
              MAX
            </button>
          </div>

          {/* Amount Slider */}
          <Slider
            defaultValue={[0]}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            className="mt-4"
          />
          <div className="flex justify-between font-mono text-[9px] tracking-[0.1em] uppercase text-foreground/30">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Expected Returns */}
        {amountBigInt > 0n && (
          <div
            className="p-4 bg-background/60 border border-border/20 space-y-3"
            style={{
              clipPath:
                'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
            }}
          >
            <h4 className="font-mono text-xs tracking-[0.15em] uppercase font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-foreground/60">Expected Returns</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/35">
                  Your Share
                </p>
                <p className="font-mono text-sm font-bold text-foreground/80">
                  {(userShareBps / 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/35">
                  Expected Profit
                </p>
                <p className="font-mono text-sm font-bold text-emerald-400">
                  {formatErc20Balance(expectedProfit, 18)} AURUM
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/35">
                  Promised Yield
                </p>
                <p className="font-mono text-sm font-bold text-foreground/80">
                  {bpsToPercent(opportunity.promisedYieldBps)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/35">
                  Est. APY
                </p>
                <p className="font-mono text-sm font-bold text-gold">
                  {opportunity.estimatedAPY.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Capacity Warning */}
        {amountBigInt > remainingCapacity && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Amount exceeds remaining capacity. Max:{' '}
              {formatErc20Balance(remainingCapacity, 18)}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {txHash && (
          <div
            className="flex items-center gap-3 p-3 bg-emerald-500/8 border border-emerald-500/20"
            style={{
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            }}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-xs tracking-[0.05em] text-emerald-400">
              Transaction successful!{' '}
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-300"
              >
                View on Explorer
              </a>
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {checkingApproval ? (
            <TrapButton disabled className="w-full" variant="gold">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />
              Checking Approval...
            </TrapButton>
          ) : !isApproved ? (
            <TrapButton
              onClick={handleApprove}
              disabled={loading}
              className="w-full"
              variant="gold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />
                  Approving...
                </>
              ) : (
                'Approve Tokens'
              )}
            </TrapButton>
          ) : (
            <TrapButton
              onClick={handleStake}
              disabled={loading || !isValidAmount}
              className="w-full"
              variant="gold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />
                  Staking...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4 inline-block" />
                  Stake {amount || '0'} Tokens
                </>
              )}
            </TrapButton>
          )}
        </div>
      </div>
    </EvaPanel>
  );
}
