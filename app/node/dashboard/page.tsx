'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { StatCard } from '@/components/ui/stat-card';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNode } from '@/app/providers/node.provider';
import {
  getNode,
  getOwnedNodeAddressList,
  updateNodeStatus,
  updateSupportedAssets,
  TokenizedAsset,
  getNodeAssets,
  getAssetName,
  updateAssetCapacity,
  getTokenizedAmount,
  nodeMintAsset,
} from '@/dapp-connectors/aurum-controller';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MapView } from '@/components/ui/map-view';

const tokenizeFormSchema = z.object({
  assetId: z.string({
    required_error: 'Please select an asset.',
  }),
  quantity: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid quantity greater than 0.',
    },
  ),
});

interface EditingCapacity {
  id: number;
  value: string;
}

export default function NodeDashboardPage() {
  const { currentNodeData, selectedNode, orders, loadNodes } = useNode();
  const router = useRouter();

  // Form and dialog states
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isAddingNewAsset, setIsAddingNewAsset] = useState(false);
  const [newAssetId, setNewAssetId] = useState('');
  const [isViewingOrders, setIsViewingOrders] = useState(false);
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);

  // Status and capacity states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);
  const [editingCapacity, setEditingCapacity] =
    useState<EditingCapacity | null>(null);

  // Form handling
  const form = useForm<z.infer<typeof tokenizeFormSchema>>({
    resolver: zodResolver(tokenizeFormSchema),
    defaultValues: {
      assetId: '',
      quantity: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof tokenizeFormSchema>) => {
    if (!selectedNode) return;

    setIsTokenizing(true);
    try {
      // Add your tokenization logic here
      toast.success('Asset tokenized successfully');
      setIsAddAssetOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to tokenize asset');
    } finally {
      setIsTokenizing(false);
    }
  };

  // Computed values from currentNodeData with proper type handling
  const supportedAssets = currentNodeData?.supportedAssets?.length || 0;
  const totalCapacity =
    currentNodeData?.capacity?.reduce(
      (prev, curr) => Number(prev) + Number(curr),
      0,
    ) || 0;

  useEffect(() => {
    const loadAssets = async () => {
      if (selectedNode) {
        try {
          const nodeAssets = await getNodeAssets(selectedNode);
          setAssets(nodeAssets);
        } catch (error) {
          console.error('Error loading assets:', error);
        }
      }
    };
    loadAssets();
  }, [selectedNode]);

  // Map BigNumberish values to numbers for display
  const nodeAssets =
    currentNodeData?.supportedAssets?.map((assetId, index) => ({
      id: Number(assetId),
      capacity: Number(currentNodeData.capacity[index]),
    })) || [];

  // Fix the asset rows rendering with proper types
  const renderAssetRows = () => {
    if (!currentNodeData?.supportedAssets) return null;

    return Array.from(currentNodeData.supportedAssets).map((assetId, index) => {
      const id = Number(assetId);
      return (
        <tr key={id} className="border-b">
          <td className="p-4">{id}</td>
          <td className="p-4">{getAssetName(id)}</td>
          <td className="p-4">
            {editingCapacity?.id === id ? (
              <Input
                type="number"
                value={editingCapacity.value}
                onChange={(e) =>
                  setEditingCapacity({ id, value: e.target.value })
                }
                className="w-24"
                placeholder="Enter new total amount"
              />
            ) : (
              Number(currentNodeData.capacity[index])
            )}
          </td>
          <td className="p-4 flex gap-2">
            {editingCapacity?.id === id ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUpdatingCapacity}
                  onClick={async () => {
                    setIsUpdatingCapacity(true);
                    try {
                      await handleCapacityUpdate(id, editingCapacity.value);
                    } catch (error) {
                      toast.error('Failed to update amount');
                    } finally {
                      setIsUpdatingCapacity(false);
                    }
                  }}
                >
                  {isUpdatingCapacity ? (
                    <>
                      <LoadingSpinner />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCapacity(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEditingCapacity({
                    id,
                    value: currentNodeData.capacity[index].toString(),
                  })
                }
              >
                Edit Amount
              </Button>
            )}
          </td>
        </tr>
      );
    });
  };

  const handleStatusUpdate = async () => {
    if (!currentNodeData || !selectedNode) return;

    setIsUpdatingStatus(true);
    try {
      const newStatus = currentNodeData.status === '0x01' ? '0x00' : '0x01';
      await updateNodeStatus(selectedNode, newStatus);
      const updatedData = await getNode(selectedNode);
      // Update node data through context
      toast.success('Node status updated successfully');
    } catch (error) {
      toast.error('Failed to update node status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCapacityUpdate = async (assetId: number, newValue: string) => {
    if (!currentNodeData || !selectedNode) return;

    setIsUpdatingCapacity(true);
    try {
      const tx = await updateAssetCapacity(
        selectedNode,
        assetId,
        parseInt(newValue),
        currentNodeData.supportedAssets,
        currentNodeData.capacity,
      );

      // Wait for transaction to be mined
      await tx.wait();

      // Update the node data in context
      await loadNodes(); // This will refresh the nodes data in context

      setEditingCapacity(null);
      toast.success('Capacity updated successfully');
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast.error('Failed to update capacity');
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  if (!currentNodeData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Node Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-400">
              Status:{' '}
              {currentNodeData?.status === '0x01' ? 'Active' : 'Inactive'}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={handleStatusUpdate}
            >
              {isUpdatingStatus ? (
                <>
                  <LoadingSpinner />
                  Updating...
                </>
              ) : currentNodeData?.status === '0x01' ? (
                'Deactivate'
              ) : (
                'Activate'
              )}
            </Button>
          </div>
        </div>
        <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
          <DialogTrigger asChild>
            <Button disabled={isTokenizing}>
              {isTokenizing ? (
                <>
                  <LoadingSpinner />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Asset
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tokenize New Asset</DialogTitle>
              <DialogDescription>
                Add a new asset to be tokenized in the network.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setIsAddingNewAsset(true);
                          } else {
                            field.onChange(value);
                            setIsAddingNewAsset(false);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nodeAssets.map((asset) => (
                            <SelectItem
                              key={asset.id}
                              value={asset.id.toString()}
                            >
                              Asset #{asset.id} (Capacity: {asset.capacity})
                            </SelectItem>
                          ))}
                          <SelectItem value="new">+ Add New Asset</SelectItem>
                        </SelectContent>
                      </Select>
                      {isAddingNewAsset && (
                        <div className="mt-2">
                          <FormLabel>New Asset ID</FormLabel>
                          <Input
                            type="number"
                            placeholder="Enter new asset ID"
                            value={newAssetId}
                            onChange={(e) => {
                              setNewAssetId(e.target.value);
                              field.onChange(e.target.value);
                            }}
                          />
                          <FormDescription>
                            Enter a unique ID for the new asset
                          </FormDescription>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter quantity"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the number of assets to tokenize.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isTokenizing}
                >
                  {isTokenizing ? (
                    <>
                      <LoadingSpinner />
                      Tokenizing...
                    </>
                  ) : (
                    'Tokenize Asset'
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Supported Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCard title="Count" value={supportedAssets.toString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCard title="Units" value={totalCapacity.toString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Node Address</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono">
              {selectedNode || 'No node registered'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tokenized Assets Table - Shows actual minted tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Tokenized Assets</CardTitle>
          <CardDescription>
            Current tokenized assets on this node
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Minted Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b">
                    <td className="px-6 py-4">{asset.id}</td>
                    <td className="px-6 py-4">{getAssetName(asset.id)}</td>
                    <td className="px-6 py-4">{asset.amount}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          asset.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Asset Capacity Table - Shows and allows editing of max capacities */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Capacities</CardTitle>
          <CardDescription>
            Maximum capacity for each supported asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">Asset ID</th>
                  <th className="h-12 px-4 text-left align-middle">Name</th>
                  <th className="h-12 px-4 text-left align-middle">Capacity</th>
                  <th className="h-12 px-4 text-left align-middle">Actions</th>
                </tr>
              </thead>
              <tbody>{renderAssetRows()}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Track your accepted orders and their status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              setIsViewingOrders(true);
              try {
                await router.push('/node/orders');
              } finally {
                setIsViewingOrders(false);
              }
            }}
            disabled={isViewingOrders}
          >
            {isViewingOrders ? (
              <>
                <LoadingSpinner />
                Loading Orders...
              </>
            ) : (
              'View All Orders'
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">Order ID</th>
                  <th className="h-12 px-4 text-left align-middle">Customer</th>
                  <th className="h-12 px-4 text-left align-middle">Asset</th>
                  <th className="h-12 px-4 text-left align-middle">Quantity</th>
                  <th className="h-12 px-4 text-left align-middle">Value</th>
                  <th className="h-12 px-4 text-left align-middle">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-4">{order.id}</td>
                    <td className="p-4">{order.customer}</td>
                    <td className="p-4 capitalize">{order.asset}</td>
                    <td className="p-4">{order.quantity}</td>
                    <td className="p-4">{order.value} USDT</td>
                    <td className="p-4 capitalize">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Node Location (full width) */}
      <div className="col-span-full">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Node Location</CardTitle>
            <CardDescription>
              Physical location of your node in the network
            </CardDescription>
          </CardHeader>
          <MapView
            lat={currentNodeData.location.location.lat}
            lng={currentNodeData.location.location.lng}
            addressName={currentNodeData.location.addressName}
          />
        </Card>
      </div>
    </div>
  );
}
