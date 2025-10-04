'use client';

import React, { useEffect, useState } from 'react';
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
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { useNodes } from '@/app/providers/nodes.provider';
import type { TokenizedAsset, TokenizedAssetAttribute } from '@/domain/node';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { MapView } from '@/app/components/ui/map-view';
import { EditNodeModal } from './edit-node-modal';
import AssetSelectionForm from './asset-selection-form';
import { usePlatform } from '@/app/providers/platform.provider';
import type { Asset as PlatformAsset } from '@/domain/platform';

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

const getAssetName = (id: number) => {
  return '1';
};

interface EditingPrice {
  id: number;
  value: string;
}

export default function NodeDashboardPage() {
  const {
    selectedNodeAddress,
    nodeData: currentNodeData,
    orders,
    assets: nodeAssets,
    loading: nodeLoading,
    selectNode,
    mintAsset,
    updateNodeStatus,
    updateAssetCapacity,
    updateAssetPrice,
    getAssetAttributes,
    refreshAssets,
  } = useSelectedNode();

  const { refreshNodes } = useNodes();
  const router = useRouter();

  // Get nodeId from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const nodeIdFromUrl = searchParams.get('nodeId');

  // Form and dialog states
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isViewingOrders, setIsViewingOrders] = useState(false);

  // Use assets from provider instead of local state
  const assets = nodeAssets;
  const [capacityError, setCapacityError] = useState<string | null>(null);
  // Available assets state removed; assets now loaded per selected class inside the form
  const [assetAttributes, setAssetAttributes] = useState<
    Record<string, Record<string, any>>
  >({});
  const [assetAttributesData, setAssetAttributesData] = useState<
    Record<string, TokenizedAssetAttribute[]>
  >({});
  const [loadingAttributes, setLoadingAttributes] = useState<boolean>(false);

  // Status and capacity states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);
  const [editingCapacity, setEditingCapacity] =
    useState<EditingCapacity | null>(null);
  const [editingPrice, setEditingPrice] = useState<EditingPrice | null>(null);
  const { supportedAssetClasses, getAssetByTokenId } = usePlatform();
  const [selectedAssetName, setSelectedAssetName] = useState<string>('');
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

  // Select node when page loads
  useEffect(() => {
    if (nodeIdFromUrl && nodeIdFromUrl !== selectedNodeAddress) {
      const attemptSelection = async () => {
        try {
          await selectNode(nodeIdFromUrl);
        } catch (error) {
          console.error('Error selecting node from URL:', error);
          // If selection fails, show error and provide retry option
          toast.error(
            'Failed to load node data. Please ensure your wallet is connected and try again.',
          );
        }
      };

      attemptSelection();
    }
  }, [nodeIdFromUrl, selectedNodeAddress, selectNode]);

  const onSubmit = async (values: z.infer<typeof tokenizeFormSchema>) => {
    if (!selectedNodeAddress || !currentNodeData) return;

    setCapacityError(null);
    setIsTokenizing(true);
    try {
      const assetIdStr = values.assetId;
      const assetId = Number(assetIdStr);
      const quantity = Number(values.quantity);

      // --- Capacity Check (Optional) ---
      const assetInfo = currentNodeData.assets?.find(
        (a) => Number(a.tokenId) === assetId,
      );
      if (assetInfo) {
        const totalCapacity = Number(assetInfo.capacity);
        const currentTokenizedAsset = assets.find(
          (a) => Number(a.id) === assetId,
        );
        const currentAmount = currentTokenizedAsset
          ? Number(currentTokenizedAsset.amount)
          : 0;
        const remainingCapacity = totalCapacity - currentAmount;

        if (quantity > remainingCapacity) {
          setCapacityError(
            `You are exceeding capacity for ${getAssetByTokenId(assetIdStr)}. Remaining capacity: ${remainingCapacity}. Increase capacity to tokenize more assets of this type.`,
          );
          setIsTokenizing(false);
          return;
        }
      }
      // --- End Optional Capacity Check ---

      // Log the attributes for debugging
      console.log('Asset Attributes:', assetAttributes);

      const selectedValues = assetAttributes[assetIdStr] || {};
      const normalizedAttributes = Object.entries(selectedValues)
        .filter(
          ([attrName, attrValue]) => attrName != null && attrValue != null,
        )
        .map(([attrName, attrValue]) => ({
          name: String(attrName),
          values: [String(attrValue)],
          description: '',
        }));
      const assetPayload: PlatformAsset = {
        assetClass: form.getValues('assetClass'),
        tokenId: assetIdStr,
        name: selectedAssetName,
        attributes: normalizedAttributes,
      };
      const priceWei = BigInt(values.price || '0');
      await mintAsset(assetPayload, quantity, priceWei);

      // Reload asset attributes (assets are automatically refreshed by provider)
      await loadAssetAttributes(assets);

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

  // Computed values
  // Use loaded tokenized assets for the count rather than currentNodeData (Graph node doesn't embed assets)
  const supportedAssets = assets.length;
  const tokenizedValue = assets
    .reduce(
      (total, asset) => total + Number(asset.price) * Number(asset.capacity),
      0,
    )
    .toFixed(2);

  // Group assets by class and calculate total quantities and values
  const getAssetsSummaryByClass = () => {
    const summary: Record<string, { quantity: number; value: number }> = {};

    assets.forEach((asset) => {
      const assetClass = asset.class || 'Unknown';
      const quantity = Number(asset.capacity) || 0;
      const price = Number(asset.price) || 0;
      const value = quantity * price;

      if (summary[assetClass]) {
        summary[assetClass].quantity += quantity;
        summary[assetClass].value += value;
      } else {
        summary[assetClass] = { quantity, value };
      }
    });

    return Object.entries(summary).map(([assetClass, { quantity, value }]) => ({
      assetClass,
      totalQuantity: quantity,
      totalValue: value,
    }));
  };

  // Function to load asset attributes
  const loadAssetAttributes = async (assets: TokenizedAsset[]) => {
    if (assets.length === 0) return;

    setLoadingAttributes(true);
    const attributesMap: Record<string, TokenizedAssetAttribute[]> = {};

    try {
      // Load attributes for each asset in parallel
      await Promise.all(
        assets.map(async (asset) => {
          try {
            const attributes = await getAssetAttributes(
              asset.fileHash || asset.id,
            );
            attributesMap[asset.id] = attributes;
          } catch (error) {
            console.error(
              `Error loading attributes for asset ${asset.id}:`,
              error,
            );
            attributesMap[asset.id] = [];
          }
        }),
      );

      setAssetAttributesData(attributesMap);
    } catch (error) {
      console.error('Error loading asset attributes:', error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  // Load asset attributes when assets change
  useEffect(() => {
    if (assets.length > 0) {
      loadAssetAttributes(assets);
    }
  }, [assets]);

  // Removed: legacy merging of supported assets; selection now uses platform provider

  // Handle asset attribute changes
  const handleAssetAttributeChange = (
    assetId: string,
    attributeName: string,
    value: any,
  ) => {
    const currentAttributes = assetAttributes[assetId] || {};
    setAssetAttributes({
      ...assetAttributes,
      [assetId]: {
        ...currentAttributes,
        [attributeName]: value,
      },
    });
  };

  // Render asset details with attributes
  const renderAssetDetailsRows = () => {
    if (!assets || assets.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="p-4 text-center text-gray-500">
            No assets found
          </td>
        </tr>
      );
    }

    return assets.map((asset) => {
      const attributes = assetAttributesData[asset.id] || [];
      const hasAttributes = attributes.length > 0;

      return (
        <React.Fragment key={asset.id}>
          <tr>
            <td className="p-4 font-medium">{truncateId(asset.id)}</td>
            <td className="p-4">{asset.name}</td>
            <td className="p-4 capitalize">{asset.class}</td>
            <td className="p-4">{Number(asset.capacity ?? '0')}</td>
            <td className="p-4">${Number(asset.price ?? '0').toFixed(2)}</td>
          </tr>
          {/* Attributes row */}
          <tr className="border-b">
            <td colSpan={5} className="px-4 pb-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                {loadingAttributes ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : hasAttributes ? (
                  <div className="flex flex-wrap gap-2">
                    {attributes.map((attr, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                        title={attr.description || undefined}
                      >
                        <span className="font-medium">{attr.name}:</span>
                        <span>{attr.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No attributes</span>
                )}
              </div>
            </td>
          </tr>
        </React.Fragment>
      );
    });
  };

  const truncateId = (value: string, max: number = 10) =>
    value && value.length > max ? value.slice(0, max) + '...' : value;

  const handleStatusUpdate = async () => {
    if (!currentNodeData) return;

    setIsUpdatingStatus(true);
    try {
      const newStatus =
        currentNodeData.status === 'Active' ? 'Inactive' : 'Active';
      await updateNodeStatus(newStatus);
      toast.success('Node status updated successfully');
    } catch (error) {
      toast.error('Failed to update node status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCapacityUpdate = async (assetId: number, newValue: string) => {
    if (!currentNodeData) return;

    setIsUpdatingCapacity(true);
    try {
      await updateAssetCapacity(
        currentNodeData.owner,
        String(assetId),
        parseInt(newValue),
      );

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
    if (!currentNodeData) return;

    try {
      await updateAssetPrice(
        currentNodeData.owner,
        String(assetId),
        BigInt(newValue),
      );

      setEditingPrice(null);
      toast.success('Price updated successfully');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    }
  };

  // Show loading spinner while node is being loaded
  if (nodeLoading || (!currentNodeData && nodeIdFromUrl)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500">Loading node data...</p>
        {nodeIdFromUrl && (
          <p className="text-sm text-gray-400">
            Node ID: {nodeIdFromUrl.slice(0, 10)}...
          </p>
        )}
      </div>
    );
  }

  // Show error state if no node data and no nodeId from URL
  if (!currentNodeData && !nodeIdFromUrl) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <p className="text-gray-500">No node selected</p>
        <Button onClick={() => router.push('/node/overview')}>
          Go to Node Overview
        </Button>
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
          {/* {currentNodeData && (
              <EditNodeModal
              nodeAddress={selectedNode!}
                nodeData={currentNodeData as any}
                assetNames={Object.fromEntries(
                  (currentNodeData.assets || []).map((a) => [
                    Number(a.tokenId),
                    getAssetName(Number(a.tokenId)),
                  ]),
                )}
              onNodeUpdated={refreshNodes}
            />
          )} */}
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
                    onSelectedAssetChange={(asset) =>
                      setSelectedAssetName(asset?.name || '')
                    }
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
          value={currentNodeData?.status || 'Unknown'}
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

      {/* Tokenized Assets Summary Table - Shows assets grouped by class */}
      <Card>
        <CardHeader>
          <CardTitle>Tokenized Assets</CardTitle>
          <CardDescription>Summary of tokenized assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Asset Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {getAssetsSummaryByClass().length > 0 ? (
                  getAssetsSummaryByClass().map((summary) => (
                    <tr key={summary.assetClass} className="border-b">
                      <td className="px-6 py-4 capitalize font-medium">
                        {summary.assetClass}
                      </td>
                      <td className="px-6 py-4">{summary.totalQuantity}</td>
                      <td className="px-6 py-4">
                        ${summary.totalValue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No tokenized assets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>
            Capacity and attributes for each tokenized asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">ID</th>
                  <th className="h-12 px-4 text-left align-middle">Asset</th>
                  <th className="h-12 px-4 text-left align-middle">Class</th>
                  <th className="h-12 px-4 text-left align-middle">Quantity</th>
                  <th className="h-12 px-4 text-left align-middle">Price</th>
                </tr>
              </thead>
              <tbody>{renderAssetDetailsRows()}</tbody>
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
                if (!selectedNodeAddress) {
                  toast.error('No node selected to view orders.');
                  return;
                }
                await router.push(`/node/${selectedNodeAddress}/orders`);
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
                  <th className="h-12 px-4 text-left align-middle">Buyer</th>
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
                    <td className="p-4">{order.buyer}</td>
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
            lat={currentNodeData?.location?.location?.lat || '0'}
            lng={currentNodeData?.location?.location?.lng || '0'}
            addressName={
              currentNodeData?.location?.addressName || 'Unknown Location'
            }
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
