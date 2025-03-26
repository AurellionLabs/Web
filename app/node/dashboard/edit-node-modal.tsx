'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  updateNodeStatus,
  updateAssetCapacity,
  updateAssetPrice,
  updateSupportedAssets,
} from '@/dapp-connectors/aurum-controller';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BigNumberish, BytesLike } from 'ethers';

interface EditNodeModalProps {
  nodeAddress: string;
  nodeData: {
    status: BytesLike;
    supportedAssets: BigNumberish[];
    capacity: BigNumberish[];
    assetPrices: BigNumberish[];
  };
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

  // Asset capacity and price states
  const [capacities, setCapacities] = useState<Record<number, string>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});

  // Initialize form values when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Initialize capacities and prices from nodeData
      const initialCapacities: Record<number, string> = {};
      const initialPrices: Record<number, string> = {};

      nodeData.supportedAssets.forEach((assetId, index) => {
        const id = Number(assetId);
        initialCapacities[id] = nodeData.capacity[index]?.toString() || '0';
        initialPrices[id] = nodeData.assetPrices[index]?.toString() || '0';
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
      const newStatus = nodeData.status === '0x01' ? '0x00' : '0x01';
      await updateNodeStatus(nodeAddress, newStatus);
      await onNodeUpdated();
      toast.success('Node status updated successfully');
    } catch (error) {
      console.error('Error updating node status:', error);
      toast.error('Failed to update node status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAssets = async () => {
    setIsUpdating(true);
    try {
      // Convert to arrays for the contract function
      const supportedAssetsBigInt = Array.from(nodeData.supportedAssets).map(
        (asset) => BigInt(asset.toString()),
      );

      // Create new capacity and price arrays
      const newCapacities = supportedAssetsBigInt.map((assetId) => {
        const id = Number(assetId);
        return BigInt(capacities[id] || '0');
      });

      const newPrices = supportedAssetsBigInt.map((assetId) => {
        const id = Number(assetId);
        return BigInt(prices[id] || '0');
      });

      // Update capacities and prices in one transaction
      await updateSupportedAssets(
        nodeAddress,
        newCapacities,
        supportedAssetsBigInt,
        newPrices,
      );

      await onNodeUpdated();
      toast.success('Node assets updated successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating node assets:', error);
      toast.error('Failed to update node assets');
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
                  Current status:{' '}
                  {nodeData.status === '0x01' ? 'Active' : 'Inactive'}
                </p>
              </div>
              <Button onClick={handleStatusUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Updating...</span>
                  </>
                ) : nodeData.status === '0x01' ? (
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
                      <th className="text-left py-2">Price (wei)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(nodeData.supportedAssets).map(
                      (assetId, index) => {
                        const id = Number(assetId);
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
                            <td className="py-3">
                              <Input
                                type="number"
                                value={prices[id] || ''}
                                onChange={(e) =>
                                  handlePriceChange(id, e.target.value)
                                }
                                className="w-full"
                                placeholder="Enter price"
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
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
