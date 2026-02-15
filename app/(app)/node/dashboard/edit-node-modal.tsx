'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { BigNumberish } from 'ethers';
import { Node } from '@/domain/node';

interface EditNodeModalProps {
  nodeAddress: string;
  nodeData: Pick<Node, 'status' | 'assets'>;
  assetNames: Record<number, string>;
  onNodeUpdated: () => Promise<void>;
}

export function EditNodeModal({
  nodeAddress,
  nodeData,
  assetNames,
  onNodeUpdated,
}: EditNodeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('assets');
  const { updateNodeStatus } = useSelectedNode();
  const { toast } = useToast();

  // Asset capacity and price states
  const [capacities, setCapacities] = useState<Record<number, string>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});

  // Initialize form values when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Initialize capacities and prices from nodeData
      const initialCapacities: Record<number, string> = {};
      const initialPrices: Record<number, string> = {};

      // Initialize from assets array
      const assets = nodeData.assets || [];

      assets.forEach((asset, index) => {
        const id = Number(asset.tokenId);
        initialCapacities[id] = asset.capacity?.toString() || '0';
        initialPrices[id] = asset.price?.toString() || '0';
      });

      setCapacities(initialCapacities);
      setPrices(initialPrices);
    }

    setIsOpen(open);
  };

  const handleCapacityChange = (assetId: number, value: string) => {
    setCapacities((prev) => ({
      ...prev,
      [assetId]: value,
    }));
  };

  const handlePriceChange = (assetId: number, value: string) => {
    setPrices((prev) => ({
      ...prev,
      [assetId]: value,
    }));
  };

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      // Check against the string 'Active' now
      const newStatus = nodeData.status === 'Active' ? 'Inactive' : 'Active';
      await updateNodeStatus(newStatus);
      // await onNodeUpdated(); // Remove this immediate refresh
      toast({
        title: 'Success',
        description: 'Node status updated successfully',
      });
    } catch (error) {
      console.error('Error updating node status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update node status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAssets = async () => {
    setIsUpdating(true);
    try {
      // Get asset IDs from the assets array
      const assets = nodeData.assets || [];
      const assetIds = assets.map((asset) => Number(asset.tokenId));

      // Create new capacity and price arrays using component state
      const newCapacities = assetIds.map((assetId) => {
        return Number(capacities[assetId] || '0');
      });

      const newPrices = assetIds.map((assetId) => {
        return Number(prices[assetId] || '0');
      });

      // TODO: Implement updateSupportedAssets in the provider
      // For now, just log the data
      console.log('Updating assets:', { assetIds, newCapacities, newPrices });

      await onNodeUpdated(); // Refresh node data
      toast({
        title: 'Success',
        description: 'Node assets updated successfully',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating node assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to update node assets',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Node</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Node</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="status">Node Status</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Node Status</h3>
                <p className="text-sm text-gray-500">
                  Current status: {nodeData.status}
                </p>
              </div>
              <Button onClick={handleStatusUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Updating...</span>
                  </>
                ) : nodeData.status === 'Active' ? (
                  'Deactivate Node'
                ) : (
                  'Activate Node'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Asset Capacities & Prices</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Asset</th>
                      <th className="text-left py-2">Capacity</th>
                      {/* Price column removed as Node domain doesn't include assetPrices */}
                    </tr>
                  </thead>
                  <tbody>
                    {(nodeData.assets || []).map((asset) => {
                      const id = Number(asset.tokenId);
                      return (
                        <tr key={id} className="border-b">
                          <td className="py-3">
                            {assetNames[id] || `Asset #${id}`}
                          </td>
                          <td className="py-3">
                            <Input
                              type="number"
                              value={capacities[id] || ''}
                              onChange={(e) =>
                                handleCapacityChange(id, e.target.value)
                              }
                              className="w-full"
                              placeholder="Enter capacity"
                            />
                          </td>
                          {/* Price input removed */}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveAssets} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
