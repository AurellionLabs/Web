'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  useRWYOpportunity,
  useRWYOpportunityStakers,
} from '@/hooks/useRWYOpportunity';
import { useWallet } from '@/hooks/useWallet';
import {
  RWYOpportunityStatus,
  RWYStatusLabels,
  bpsToPercent,
  formatTimeRemaining,
  canUnstake,
  canClaimProfits,
  Address,
} from '@/domain/rwy';
import { OpportunityProgress } from '@/app/components/rwy/opportunity-progress';
import { StakeForm } from '@/app/components/rwy/stake-form';
import { OperatorReputation } from '@/app/components/rwy/operator-reputation';
import {
  EvaPanel,
  EvaStatusBadge,
  EvaProgress,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { ATFieldGauge } from '@/app/components/eva/eva-animations';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Separator } from '@/app/components/ui/separator';
import {
  ArrowLeft,
  Clock,
  Users,
  TrendingUp,
  Coins,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { formatErc20Balance, formatWeiToEther } from '@/lib/utils';
import { getSettlementService } from '@/infrastructure/services/settlement-service';
import { NEXT_PUBLIC_AURA_ASSET_ADDRESS } from '@/chain-constants';

export default function RWYOpportunityDetailPage() {
  const params = useParams();
  const opportunityId = params.id as string;

  const { opportunity, loading, error, refetch } =
    useRWYOpportunity(opportunityId);
  const { stakers } = useRWYOpportunityStakers(opportunityId);
  const { address: walletAddress } = useWallet();
  const [userBalance, setUserBalance] = useState<string>('0');

  // Fetch user's ERC1155 balance for the opportunity's input token
  useEffect(() => {
    if (!walletAddress || !opportunity) return;
    const tokenId = opportunity.inputTokenId;
    if (!tokenId) return;

    let cancelled = false;
    const fetch = async () => {
      try {
        const balance = await getSettlementService().getTokenBalance(
          walletAddress,
          tokenId,
          NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        );
        if (!cancelled) setUserBalance(balance.toString());
      } catch (err) {
        console.warn('[RWY detail] Failed to fetch input token balance:', err);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, opportunity]);

  if (loading) {
    return <OpportunityDetailSkeleton />;
  }

  if (error || !opportunity) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
            Opportunity Not Found
          </h2>
          <p className="text-foreground/40 font-mono text-sm mt-2">
            {error || 'This opportunity does not exist.'}
          </p>
          <Link href="/customer/rwy">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Opportunities
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = opportunity.status === RWYOpportunityStatus.FUNDING;
  const isCancelled = opportunity.status === RWYOpportunityStatus.CANCELLED;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Back Button */}
      <Link href="/customer/rwy">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Opportunities
        </Button>
      </Link>

      {/* Greek Key Strip */}
      <GreekKeyStrip color="gold" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between">
        <div className="space-y-3">
          <EvaSectionMarker
            section="RWY Detail"
            label={`OPP-${opportunityId.slice(0, 8)}`}
          />
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase">
              {opportunity.name}
            </h1>
            <EvaStatusBadge
              status={
                isActive
                  ? 'active'
                  : isCancelled
                    ? 'pending'
                    : opportunity.status === RWYOpportunityStatus.COMPLETED
                      ? 'completed'
                      : 'processing'
              }
              label={RWYStatusLabels[opportunity.status]}
            />
          </div>
          <p className="text-foreground/50 font-mono text-sm tracking-[0.06em] max-w-2xl">
            {opportunity.description}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-500">
              {bpsToPercent(opportunity.promisedYieldBps)}
            </p>
            <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
              Promised Yield
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Clock className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono tabular-nums text-blue-500">
              {isActive
                ? formatTimeRemaining(opportunity.timeToFundingDeadline)
                : 'N/A'}
            </p>
            <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
              Time Left
            </p>
          </div>
        </div>
      </div>

      <EvaScanLine variant="mixed" />

      {/* Progress Tracker */}
      <EvaPanel label="Opportunity Progress" sysId="PROG-01">
        <OpportunityProgress currentStatus={opportunity.status} />
      </EvaPanel>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Funding Progress */}
          <EvaPanel
            label="Funding Progress"
            sysId="FUND-01"
            status={isActive ? 'active' : 'pending'}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/40 font-mono tracking-[0.1em] uppercase text-xs">
                    Progress
                  </span>
                  <span className="font-mono font-bold text-gold tabular-nums">
                    {opportunity.formattedProgress}
                  </span>
                </div>
                <EvaProgress value={opportunity.fundingProgress} color="gold" />
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-sm">
                    {opportunity.formattedTVL} raised
                  </span>
                  <span className="text-foreground/40 font-mono text-sm">
                    {opportunity.formattedGoal} goal
                  </span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                    Stakers
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    {opportunity.stakerCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                    Est. APY
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums text-amber-500">
                    {opportunity.estimatedAPY.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                    Operator Fee
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums">
                    {bpsToPercent(opportunity.operatorFeeBps)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                    Min Sale Price
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums">
                    {formatErc20Balance(opportunity.minSalePrice, 18)} AURUM
                  </p>
                </div>
              </div>
            </div>
          </EvaPanel>

          {/* AT Field Gauge — Funding Progress Visualization */}
          <ATFieldGauge label="Funding Progress" />

          {/* Commodity Flow */}
          <EvaPanel
            label="Commodity Processing Flow"
            sublabel="How your staked commodities will be processed"
            sysId="FLOW-01"
          >
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/50 via-primary/5 to-muted/50">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <p className="font-mono font-bold tracking-[0.08em] uppercase text-sm">
                  {opportunity.inputTokenName || 'Input Commodity'}
                </p>
                <p className="text-xs font-mono text-foreground/40 tracking-wide">
                  Token ID: {opportunity.inputTokenId}
                </p>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4">
                  <div className="h-0.5 w-8 bg-primary/30" />
                  <ArrowRight className="h-6 w-6 text-primary" />
                  <div className="h-0.5 w-8 bg-primary/30" />
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="font-mono font-bold tracking-[0.08em] uppercase text-sm">
                  {opportunity.outputTokenName || 'Processed Output'}
                </p>
                <p className="text-xs font-mono text-foreground/40 tracking-wide">
                  Expected:{' '}
                  {formatErc20Balance(opportunity.expectedOutputAmount, 18)}{' '}
                  units
                </p>
              </div>
            </div>
          </EvaPanel>

          {/* Stakers List */}
          {stakers.length > 0 && (
            <EvaPanel label={`Stakers (${stakers.length})`} sysId="STK-01">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stakers.map((stake, index) => (
                  <div
                    key={stake.staker}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-foreground/40 tabular-nums">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-sm tracking-wide">
                        {stake.staker.slice(0, 6)}...{stake.staker.slice(-4)}
                      </span>
                      {stake.claimed && (
                        <EvaStatusBadge status="completed" label="Claimed" />
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm tabular-nums">
                      {formatErc20Balance(stake.amount, 18)} tokens
                    </span>
                  </div>
                ))}
              </div>
            </EvaPanel>
          )}
        </div>

        {/* Right Column - Actions & Operator */}
        <div className="space-y-6">
          {/* Stake Form */}
          <StakeForm
            opportunity={opportunity}
            userAddress={walletAddress as Address | undefined}
            userBalance={userBalance}
            onSuccess={refetch}
          />

          {/* Operator Info */}
          <OperatorReputation operatorAddress={opportunity.operator} />

          {/* Collateral Info */}
          <EvaPanel label="Security" sysId="SEC-01">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                  Operator Collateral
                </span>
                <span className="font-mono font-bold text-sm tabular-nums">
                  {formatWeiToEther(opportunity.operatorCollateral)} ETH
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                  Collateral Ratio
                </span>
                <span className="font-mono font-bold text-sm tabular-nums">
                  20%
                </span>
              </div>
              <Separator />
              <p className="text-xs font-mono text-foreground/30 tracking-wide">
                Operator collateral is locked and can be slashed if obligations
                are not met.
              </p>
            </div>
          </EvaPanel>

          {/* Timeline */}
          <EvaPanel label="Timeline" sysId="TIME-01">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                  Created
                </span>
                <span className="text-sm font-mono tabular-nums">
                  {new Date(opportunity.createdAt * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                  Funding Deadline
                </span>
                <span className="text-sm font-mono tabular-nums">
                  {new Date(
                    opportunity.fundingDeadline * 1000,
                  ).toLocaleDateString()}
                </span>
              </div>
              {opportunity.fundedAt && (
                <div className="flex justify-between">
                  <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                    Funded
                  </span>
                  <span className="text-sm font-mono tabular-nums">
                    {new Date(opportunity.fundedAt * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
              {opportunity.processingDeadline > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                    Processing Deadline
                  </span>
                  <span className="text-sm font-mono tabular-nums">
                    {new Date(
                      opportunity.processingDeadline * 1000,
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
              {opportunity.completedAt && (
                <div className="flex justify-between">
                  <span className="text-sm font-mono text-foreground/40 tracking-[0.08em]">
                    Completed
                  </span>
                  <span className="text-sm font-mono tabular-nums">
                    {new Date(
                      opportunity.completedAt * 1000,
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </EvaPanel>
        </div>
      </div>

      <GreekKeyStrip color="gold" />
    </div>
  );
}

function OpportunityDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Skeleton className="h-10 w-40" />
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-24 w-24" />
          <Skeleton className="h-24 w-24" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
