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
  EvaPanel,
  EvaStatusBadge,
  EvaProgress,
  TrapButton,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { Button } from '@/app/components/ui/button';
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
          <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
            Connect Your Wallet
          </h2>
          <p className="text-foreground/40 font-mono text-sm mt-2">
            Connect your wallet to view your RWY stakes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Greek Key Strip */}
      <GreekKeyStrip color="gold" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <EvaSectionMarker section="My Stakes" label="RWY Portfolio" />
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase">
              My RWY Stakes
            </h1>
          </div>
          <p className="text-foreground/50 font-mono text-sm tracking-[0.06em]">
            Track and manage your commodity staking positions
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <EvaScanLine variant="mixed" />

      {/* Portfolio Summary */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EvaPanel label="Active Positions" sysId="POS-01" status="active">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {opportunities.length}
              </p>
            </div>
          </EvaPanel>

          <EvaPanel label="Avg. Yield" sysId="YLD-01">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold font-mono tabular-nums text-emerald-500">
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
          </EvaPanel>

          <EvaPanel label="Pending Claims" sysId="CLM-01">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {
                  opportunities.filter(
                    (o) => o.status === RWYOpportunityStatus.DISTRIBUTING,
                  ).length
                }
              </p>
            </div>
          </EvaPanel>
        </div>
      )}

      <EvaScanLine variant="gold" />

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
          <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
            No Stakes Found
          </h2>
          <p className="text-foreground/40 font-mono text-sm mt-2">
            You haven&apos;t staked in any RWY opportunities yet.
          </p>
          <Link href="/customer/rwy">
            <TrapButton variant="gold" className="mt-4">
              Browse Opportunities
            </TrapButton>
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

      <GreekKeyStrip color="gold" />
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
    <EvaPanel
      label="Stake Position"
      sysId={`RWY-${String(opportunity.id).slice(0, 8)}`}
      status={
        isCancelled
          ? 'warning'
          : opportunity.status === RWYOpportunityStatus.COMPLETED
            ? 'active'
            : 'pending'
      }
      noPadding
    >
      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Link href={`/customer/rwy/${opportunity.id}`}>
                <h3 className="font-mono text-base font-bold tracking-[0.08em] uppercase hover:text-gold transition-colors">
                  {opportunity.name}
                </h3>
              </Link>
              <p className="text-sm font-mono text-foreground/40 line-clamp-1 tracking-wide">
                {opportunity.description}
              </p>
            </div>
            <EvaStatusBadge
              status={
                opportunity.status === RWYOpportunityStatus.FUNDING
                  ? 'active'
                  : opportunity.status === RWYOpportunityStatus.COMPLETED
                    ? 'completed'
                    : isCancelled
                      ? 'pending'
                      : 'processing'
              }
              label={RWYStatusLabels[opportunity.status]}
            />
          </div>

          <EvaScanLine variant="gold" />

          {/* Progress */}
          <div className="space-y-2 my-4">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/40 font-mono tracking-[0.1em] uppercase text-xs">
                Opportunity Progress
              </span>
              <span className="font-mono font-bold text-sm tabular-nums">
                {opportunity.formattedProgress}
              </span>
            </div>
            <EvaProgress value={opportunity.fundingProgress} color="gold" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Your Stake
              </p>
              <p className="font-mono font-bold text-sm tabular-nums">
                {stake ? ethers.formatUnits(stake.amount, 18) : '0'} tokens
              </p>
            </div>
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Promised Yield
              </p>
              <p className="font-mono font-bold text-sm tabular-nums text-emerald-500">
                {bpsToPercent(opportunity.promisedYieldBps)}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Est. Profit
              </p>
              <p className="font-mono font-bold text-sm tabular-nums text-amber-500">
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
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Status
              </p>
              <p className="font-mono font-bold text-sm">
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
        <div className="lg:w-48 p-5 bg-card/40 border-t lg:border-t-0 lg:border-l border-border/20 flex flex-col justify-center gap-3">
          {canClaim && (
            <TrapButton
              variant="emerald"
              onClick={handleClaim}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              ) : (
                <Coins className="mr-2 h-4 w-4 inline" />
              )}
              Claim Profits
            </TrapButton>
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
            <p className="text-xs text-destructive text-center font-mono">
              {error}
            </p>
          )}

          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-500 text-center underline font-mono"
            >
              View Transaction
            </a>
          )}
        </div>
      </div>
    </EvaPanel>
  );
}
