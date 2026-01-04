'use client';

import { useParams } from 'next/navigation';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
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
import { ethers } from 'ethers';

export default function RWYOpportunityDetailPage() {
  const params = useParams();
  const opportunityId = params.id as string;

  const { opportunity, loading, error, refetch } =
    useRWYOpportunity(opportunityId);
  const { stakers } = useRWYOpportunityStakers(opportunityId);
  const { address: walletAddress } = useWallet();

  if (loading) {
    return <OpportunityDetailSkeleton />;
  }

  if (error || !opportunity) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Opportunity Not Found</h2>
          <p className="text-muted-foreground mt-2">
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

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{opportunity.name}</h1>
            <Badge
              variant={
                isActive ? 'default' : isCancelled ? 'destructive' : 'secondary'
              }
              className="text-sm"
            >
              {RWYStatusLabels[opportunity.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {opportunity.description}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-500">
              {bpsToPercent(opportunity.promisedYieldBps)}
            </p>
            <p className="text-xs text-muted-foreground">Promised Yield</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Clock className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-500">
              {isActive
                ? formatTimeRemaining(opportunity.timeToFundingDeadline)
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Time Left</p>
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opportunity Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OpportunityProgress currentStatus={opportunity.status} />
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Funding Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Funding Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {opportunity.formattedProgress}
                  </span>
                </div>
                <Progress value={opportunity.fundingProgress} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span>{opportunity.formattedTVL} raised</span>
                  <span className="text-muted-foreground">
                    {opportunity.formattedGoal} goal
                  </span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Stakers</p>
                  <p className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    {opportunity.stakerCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. APY</p>
                  <p className="text-xl font-semibold text-amber-500">
                    {opportunity.estimatedAPY.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Operator Fee</p>
                  <p className="text-xl font-semibold">
                    {bpsToPercent(opportunity.operatorFeeBps)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Min Sale Price
                  </p>
                  <p className="text-xl font-semibold">
                    {ethers.formatUnits(opportunity.minSalePrice, 18)} AURUM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commodity Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Commodity Processing Flow
              </CardTitle>
              <CardDescription>
                How your staked commodities will be processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/50 via-primary/5 to-muted/50">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium">
                    {opportunity.inputTokenName || 'Input Commodity'}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                  <p className="font-medium">
                    {opportunity.outputTokenName || 'Processed Output'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expected:{' '}
                    {ethers.formatUnits(opportunity.expectedOutputAmount, 18)}{' '}
                    units
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stakers List */}
          {stakers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Stakers ({stakers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stakers.map((stake, index) => (
                    <div
                      key={stake.staker}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-mono text-sm">
                          {stake.staker.slice(0, 6)}...{stake.staker.slice(-4)}
                        </span>
                        {stake.claimed && (
                          <Badge variant="outline" className="text-emerald-500">
                            Claimed
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">
                        {ethers.formatUnits(stake.amount, 18)} tokens
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions & Operator */}
        <div className="space-y-6">
          {/* Stake Form */}
          <StakeForm
            opportunity={opportunity}
            userAddress={walletAddress as Address | undefined}
            userBalance="1000000000000000000000" // TODO: Fetch actual balance
            onSuccess={refetch}
          />

          {/* Operator Info */}
          <OperatorReputation operatorAddress={opportunity.operator} />

          {/* Collateral Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Operator Collateral
                </span>
                <span className="font-medium">
                  {ethers.formatEther(opportunity.operatorCollateral)} ETH
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Collateral Ratio
                </span>
                <span className="font-medium">20%</span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Operator collateral is locked and can be slashed if obligations
                are not met.
              </p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(opportunity.createdAt * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Funding Deadline
                </span>
                <span className="text-sm">
                  {new Date(
                    opportunity.fundingDeadline * 1000,
                  ).toLocaleDateString()}
                </span>
              </div>
              {opportunity.fundedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Funded</span>
                  <span className="text-sm">
                    {new Date(opportunity.fundedAt * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
              {opportunity.processingDeadline > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Processing Deadline
                  </span>
                  <span className="text-sm">
                    {new Date(
                      opportunity.processingDeadline * 1000,
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
              {opportunity.completedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Completed
                  </span>
                  <span className="text-sm">
                    {new Date(
                      opportunity.completedAt * 1000,
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
