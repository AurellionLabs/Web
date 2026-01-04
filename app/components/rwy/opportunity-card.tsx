'use client';

import {
  RWYOpportunityWithDynamicData,
  RWYStatusLabels,
  RWYStatusColors,
  RWYOpportunityStatus,
  formatTimeRemaining,
} from '@/domain/rwy';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Button } from '@/app/components/ui/button';
import { Clock, Users, TrendingUp, Coins, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface OpportunityCardProps {
  opportunity: RWYOpportunityWithDynamicData;
  showActions?: boolean;
}

export function OpportunityCard({
  opportunity,
  showActions = true,
}: OpportunityCardProps) {
  const statusColor = RWYStatusColors[opportunity.status];
  const statusLabel = RWYStatusLabels[opportunity.status];
  const isActive = opportunity.status === RWYOpportunityStatus.FUNDING;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
              {opportunity.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {opportunity.description}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 bg-${statusColor}-500/10 text-${statusColor}-500 border-${statusColor}-500/30`}
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Funding Progress</span>
            <span className="font-medium">{opportunity.formattedProgress}</span>
          </div>
          <Progress value={opportunity.fundingProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{opportunity.formattedTVL} raised</span>
            <span>{opportunity.formattedGoal} goal</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Yield</p>
              <p className="font-semibold text-emerald-500">
                {opportunity.formattedYield}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Time Left</p>
              <p className="font-semibold text-blue-500">
                {isActive
                  ? formatTimeRemaining(opportunity.timeToFundingDeadline)
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Stakers</p>
              <p className="font-semibold">{opportunity.stakerCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Coins className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Est. APY</p>
              <p className="font-semibold text-amber-500">
                {opportunity.estimatedAPY.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Input/Output Info */}
        <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Input</p>
            <p className="font-medium">
              {opportunity.inputTokenName || 'Commodity'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Output</p>
            <p className="font-medium">
              {opportunity.outputTokenName || 'Processed'}
            </p>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-0">
          <Link href={`/customer/rwy/${opportunity.id}`} className="w-full">
            <Button
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              variant={isActive ? 'default' : 'outline'}
            >
              {isActive ? 'Stake Now' : 'View Details'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Skeleton loader for opportunity card
 */
export function OpportunityCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
          <div className="h-6 w-20 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-12" />
          </div>
          <div className="h-2 bg-muted rounded w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="h-10 bg-muted rounded w-full" />
      </CardFooter>
    </Card>
  );
}
