'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useNodes } from '@/app/providers/nodes.provider';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { AnimatedNumber } from '@/app/components/ui/animated-number';
import {
  RefreshCw,
  Plus,
  MapPin,
  Server,
  Package,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NodeOverview = {
  address: string;
  status: string;
  location: {
    addressName: string;
    location: {
      lat: string;
      lng: string;
    };
  };
  supportedAssets: number[];
  capacity: number[];
};

/**
 * NodeOverviewPage - Terminal-styled node management dashboard
 */
export default function NodeOverviewPage() {
  const { setCurrentUserRole } = useMainProvider();
  const { nodes, loading, refreshNodes } = useNodes();
  const { selectNode } = useSelectedNode();
  const router = useRouter();

  useEffect(() => {
    setCurrentUserRole('node');
  }, [setCurrentUserRole]);

  const handleNodeSelect = async (nodeAddress: string) => {
    await selectNode(nodeAddress);
    router.push(`/node/dashboard?nodeId=${nodeAddress}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading nodes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Node Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all your nodes from one place
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GlowButton
              variant="outline"
              onClick={() => refreshNodes()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </GlowButton>
            <GlowButton
              variant="primary"
              onClick={() => router.push('/node/register')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Register Node
            </GlowButton>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard hover className="relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-accent blur-2xl opacity-20" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Nodes
                </p>
                <AnimatedNumber
                  value={nodes?.length || 0}
                  size="lg"
                  className="font-bold text-foreground"
                />
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <Server className="w-6 h-6 text-accent" />
              </div>
            </div>
          </GlassCard>

          <GlassCard hover className="relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-green-500 blur-2xl opacity-20" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Active Nodes
                </p>
                <AnimatedNumber
                  value={
                    nodes?.filter((n) => n.status === 'Active').length || 0
                  }
                  size="lg"
                  className="font-bold text-foreground"
                />
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </GlassCard>

          <GlassCard hover className="relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-purple-500 blur-2xl opacity-20" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Assets
                </p>
                <AnimatedNumber
                  value={
                    nodes?.reduce(
                      (sum, n) => sum + ((n as any)?.assets?.length ?? 0),
                      0,
                    ) || 0
                  }
                  size="lg"
                  className="font-bold text-foreground"
                />
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Package className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Nodes Grid */}
        {nodes && nodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodes.map((node) => {
              const isActive = node.status === 'Active';
              const totalCapacity = ((node as any)?.assets ?? []).reduce(
                (sum: number, a: any) => sum + Number(a?.capacity ?? 0),
                0,
              );
              const assetCount = (node as any)?.assets?.length ?? 0;

              return (
                <GlassCard
                  key={node.address}
                  hover
                  className="cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => handleNodeSelect(node.address)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            isActive ? 'bg-green-500/10' : 'bg-red-500/10',
                          )}
                        >
                          <Server
                            className={cn(
                              'w-5 h-5',
                              isActive ? 'text-green-400' : 'text-red-400',
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Node
                          </h3>
                          <p className="text-xs font-mono text-muted-foreground truncate max-w-[150px]">
                            {node.address}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={isActive ? 'success' : 'error'}
                        label={isActive ? 'Active' : 'Inactive'}
                        size="sm"
                      />
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {node.location.addressName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {node.location.location.lat},{' '}
                          {node.location.location.lng}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-glass-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Assets</p>
                        <p className="text-lg font-semibold text-foreground">
                          {assetCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Capacity
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {totalCapacity} units
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    <GlowButton variant="outline" className="w-full">
                      View Dashboard
                    </GlowButton>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard className="text-center py-16">
            <Server className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Nodes Found
            </h3>
            <p className="text-muted-foreground mb-6">
              Register your first node to get started with the network
            </p>
            <GlowButton
              variant="primary"
              onClick={() => router.push('/node/register')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Register Node
            </GlowButton>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
