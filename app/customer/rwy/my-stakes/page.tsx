'use client';

import { useUserRWYStakes } from '@/hooks/useRWYOpportunities';
import { useRWYStake } from '@/hooks/useRWYOpportunity';
import { useRWYStakeActions } from '@/hooks/useRWYActions';
import { useWallet } from '@/hooks/useWallet';
import {
  RWYOpportunityWithDynamicData,
  RWYOpportunityStatus,
  RWYStatusLabels,
  canUnstake,
  canClaimProfits,
  bpsToPercent,
  Address,
} from '@/domain/rwy';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowRight,
  Coins,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { ethers } from 'ethers';

export default function MyRWYStakesPage() {
  const { address: walletAddress, isConnected } = useWallet();
  const { opportunities, loading, error, refetch } = useUserRWYStakes(
    walletAddress as Address | undefined,
  );

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
          <p className="text-muted-foreground mt-2">
            Connect your wallet to view your RWY stakes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My RWY Stakes</h1>
          <p className="text-muted-foreground">
            Track and manage your commodity staking positions
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Portfolio Summary */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Positions
                  </p>
                  <p className="text-2xl font-bold">{opportunities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Yield</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {(
                      opportunities.reduce(
                        (acc, o) => acc + o.promisedYieldBps,
                        0,
                      ) /
                      opportunities.length /
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Claims
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      opportunities.filter(
                        (o) => o.status === RWYOpportunityStatus.DISTRIBUTING,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stakes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-12">
          <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">No Stakes Found</h2>
          <p className="text-muted-foreground mt-2">
            You haven't staked in any RWY opportunities yet.
          </p>
          <Link href="/customer/rwy">
            <Button className="mt-4">
              Browse Opportunities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <StakePositionCard
              key={opportunity.id}
              opportunity={opportunity}
              userAddress={walletAddress as Address}
              onAction={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StakePositionCardProps {
  opportunity: RWYOpportunityWithDynamicData;
  userAddress: Address;
  onAction?: () => void;
}

function StakePositionCard({
  opportunity,
  userAddress,
  onAction,
}: StakePositionCardProps) {
  const { stake } = useRWYStake(opportunity.id, userAddress);
  const { claimProfits, emergencyClaim, unstake, loading, error, txHash } =
    useRWYStakeActions();

  const canClaim = canClaimProfits(opportunity) && stake && !stake.claimed;
  const canWithdraw =
    canUnstake(opportunity) && stake && BigInt(stake.amount) > 0n;
  const isCancelled = opportunity.status === RWYOpportunityStatus.CANCELLED;

  const handleClaim = async () => {
    try {
      if (isCancelled) {
        await emergencyClaim(opportunity.id);
      } else {
        await claimProfits(opportunity.id);
      }
      onAction?.();
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  const handleUnstake = async () => {
    if (!stake) return;
    try {
      await unstake(opportunity.id, stake.amount);
      onAction?.();
    } catch (err) {
      console.error('Unstake failed:', err);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Link href={`/customer/rwy/${opportunity.id}`}>
                <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                  {opportunity.name}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {opportunity.description}
              </p>
            </div>
            <Badge variant={isCancelled ? 'destructive' : 'outline'}>
              {RWYStatusLabels[opportunity.status]}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Opportunity Progress
              </span>
              <span>{opportunity.formattedProgress}</span>
            </div>
            <Progress value={opportunity.fundingProgress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Your Stake</p>
              <p className="font-semibold">
                {stake ? ethers.formatUnits(stake.amount, 18) : '0'} tokens
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Promised Yield</p>
              <p className="font-semibold text-emerald-500">
                {bpsToPercent(opportunity.promisedYieldBps)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Profit</p>
              <p className="font-semibold text-amber-500">
                {stake
                  ? ethers.formatUnits(
                      (BigInt(stake.amount) *
                        BigInt(opportunity.promisedYieldBps)) /
                        10000n,
                      18,
                    )
                  : '0'}{' '}
                AURUM
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold">
                {stake?.claimed ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Claimed
                  </span>
                ) : (
                  'Pending'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="lg:w-48 p-6 bg-muted/30 border-t lg:border-t-0 lg:border-l flex flex-col justify-center gap-3">
          {canClaim && (
            <Button onClick={handleClaim} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Coins className="mr-2 h-4 w-4" />
              )}
              Claim Profits
            </Button>
          )}

          {canWithdraw && (
            <Button
              variant="outline"
              onClick={handleUnstake}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isCancelled ? (
                'Withdraw Tokens'
              ) : (
                'Unstake'
              )}
            </Button>
          )}

          <Link href={`/customer/rwy/${opportunity.id}`} className="w-full">
            <Button variant="ghost" className="w-full">
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-500 text-center underline"
            >
              View Transaction
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
