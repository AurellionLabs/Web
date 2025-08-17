'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Form } from '@/app/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { StatCard } from '@/app/components/ui/stat-card';
import { useRouter } from 'next/navigation';
import { useNode } from '@/app/providers/node.provider';
import {
  TokenizedAsset,
  getAssetName,
} from '@/dapp-connectors/aurum-controller';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { MapView } from '@/app/components/ui/map-view';
import { EditNodeModal } from './edit-node-modal';
import AssetSelectionForm from './asset-selection-form';
import { usePlatform } from '@/app/providers/platform.provider';

const tokenizeFormSchema = z.object({
  assetClass: z.string().min(1, { message: 'Please select an asset class.' }),
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
  price: z
    .string()
    .regex(/^\d+$/, { message: 'Price must be a whole number (wei).' }),
  assetAttributes: z.record(z.string(), z.record(z.string(), z.any())),
});

interface EditingCapacity {
  id: number;
  value: string;
}

interface EditingPrice {
  id: number;
  value: string;
}

export default function NodeDashboardPage() {
  const {
    currentNodeData,
    selectedNode,
    orders,
    refreshNodes,
    mintAsset,
    getNodeAssets,
    updateNodeStatus,
    updateAssetCapacity,
    updateAssetPrice,
  } = useNode();
  const router = useRouter();

  // Form and dialog states
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isViewingOrders, setIsViewingOrders] = useState(false);
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  // Available assets state removed; assets now loaded per selected class inside the form
  const [assetAttributes, setAssetAttributes] = useState<
    Record<string, Record<string, any>>
  >({});

  // Status and capacity states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);
  const [editingCapacity, setEditingCapacity] =
    useState<EditingCapacity | null>(null);
  const [editingPrice, setEditingPrice] = useState<EditingPrice | null>(null);
  const { supportedAssetClasses } = usePlatform();
  // Form handling
  const form = useForm<z.infer<typeof tokenizeFormSchema>>({
    resolver: zodResolver(tokenizeFormSchema),
    defaultValues: {
      assetClass: '',
      assetId: '',
      quantity: '',
      price: '',
      assetAttributes: {},
    },
  });

  const onSubmit = async (values: z.infer<typeof tokenizeFormSchema>) => {
    if (!selectedNode || !currentNodeData) return;

    setCapacityError(null);
    setIsTokenizing(true);
    try {
      const assetId = Number(values.assetId);
      const quantity = Number(values.quantity);

      // --- Capacity Check Start ---
      const assetIndex = currentNodeData.supportedAssets.findIndex(
        (id) => Number(id) === assetId,
      );

      if (assetIndex === -1) {
        setCapacityError('Selected asset is not supported by this node.');
        setIsTokenizing(false);
        return;
      }

      const totalCapacity = Number(currentNodeData.capacity[assetIndex]);
      const currentTokenizedAsset = assets.find(
        (a) => Number(a.id) === assetId,
      );
      const currentAmount = currentTokenizedAsset
        ? Number(currentTokenizedAsset.amount)
        : 0;
      const remainingCapacity = totalCapacity - currentAmount;

      if (quantity > remainingCapacity) {
        setCapacityError(
          `You are exceeding capacity for ${getAssetName(assetId)}. Remaining capacity: ${remainingCapacity}. Increase capacity to tokenize more assets of this type.`,
        );
        setIsTokenizing(false);
        return;
      }
      // --- Capacity Check End ---

      // Log the attributes for debugging
      console.log('Asset Attributes:', assetAttributes);

      await mintAsset(selectedNode, assetId, quantity);

      // Refresh assets immediately after minting
      const nodeAssets = await getNodeAssets(selectedNode);
      setAssets(nodeAssets);

      toast.success('Asset tokenized successfully');
      setIsAddAssetOpen(false);
      form.reset();
      setCapacityError(null);

      // Clear attributes after successful tokenization
      setAssetAttributes({});
    } catch (error) {
      console.error('Error tokenizing asset:', error);
      setCapacityError('Failed to tokenize asset. Please try again.');
    } finally {
      setIsTokenizing(false);
    }
  };

  // Computed values from currentNodeData with proper type handling
  const supportedAssets = currentNodeData?.supportedAssets?.length || 0;
  const tokenizedValue = assets
    .reduce(
      (total, asset) => total + Number(asset.price) * Number(asset.amount),
      0,
    )
    .toFixed(2);

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

  // Removed: legacy merging of supported assets; selection now uses platform provider

  // Handle asset attribute changes
  const handleAssetAttributeChange = (
    assetId: number,
    attributeName: string,
    value: any,
  ) => {
    const currentAttributes = assetAttributes[assetId.toString()] || {};
    setAssetAttributes({
      ...assetAttributes,
      [assetId.toString()]: {
        ...currentAttributes,
        [attributeName]: value,
      },
    });
  };

  // Fix the asset rows rendering with proper types
  const renderAssetRows = () => {
    if (!currentNodeData?.supportedAssets) return null;

    return Array.from(currentNodeData.supportedAssets).map((assetId, index) => {
      const id = Number(assetId);
      return (
        <tr key={id} className="border-b">
          <td className="p-4">{id}</td>
          <td className="p-4">{getAssetName(id)}</td>
          <td className="p-4">{Number(currentNodeData.capacity[index])}</td>
        </tr>
      );
    });
  };

  const handleStatusUpdate = async () => {
    if (!currentNodeData || !selectedNode) return;

    setIsUpdatingStatus(true);
    try {
      const newStatus =
        currentNodeData.status === 'Active' ? 'Inactive' : 'Active';
      await updateNodeStatus(selectedNode, newStatus);
      await refreshNodes();
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
      await updateAssetCapacity(
        selectedNode,
        assetId,
        parseInt(newValue),
        Array.from(currentNodeData.supportedAssets).map((v) => Number(v)),
        currentNodeData.capacity,
        new Array(currentNodeData.capacity.length).fill(0),
      );

      await refreshNodes();
      setEditingCapacity(null);
      toast.success('Capacity updated successfully');
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast.error('Failed to update capacity');
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  const handlePriceUpdate = async (assetId: number, newValue: string) => {
    if (!currentNodeData || !selectedNode) return;

    try {
      await updateAssetPrice(
        selectedNode,
        assetId,
        Number(newValue),
        Array.from(currentNodeData.supportedAssets).map((v) => Number(v)),
        new Array(currentNodeData.capacity.length).fill(0),
      );

      await refreshNodes();
      setEditingPrice(null);
      toast.success('Price updated successfully');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
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
          <p className="text-gray-500">Manage your node and its assets</p>
        </div>
        <div className="flex gap-2">
          {currentNodeData && (
            <EditNodeModal
              nodeAddress={selectedNode!}
              nodeData={currentNodeData}
              assetNames={Object.fromEntries(
                Array.from(currentNodeData.supportedAssets || []).map((id) => [
                  Number(id),
                  getAssetName(Number(id)),
                ]),
              )}
              onNodeUpdated={refreshNodes}
            />
          )}
          <Dialog
            open={isAddAssetOpen}
            onOpenChange={(open) => {
              setIsAddAssetOpen(open);
              if (!open) {
                // Reset form and attributes when dialog is closed
                form.reset();
                setAssetAttributes({});
                setCapacityError(null);
              }
            }}
          >
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
                  <AssetSelectionForm
                    selectedAssetClass={form.watch('assetClass')}
                    selectedAssetId={form.watch('assetId')}
                    quantity={form.watch('quantity')}
                    price={form.watch('price')}
                    supportedAssetClasses={supportedAssetClasses}
                    onAssetClassChange={(value) => {
                      form.setValue('assetClass', value);
                    }}
                    onAssetIdChange={(value) => {
                      form.setValue('assetId', value);
                    }}
                    onQuantityChange={(value) =>
                      form.setValue('quantity', value)
                    }
                    onPriceChange={(value) => form.setValue('price', value)}
                    assetAttributes={assetAttributes}
                    onAssetAttributeChange={handleAssetAttributeChange}
                  />
                  {capacityError && (
                    <p className="text-sm font-medium text-red-500 dark:text-red-400">
                      {capacityError}
                    </p>
                  )}
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
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Supported Assets"
          value={supportedAssets.toString()}
          description="Total number of assets supported"
          icon={
            <div className="h-8 w-8 bg-blue-500/20 text-blue-500 flex items-center justify-center rounded-full">
              A
            </div>
          }
        />
        <StatCard
          title="Tokenized Value"
          value={`$${tokenizedValue}`}
          description="Total value of tokenized assets"
          icon={
            <div className="h-8 w-8 bg-green-500/20 text-green-500 flex items-center justify-center rounded-full">
              $
            </div>
          }
        />
        <StatCard
          title="Node Status"
          value={currentNodeData?.status}
          description="Current operational status"
          icon={
            <div
              className={`h-8 w-8 ${
                currentNodeData?.status === 'Active'
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              } flex items-center justify-center rounded-full`}
            >
              S
            </div>
          }
        />
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

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>
            Capacity and pricing for each supported asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">ID</th>
                  <th className="h-12 px-4 text-left align-middle">Name</th>
                  <th className="h-12 px-4 text-left align-middle">Capacity</th>
                  {/* Removed Price column as Node domain does not include assetPrices */}
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
                if (!selectedNode) {
                  toast.error('No node selected to view orders.');
                  return;
                }
                await router.push(`/node/${selectedNode}/orders`);
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
                    <td className="p-4 capitalize">
                      {getAssetName(Number(order.asset))}
                    </td>
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

      {editingPrice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-medium mb-4">Edit Asset Price</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Price (in wei)
                </label>
                <Input
                  type="number"
                  value={editingPrice.value}
                  onChange={(e) =>
                    setEditingPrice({ ...editingPrice, value: e.target.value })
                  }
                  className="w-full"
                  placeholder="Enter new price"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPrice(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await handlePriceUpdate(
                        editingPrice.id,
                        editingPrice.value,
                      );
                    } catch (error) {
                      toast.error('Failed to update price');
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
