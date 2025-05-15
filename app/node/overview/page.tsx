'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMainProvider } from '@/app/providers/main.provider';
import { useNode } from '@/app/providers/node.provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

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

export default function NodeOverviewPage() {
  console.log('[NodeOverviewPage] Rendering...');
  const { setCurrentUserRole } = useMainProvider();
  const { nodes, loading, loadNodes, selectNode, getNode } = useNode();
  const router = useRouter();

  console.log('[NodeOverviewPage] Nodes from useNode:', nodes);
  console.log('[NodeOverviewPage] Loading state from useNode:', loading);

  useEffect(() => {
    console.log('[NodeOverviewPage] useEffect running...');
    setCurrentUserRole('node');
  }, [setCurrentUserRole]);

  const handleNodeSelect = async (nodeAddress: string) => {
    await selectNode(nodeAddress);
    router.push(`/node/dashboard?node=${nodeAddress}`);
  };

  if (loading) {
    console.log('[NodeOverviewPage] Loading is true, showing spinner.');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  console.log(
    '[NodeOverviewPage] Final nodes state before rendering list (loading is false):',
    nodes,
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Node Overview</h1>
          <p className="text-gray-500">Manage all your nodes from one place</p>
        </div>
        <Button onClick={() => router.push('/node/register')}>
          Register New Node
        </Button>
      </div>

      {nodes && nodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node) => {
            return (
              <Card
                key={node.address}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle>Node</CardTitle>
                  <CardDescription className="truncate font-mono">
                    {node.address}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p
                        className={`text-sm ${
                          node.status === 'Active'
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        {node.status === 'Active' ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm">{node.location.addressName}</p>
                      <div className="flex gap-2 text-sm text-gray-500">
                        <span>Lat: {node.location.location.lat}</span>
                        <span>Lng: {node.location.location.lng}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Supported Assets</p>
                      <p className="text-sm">
                        {node.supportedAssets.length} assets
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Capacity</p>
                      <p className="text-sm">
                        {node.capacity.reduce(
                          (sum, cap) => Number(sum) + Number(cap),
                          0,
                        )}{' '}
                        units
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleNodeSelect(node.address)}
                    >
                      View Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No nodes found. Register your first node to get started.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push('/node/register')}
          >
            Register Node
          </Button>
        </div>
      )}
    </div>
  );
}
