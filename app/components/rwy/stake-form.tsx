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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
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
import { ethers } from 'ethers';

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
    amount ? ethers.parseUnits(amount, 18).toString() : undefined,
  );

  const canStake = isOpportunityStakeable(opportunity);
  const balanceBigInt = BigInt(userBalance);
  const amountBigInt = amount ? ethers.parseUnits(amount, 18) : 0n;
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
    setAmount(ethers.formatUnits(maxAmount, 18));
  };

  const handleSliderChange = (value: number[]) => {
    const percentage = value[0];
    const maxAmount =
      balanceBigInt < remainingCapacity ? balanceBigInt : remainingCapacity;
    const sliderAmount = (maxAmount * BigInt(percentage)) / 100n;
    setAmount(ethers.formatUnits(sliderAmount, 18));
  };

  if (!canStake) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="h-5 w-5" />
            Staking Closed
          </CardTitle>
          <CardDescription>
            This opportunity is no longer accepting stakes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Stake Commodities
        </CardTitle>
        <CardDescription>
          Stake your {opportunity.inputTokenName || 'tokens'} to earn{' '}
          {bpsToPercent(opportunity.promisedYieldBps)} yield
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Existing Stake Info */}
        {existingStake && BigInt(existingStake.amount) > 0n && (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-emerald-500">
              You have staked {ethers.formatUnits(existingStake.amount, 18)}{' '}
              tokens in this opportunity.
            </AlertDescription>
          </Alert>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="amount">Amount to Stake</Label>
            <span className="text-sm text-muted-foreground">
              Balance: {ethers.formatUnits(userBalance, 18)}
            </span>
          </div>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 text-xs"
              onClick={handleMaxClick}
            >
              MAX
            </Button>
          </div>

          {/* Amount Slider */}
          <Slider
            defaultValue={[0]}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            className="mt-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Expected Returns */}
        {amountBigInt > 0n && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Expected Returns
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Your Share</p>
                <p className="font-semibold">
                  {(userShareBps / 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected Profit</p>
                <p className="font-semibold text-emerald-500">
                  {ethers.formatUnits(expectedProfit, 18)} AURUM
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Promised Yield</p>
                <p className="font-semibold">
                  {bpsToPercent(opportunity.promisedYieldBps)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. APY</p>
                <p className="font-semibold text-amber-500">
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
              {ethers.formatUnits(remainingCapacity, 18)}
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
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-emerald-500">
              Transaction successful!{' '}
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Explorer
              </a>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        {checkingApproval ? (
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking Approval...
          </Button>
        ) : !isApproved ? (
          <Button onClick={handleApprove} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve Tokens'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleStake}
            disabled={loading || !isValidAmount}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Stake {amount || '0'} Tokens
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
