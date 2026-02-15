'use client';

import { useState } from 'react';
import {
  useActiveRWYOpportunities,
  useRWYOpportunities,
} from '@/hooks/useRWYOpportunities';
import { RWYOpportunityStatus } from '@/domain/rwy';
import {
  OpportunityCard,
  OpportunityCardSkeleton,
} from '@/app/components/rwy/opportunity-card';
import {
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export default function RWYOpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const {
    opportunities: allOpportunities,
    loading,
    error,
    refetch,
  } = useRWYOpportunities();
  const { opportunities: activeOpportunities } = useActiveRWYOpportunities();

  // Filter opportunities based on tab and search
  const filteredOpportunities = allOpportunities.filter((opp) => {
    const matchesSearch =
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchQuery.toLowerCase());

    switch (activeTab) {
      case 'active':
        return matchesSearch && opp.status === RWYOpportunityStatus.FUNDING;
      case 'in-progress':
        return (
          matchesSearch &&
          [
            RWYOpportunityStatus.FUNDED,
            RWYOpportunityStatus.IN_TRANSIT,
            RWYOpportunityStatus.PROCESSING,
            RWYOpportunityStatus.SELLING,
            RWYOpportunityStatus.DISTRIBUTING,
          ].includes(opp.status)
        );
      case 'completed':
        return matchesSearch && opp.status === RWYOpportunityStatus.COMPLETED;
      case 'all':
      default:
        return matchesSearch;
    }
  });

  const stats = {
    active: allOpportunities.filter(
      (o) => o.status === RWYOpportunityStatus.FUNDING,
    ).length,
    inProgress: allOpportunities.filter((o) =>
      [
        RWYOpportunityStatus.FUNDED,
        RWYOpportunityStatus.IN_TRANSIT,
        RWYOpportunityStatus.PROCESSING,
        RWYOpportunityStatus.SELLING,
        RWYOpportunityStatus.DISTRIBUTING,
      ].includes(o.status),
    ).length,
    completed: allOpportunities.filter(
      (o) => o.status === RWYOpportunityStatus.COMPLETED,
    ).length,
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Greek Key Strip */}
      <GreekKeyStrip color="gold" />

      {/* Header */}
      <div className="space-y-3">
        <EvaSectionMarker section="RWY" label="Yield Opportunities" />
        <div className="flex items-center gap-3">
          <LaurelAccent side="left" />
          <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase">
            Real World Yield Opportunities
          </h1>
          <LaurelAccent side="right" />
        </div>
        <p className="text-foreground/50 font-mono text-sm tracking-[0.08em] max-w-2xl">
          Stake your tokenized commodities into processing opportunities and
          earn real-world yields. Your assets are processed by verified
          operators and profits are automatically distributed.
        </p>
      </div>

      <EvaScanLine variant="mixed" />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Active
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums">
                {stats.active}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                In Progress
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums">
                {stats.inProgress}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Completed
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-mono tracking-[0.15em] uppercase text-foreground/40">
                Total
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums">
                {allOpportunities.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <EvaScanLine variant="gold" />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="font-mono tracking-[0.08em] uppercase text-xs">
              Active
            </span>
            <EvaStatusBadge status="active" label={String(stats.active)} />
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-mono tracking-[0.08em] uppercase text-xs">
              In Progress
            </span>
            <EvaStatusBadge
              status="processing"
              label={String(stats.inProgress)}
            />
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-mono tracking-[0.08em] uppercase text-xs">
              Completed
            </span>
            <EvaStatusBadge
              status="completed"
              label={String(stats.completed)}
            />
          </TabsTrigger>
          <TabsTrigger value="all">
            <span className="font-mono tracking-[0.08em] uppercase text-xs">
              All
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <OpportunityCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-mono text-lg font-bold tracking-[0.1em] uppercase">
                Error Loading Opportunities
              </h3>
              <p className="text-foreground/40 font-mono text-sm mt-2">
                {error}
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-mono text-lg font-bold tracking-[0.1em] uppercase">
                No Opportunities Found
              </h3>
              <p className="text-foreground/40 font-mono text-sm mt-2">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Check back later for new opportunities'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GreekKeyStrip color="gold" />
    </div>
  );
}
