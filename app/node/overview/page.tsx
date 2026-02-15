'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useNodes } from '@/app/providers/nodes.provider';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import {
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  HexCluster,
  HexStatCard,
} from '@/app/components/eva/eva-components';
import {
  PulsingHexNetwork,
  AnimatedCounterCards,
  SpinningReticle,
} from '@/app/components/eva/eva-animations';
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
        <div className="flex flex-col items-center gap-6">
          <SpinningReticle size={120} label="LOADING" />
          <span className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/50">
            Loading nodes...
          </span>
        </div>
      </div>
    );
  }

  const totalNodes = nodes?.length || 0;
  const activeNodes = nodes?.filter((n) => n.status === 'Active').length || 0;
  const totalAssets =
    nodes?.reduce((sum, n) => sum + ((n as any)?.assets?.length ?? 0), 0) || 0;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Decorative top strip */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                Node Overview
              </h1>
              <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40 mt-1">
                Manage all your nodes from one place
              </p>
            </div>
            <LaurelAccent side="right" />
          </div>
          <div className="flex items-center gap-3">
            <SpinningReticle
              size={56}
              label="UPTIME"
              className="hidden sm:block"
            />
            <TrapButton variant="gold" size="sm" onClick={() => refreshNodes()}>
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </span>
            </TrapButton>
            <TrapButton
              variant="emerald"
              onClick={() => router.push('/node/register')}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Register Node
              </span>
            </TrapButton>
          </div>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Stats Overview — Animated Counter Cards */}
        <EvaSectionMarker section="SYSTEM STATUS" label="Node Statistics" />

        <AnimatedCounterCards
          items={[
            { label: 'Total Nodes', target: totalNodes },
            { label: 'Active Nodes', target: activeNodes },
            { label: 'Total Assets', target: totalAssets },
          ]}
        />

        <EvaScanLine variant="gold" />

        {/* HexStatCard Row — Persistent stat reference */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HexStatCard
            label="Total Nodes"
            value={String(totalNodes)}
            sub="Registered"
            color="gold"
            powerLevel={Math.min(10, totalNodes)}
          />
          <HexStatCard
            label="Active Nodes"
            value={String(activeNodes)}
            sub={`${totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 100) : 0}% online`}
            color="emerald"
            powerLevel={
              totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 10) : 0
            }
          />
          <HexStatCard
            label="Total Assets"
            value={String(totalAssets)}
            sub="Managed"
            color="crimson"
            powerLevel={Math.min(10, totalAssets)}
          />
        </div>

        <EvaScanLine variant="crimson" />

        {/* Network Topology */}
        <EvaSectionMarker
          section="NETWORK TOPOLOGY"
          label="Node Map"
          variant="gold"
        />
        <PulsingHexNetwork />

        <HexCluster size="md" className="justify-center my-2" />
        <EvaScanLine variant="mixed" />

        {/* Nodes Grid */}
        <EvaSectionMarker
          section="REGISTERED NODES"
          label="Management Console"
        />

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
                <div
                  key={node.address}
                  className="cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => handleNodeSelect(node.address)}
                >
                  <EvaPanel
                    label="Node"
                    sublabel={
                      node.address.slice(0, 8) + '...' + node.address.slice(-4)
                    }
                    status={isActive ? 'active' : 'pending'}
                    accent={isActive ? 'gold' : 'crimson'}
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 flex items-center justify-center',
                              isActive ? 'bg-emerald-500/10' : 'bg-crimson/10',
                            )}
                            style={{
                              clipPath:
                                'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                            }}
                          >
                            <Server
                              className={cn(
                                'w-5 h-5',
                                isActive ? 'text-emerald-400' : 'text-crimson',
                              )}
                            />
                          </div>
                          <div>
                            <h3 className="font-mono font-bold tracking-[0.15em] uppercase text-foreground">
                              Node
                            </h3>
                            <p className="font-mono text-[10px] tracking-[0.1em] text-foreground/40 truncate max-w-[150px]">
                              {node.address}
                            </p>
                          </div>
                        </div>
                        <EvaStatusBadge
                          status={isActive ? 'active' : 'pending'}
                          label={isActive ? 'ACTIVE' : 'INACTIVE'}
                        />
                      </div>

                      <EvaScanLine variant="gold" />

                      {/* Location */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gold/50 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-mono text-sm tracking-[0.05em] text-foreground/70 line-clamp-2">
                            {node.location.addressName}
                          </p>
                          <p className="font-mono text-[10px] tracking-[0.1em] text-foreground/30 mt-0.5">
                            {node.location.location.lat},{' '}
                            {node.location.location.lng}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
                            Assets
                          </p>
                          <p className="font-mono text-lg font-bold text-gold tabular-nums">
                            {assetCount}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
                            Capacity
                          </p>
                          <p className="font-mono text-lg font-bold text-gold tabular-nums">
                            {totalCapacity} units
                          </p>
                        </div>
                      </div>

                      <HexCluster size="sm" className="justify-center" />

                      {/* Action */}
                      <TrapButton variant="gold" className="w-full">
                        View Dashboard
                      </TrapButton>
                    </div>
                  </EvaPanel>
                </div>
              );
            })}
          </div>
        ) : (
          <EvaPanel label="No Nodes" status="offline" accent="crimson">
            <div className="text-center py-16">
              <Server className="w-16 h-16 text-foreground/10 mx-auto mb-4" />
              <HexCluster size="md" className="justify-center mb-4" />
              <h3 className="font-mono text-lg font-bold tracking-[0.15em] uppercase text-foreground mb-2">
                No Nodes Found
              </h3>
              <p className="font-mono text-sm tracking-[0.1em] text-foreground/40 mb-6">
                Register your first node to get started with the network
              </p>
              <TrapButton
                variant="emerald"
                onClick={() => router.push('/node/register')}
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Register Node
                </span>
              </TrapButton>
            </div>
          </EvaPanel>
        )}

        {/* Bottom decorative strip */}
        <GreekKeyStrip color="crimson" />
      </div>
    </div>
  );
}
