'use client';

import { RWYOperatorStats, Address } from '@/domain/rwy';
import { useRWYOperatorStats } from '@/hooks/useRWYOpportunity';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Shield,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { ethers } from 'ethers';

interface OperatorReputationProps {
  operatorAddress: Address;
  compact?: boolean;
}

function getReputationLevel(reputation: number): {
  level: string;
  color: string;
  icon: typeof Star;
} {
  if (reputation >= 100)
    return { level: 'Elite', color: 'text-amber-500', icon: Star };
  if (reputation >= 50)
    return { level: 'Trusted', color: 'text-emerald-500', icon: CheckCircle2 };
  if (reputation >= 20)
    return { level: 'Verified', color: 'text-blue-500', icon: Shield };
  if (reputation >= 5)
    return { level: 'New', color: 'text-purple-500', icon: TrendingUp };
  return {
    level: 'Unrated',
    color: 'text-muted-foreground',
    icon: AlertTriangle,
  };
}

export function OperatorReputation({
  operatorAddress,
  compact = false,
}: OperatorReputationProps) {
  const { stats, loading, error } = useRWYOperatorStats(operatorAddress);

  if (loading) {
    return compact ? (
      <Skeleton className="h-6 w-24" />
    ) : (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return compact ? (
      <Badge variant="outline" className="text-muted-foreground">
        Unknown Operator
      </Badge>
    ) : (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4">
          <p className="text-sm text-amber-500">
            Unable to load operator information
          </p>
        </CardContent>
      </Card>
    );
  }

  const { level, color, icon: Icon } = getReputationLevel(stats.reputation);
  const reputationProgress = Math.min(100, (stats.reputation / 100) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <Badge variant="outline" className={color}>
          {level}
        </Badge>
        {stats.approved && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Operator Reputation
          </span>
          {stats.approved && (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Approved
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reputation Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${color}`} />
            <div>
              <p className={`font-semibold ${color}`}>{level} Operator</p>
              <p className="text-xs text-muted-foreground">
                {stats.reputation} reputation points
              </p>
            </div>
          </div>
        </div>

        {/* Reputation Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Reputation Score</span>
            <span>{stats.reputation}/100</span>
          </div>
          <Progress value={reputationProgress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.successfulOps}</p>
            <p className="text-xs text-muted-foreground">
              Successful Operations
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.activeOpportunities}</p>
            <p className="text-xs text-muted-foreground">
              Active Opportunities
            </p>
          </div>
        </div>

        {/* Total Value Processed */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-emerald-500/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            Total Value Processed
          </p>
          <p className="text-lg font-bold">
            {Number(
              ethers.formatUnits(stats.totalValueProcessed, 18),
            ).toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            })}
          </p>
        </div>

        {/* Operator Address */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Operator Address</p>
          <p className="font-mono text-xs truncate">{operatorAddress}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline reputation badge for lists
 */
export function OperatorReputationBadge({
  operatorAddress,
}: {
  operatorAddress: Address;
}) {
  const { stats, loading } = useRWYOperatorStats(operatorAddress);

  if (loading) {
    return <Skeleton className="h-5 w-16 inline-block" />;
  }

  if (!stats) {
    return null;
  }

  const { level, color, icon: Icon } = getReputationLevel(stats.reputation);

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {level}
    </span>
  );
}
