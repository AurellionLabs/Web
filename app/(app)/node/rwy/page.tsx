'use client';

import { useState } from 'react';
import { useOperatorRWYOpportunities } from '@/hooks/useRWYOpportunities';
import { useRWYOperatorStats } from '@/hooks/useRWYOpportunity';
import { useWallet } from '@/hooks/useWallet';
import { RWYOpportunityStatus, RWYStatusLabels, Address } from '@/domain/rwy';
import {
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaProgress,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  HexStatCard,
} from '@/app/components/eva/eva-components';
import { Button } from '@/app/components/ui/button';
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
import { formatErc20Balance } from '@/lib/utils';

/** Map RWY opportunity status to EVA badge status */
function getEvaBadgeStatus(
  status: RWYOpportunityStatus,
): 'active' | 'pending' | 'processing' | 'completed' | 'created' {
  switch (status) {
    case RWYOpportunityStatus.FUNDING:
      return 'pending';
    case RWYOpportunityStatus.FUNDED:
      return 'active';
    case RWYOpportunityStatus.IN_TRANSIT:
    case RWYOpportunityStatus.PROCESSING:
    case RWYOpportunityStatus.SELLING:
    case RWYOpportunityStatus.DISTRIBUTING:
      return 'processing';
    case RWYOpportunityStatus.COMPLETED:
      return 'completed';
    default:
      return 'created';
  }
}

export default function OperatorRWYDashboard() {
  const { address: walletAddress, isConnected } = useWallet();
  const { opportunities, loading, error, refetch } =
    useOperatorRWYOpportunities(walletAddress as Address | undefined);
  const { stats } = useRWYOperatorStats(walletAddress as Address | undefined);
  const [activeTab, setActiveTab] = useState('all');

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <EvaPanel label="ACCESS DENIED" sysId="AUTH-00" accent="crimson">
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
            <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
              Connect Your Wallet
            </h2>
            <p className="font-mono text-sm text-foreground/50 mt-2 tracking-wider">
              Connect your wallet to access the operator dashboard.
            </p>
          </div>
        </EvaPanel>
      </div>
    );
  }

  if (!stats?.approved) {
    return (
      <div className="container mx-auto py-8 px-4">
        <EvaPanel
          label="OPERATOR ACCESS REQUIRED"
          sysId="AUTH-01"
          status="warning"
          accent="crimson"
        >
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="font-mono text-xl font-bold tracking-[0.15em] uppercase">
              Operator Access Required
            </h2>
            <p className="font-mono text-sm text-foreground/50 mt-2 max-w-md mx-auto tracking-wider">
              Your wallet is not approved as an RWY operator. Contact the
              platform administrator to request operator access.
            </p>
            <EvaScanLine variant="mixed" />
            <div className="mt-6 p-4 bg-background/40 border border-border/20 max-w-md mx-auto">
              <p className="font-mono text-xs text-foreground/40 tracking-[0.2em] uppercase">
                Your Address
              </p>
              <p className="font-mono text-sm mt-1">{walletAddress}</p>
            </div>
          </div>
        </EvaPanel>
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
        <div className="flex items-center gap-3">
          <LaurelAccent side="left" />
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase">
              Operator Dashboard
            </h1>
            <p className="font-mono text-sm text-foreground/50 tracking-wider">
              Manage your RWY opportunities and track processing progress
            </p>
          </div>
          <LaurelAccent side="right" />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/node/rwy/create">
            <TrapButton variant="gold">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Opportunity
              </span>
            </TrapButton>
          </Link>
        </div>
      </div>

      <GreekKeyStrip color="gold" />

      {/* Operator Stats */}
      <EvaSectionMarker section="OPERATOR METRICS" label="System Overview" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HexStatCard
          label="Reputation"
          value={String(stats.reputation)}
          color="gold"
          powerLevel={Math.min(10, Math.round(stats.reputation / 10))}
        />

        <HexStatCard
          label="Successful Ops"
          value={String(stats.successfulOps)}
          color="emerald"
          powerLevel={Math.min(10, stats.successfulOps)}
        />

        <HexStatCard
          label="Active"
          value={String(stats.activeOpportunities)}
          color="gold"
          powerLevel={Math.min(10, stats.activeOpportunities * 2)}
        />

        <HexStatCard
          label="Total Processed"
          value={`$${Number(formatErc20Balance(stats.totalValueProcessed, 18)).toLocaleString()}`}
          color="crimson"
        />
      </div>

      <EvaScanLine variant="mixed" />

      {/* Opportunities Tabs */}
      <EvaSectionMarker section="OPPORTUNITIES" label="Portfolio" />

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
              <AlertCircle className="h-12 w-12 text-crimson mx-auto mb-4" />
              <p className="font-mono text-sm text-crimson tracking-wider">
                {error}
              </p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <EvaPanel label="NO DATA" sysId="OPP-00" accent="crimson">
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
                <h3 className="font-mono text-lg font-bold tracking-[0.15em] uppercase">
                  No Opportunities
                </h3>
                <p className="font-mono text-sm text-foreground/50 mt-2 tracking-wider">
                  {activeTab === 'all'
                    ? "You haven't created any opportunities yet."
                    : `No ${activeTab} opportunities.`}
                </p>
                {activeTab === 'all' && (
                  <Link href="/node/rwy/create">
                    <TrapButton variant="gold" className="mt-6">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Your First Opportunity
                      </span>
                    </TrapButton>
                  </Link>
                )}
              </div>
            </EvaPanel>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opp) => (
                <EvaPanel
                  key={opp.id}
                  label={opp.name}
                  sysId={`RWY-${String(opp.id).slice(0, 6).toUpperCase()}`}
                  status={
                    opp.status === RWYOpportunityStatus.COMPLETED
                      ? 'active'
                      : opp.status === RWYOpportunityStatus.FUNDING
                        ? 'pending'
                        : 'active'
                  }
                >
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <p className="font-mono text-sm text-foreground/50 line-clamp-1 tracking-wider">
                          {opp.description}
                        </p>
                        <EvaStatusBadge
                          status={getEvaBadgeStatus(opp.status)}
                          label={RWYStatusLabels[opp.status]}
                        />
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between font-mono text-xs tracking-[0.15em] uppercase">
                          <span className="text-foreground/50">
                            Funding Progress
                          </span>
                          <span className="text-gold font-bold">
                            {opp.formattedProgress}
                          </span>
                        </div>
                        <EvaProgress
                          value={opp.fundingProgress}
                          color={
                            opp.fundingProgress >= 100 ? 'emerald' : 'gold'
                          }
                        />
                      </div>

                      <EvaScanLine variant="gold" />

                      <div className="grid grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                            TVL
                          </p>
                          <p className="font-mono text-sm font-bold text-gold">
                            {opp.formattedTVL}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                            Goal
                          </p>
                          <p className="font-mono text-sm font-bold text-foreground/80">
                            {opp.formattedGoal}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                            Yield
                          </p>
                          <p className="font-mono text-sm font-bold text-emerald-400">
                            {opp.formattedYield}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                            Stakers
                          </p>
                          <p className="font-mono text-sm font-bold text-foreground/80">
                            {opp.stakerCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-48 lg:ml-6 mt-4 lg:mt-0 lg:border-l border-border/20 lg:pl-6 flex flex-col justify-center gap-3">
                      <Link href={`/node/rwy/${opp.id}`}>
                        <TrapButton variant="gold" className="w-full">
                          <span className="flex items-center justify-center gap-2">
                            Manage
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </TrapButton>
                      </Link>
                      {opp.status === RWYOpportunityStatus.FUNDING && (
                        <Button variant="outline" className="w-full">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </EvaPanel>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GreekKeyStrip color="crimson" />
    </div>
  );
}
