'use client';

import { useState } from 'react';
import { useOperatorRWYOpportunities } from '@/hooks/useRWYOpportunities';
import { useRWYOperatorStats } from '@/hooks/useRWYOpportunity';
import { useWallet } from '@/hooks/useWallet';
import { RWYOpportunityStatus, RWYStatusLabels, Address } from '@/domain/rwy';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Wallet,
  Shield,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { ethers } from 'ethers';

export default function OperatorRWYDashboard() {
  const { address: walletAddress, isConnected } = useWallet();
  const { opportunities, loading, error, refetch } =
    useOperatorRWYOpportunities(walletAddress as Address | undefined);
  const { stats } = useRWYOperatorStats(walletAddress as Address | undefined);
  const [activeTab, setActiveTab] = useState('all');

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
          <p className="text-muted-foreground mt-2">
            Connect your wallet to access the operator dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!stats?.approved) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Operator Access Required</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Your wallet is not approved as an RWY operator. Contact the platform
            administrator to request operator access.
          </p>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">Your Address:</p>
            <p className="font-mono text-sm">{walletAddress}</p>
          </div>
        </div>
      </div>
    );
  }

  const activeOpps = opportunities.filter((o) =>
    [
      RWYOpportunityStatus.FUNDING,
      RWYOpportunityStatus.FUNDED,
      RWYOpportunityStatus.IN_TRANSIT,
    ].includes(o.status),
  );
  const processingOpps = opportunities.filter((o) =>
    [
      RWYOpportunityStatus.PROCESSING,
      RWYOpportunityStatus.SELLING,
      RWYOpportunityStatus.DISTRIBUTING,
    ].includes(o.status),
  );
  const completedOpps = opportunities.filter(
    (o) => o.status === RWYOpportunityStatus.COMPLETED,
  );

  const filteredOpportunities =
    activeTab === 'all'
      ? opportunities
      : activeTab === 'active'
        ? activeOpps
        : activeTab === 'processing'
          ? processingOpps
          : completedOpps;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Operator Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your RWY opportunities and track processing progress
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/node/rwy/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Opportunity
            </Button>
          </Link>
        </div>
      </div>

      {/* Operator Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reputation</p>
                <p className="text-2xl font-bold">{stats.reputation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful Ops</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {stats.successfulOps}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-blue-500">
                  {stats.activeOpportunities}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Package className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="text-2xl font-bold text-amber-500">
                  $
                  {Number(
                    ethers.formatUnits(stats.totalValueProcessed, 18),
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeOpps.length})</TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({processingOpps.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOpps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Opportunities</h3>
              <p className="text-muted-foreground mt-2">
                {activeTab === 'all'
                  ? "You haven't created any opportunities yet."
                  : `No ${activeTab} opportunities.`}
              </p>
              {activeTab === 'all' && (
                <Link href="/node/rwy/create">
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Opportunity
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opp) => (
                <Card key={opp.id} className="overflow-hidden">
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{opp.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {opp.description}
                          </p>
                        </div>
                        <Badge>{RWYStatusLabels[opp.status]}</Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Funding Progress
                          </span>
                          <span>{opp.formattedProgress}</span>
                        </div>
                        <Progress value={opp.fundingProgress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">TVL</p>
                          <p className="font-semibold">{opp.formattedTVL}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Goal</p>
                          <p className="font-semibold">{opp.formattedGoal}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Yield</p>
                          <p className="font-semibold text-emerald-500">
                            {opp.formattedYield}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stakers</p>
                          <p className="font-semibold">{opp.stakerCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-48 p-6 bg-muted/30 border-t lg:border-t-0 lg:border-l flex flex-col justify-center gap-3">
                      <Link href={`/node/rwy/${opp.id}`}>
                        <Button className="w-full">
                          Manage
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      {opp.status === RWYOpportunityStatus.FUNDING && (
                        <Button variant="outline" className="w-full">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
