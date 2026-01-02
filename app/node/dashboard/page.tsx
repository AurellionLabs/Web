'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Server,
  Package,
  DollarSign,
  Activity,
  MapPin,
} from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { useNodes } from '@/app/providers/nodes.provider';
import type { TokenizedAsset, TokenizedAssetAttribute } from '@/domain/node';
import { useToast } from '@/hooks/use-toast';
import { MapView } from '@/app/components/ui/map-view';
import AssetSelectionForm from './asset-selection-form';
import { usePlatform } from '@/app/providers/platform.provider';
import type { Asset } from '@/domain/shared';
import { Order, OrderStatus } from '@/domain/orders';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';

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

/**
 * StatCard - Protocol stat card component
 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  description,
}) => (
  <GlassCard hover className="relative overflow-hidden">
    <div
      className={cn(
        'absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20',
        iconColor,
      )}
    />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </p>
        {typeof value === 'number' ? (
          <AnimatedNumber
            value={value}
            size="lg"
            className="font-bold text-foreground"
          />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div
        className={cn(
          'p-3 rounded-xl',
          iconColor.replace('bg-', 'bg-opacity-20 '),
        )}
      >
        <Icon
          className={cn(
            'w-6 h-6',
            iconColor.replace('bg-', 'text-').replace('-500', '-400'),
          )}
        />
      </div>
    </div>
  </GlassCard>
);

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
    packageSign,
    startJourney,
  } = useSelectedNode();

  const { refreshNodes } = useNodes();
  const router = useRouter();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const nodeIdFromUrl = searchParams.get('nodeId');

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [isViewingOrders, setIsViewingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  const assets = nodeAssets;
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [assetAttributes, setAssetAttributes] = useState<
    Record<string, Record<string, any>>
  >({});
  const [assetAttributesData, setAssetAttributesData] = useState<
    Record<string, TokenizedAssetAttribute[]>
  >({});
  const [loadingAttributes, setLoadingAttributes] = useState<boolean>(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);
  const [editingCapacity, setEditingCapacity] =
    useState<EditingCapacity | null>(null);
  const [editingPrice, setEditingPrice] = useState<EditingPrice | null>(null);
  const { supportedAssetClasses, getAssetByTokenId } = usePlatform();
  const [selectedAssetName, setSelectedAssetName] = useState<string>('');

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

  useEffect(() => {
    if (nodeIdFromUrl && nodeIdFromUrl !== selectedNodeAddress) {
      const attemptSelection = async () => {
        try {
          await selectNode(nodeIdFromUrl);
        } catch (error) {
          console.error('Error selecting node from URL:', error);
          toast({
            title: 'Error',
            description:
              'Failed to load node data. Please ensure your wallet is connected and try again.',
            variant: 'destructive',
          });
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
      const assetPayload: Asset = {
        assetClass: form.getValues('assetClass'),
        tokenID: BigInt(assetIdStr),
        name: selectedAssetName,
        attributes: normalizedAttributes,
      };
      const priceWei = BigInt(values.price || '0');
      await mintAsset(assetPayload, quantity, priceWei);

      await loadAssetAttributes(assets);

      toast({ title: 'Success', description: 'Asset tokenized successfully' });
      setIsAddAssetOpen(false);
      form.reset();
      setCapacityError(null);
      setAssetAttributes({});
    } catch (error) {
      console.error('Error tokenizing asset:', error);
      setCapacityError('Failed to tokenize asset. Please try again.');
    } finally {
      setIsTokenizing(false);
    }
  };

  const supportedAssetsCount = assets.length;
  const tokenizedValue = assets
    .reduce(
      (total, asset) => total + Number(asset.price) * Number(asset.capacity),
      0,
    )
    .toFixed(2);

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

  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const loadAssetAttributes = async (assets: TokenizedAsset[]) => {
    if (assets.length === 0) return;

    setLoadingAttributes(true);
    const attributesMap: Record<string, TokenizedAssetAttribute[]> = {};

    try {
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

  useEffect(() => {
    if (assets.length > 0) {
      loadAssetAttributes(assets);
    }
  }, [assets]);

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

  const renderAssetDetailsRows = () => {
    if (!assets || assets.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="p-4 text-center text-muted-foreground">
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
          <tr className="border-b border-glass-border hover:bg-glass-hover transition-colors">
            <td className="p-4 font-mono text-sm text-foreground">
              {truncateId(asset.id)}
            </td>
            <td className="p-4 text-foreground">{asset.name}</td>
            <td className="p-4 capitalize text-foreground">{asset.class}</td>
            <td className="p-4 font-mono text-foreground">
              {Number(asset.capacity ?? '0')}
            </td>
            <td className="p-4 font-mono text-foreground">
              ${Number(asset.price ?? '0').toFixed(2)}
            </td>
          </tr>
          {/* Attributes row */}
          <tr className="border-b border-glass-border">
            <td colSpan={5} className="px-4 pb-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {loadingAttributes ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : hasAttributes ? (
                  <div className="flex flex-wrap gap-2">
                    {attributes.map((attr, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs"
                        title={attr.description || undefined}
                      >
                        <span className="font-medium">{attr.name}:</span>
                        <span>{attr.value}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">
                    No attributes
                  </span>
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
      toast({
        title: 'Success',
        description: 'Node status updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update node status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmPickup = async (order: Order) => {
    try {
      const journeyId = order.journeyIds?.[0];
      if (!journeyId) {
        toast({
          title: 'Error',
          description: 'No journey found for this order',
          variant: 'destructive',
        });
        return;
      }

      await packageSign(journeyId);
      try {
        await startJourney(journeyId);
        toast({
          title: 'Success',
          description: 'Pickup confirmed and journey started',
        });
      } catch (e) {
        const err = e as Error;
        const errData = (err as any)?.data;

        if (
          err.message?.includes('DriverNotSigned') ||
          err.message?.includes('0x9651c947') ||
          errData === '0x9651c947'
        ) {
          toast({
            title: 'Pickup Signature Recorded',
            description:
              'Your pickup signature has been recorded. Waiting for driver to sign pickup.',
          });
        } else if (
          err.message?.includes('SenderNotSigned') ||
          err.message?.includes('0x4b2c0751') ||
          errData === '0x4b2c0751'
        ) {
          toast({
            title: 'Pickup Signature Recorded',
            description:
              'Your pickup signature has been recorded. Waiting for sender to sign.',
          });
        } else {
          toast({
            title: 'Error',
            description:
              'Pickup signed, but failed to start journey. ' +
              (err.message || ''),
            variant: 'destructive',
          });
        }
      }
    } catch (e) {
      const err = e as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to confirm pickup',
        variant: 'destructive',
      });
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
      toast({ title: 'Success', description: 'Capacity updated successfully' });
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update capacity',
        variant: 'destructive',
      });
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
      toast({ title: 'Success', description: 'Price updated successfully' });
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: 'Failed to update price',
        variant: 'destructive',
      });
    }
  };

  if (nodeLoading || (!currentNodeData && nodeIdFromUrl)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <p className="text-muted-foreground">Loading node data...</p>
          {nodeIdFromUrl && (
            <p className="text-sm text-muted-foreground/50 font-mono">
              Node ID: {nodeIdFromUrl.slice(0, 10)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!currentNodeData && !nodeIdFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center py-12 px-8">
          <Server className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Node Selected
          </h3>
          <p className="text-muted-foreground mb-6">
            Please select a node to view its dashboard
          </p>
          <GlowButton
            variant="primary"
            onClick={() => router.push('/node/overview')}
          >
            Go to Node Overview
          </GlowButton>
        </GlassCard>
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
              Node Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your node and its assets
            </p>
          </div>
          <Dialog
            open={isAddAssetOpen}
            onOpenChange={(open) => {
              setIsAddAssetOpen(open);
              if (!open) {
                form.reset();
                setAssetAttributes({});
                setCapacityError(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <GlowButton
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                loading={isTokenizing}
              >
                Add Asset
              </GlowButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
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
                    <p className="text-sm font-medium text-trading-sell">
                      {capacityError}
                    </p>
                  )}
                  <GlowButton
                    type="submit"
                    variant="primary"
                    className="w-full"
                    glow
                    loading={isTokenizing}
                  >
                    Tokenize Asset
                  </GlowButton>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Supported Assets"
            value={supportedAssetsCount}
            icon={Package}
            iconColor="bg-accent"
            description="Total assets tokenized"
          />
          <StatCard
            title="Tokenized Value"
            value={`$${tokenizedValue}`}
            icon={DollarSign}
            iconColor="bg-green-500"
            description="Total value of assets"
          />
          <StatCard
            title="Node Status"
            value={currentNodeData?.status || 'Unknown'}
            icon={Activity}
            iconColor={
              currentNodeData?.status === 'Active'
                ? 'bg-green-500'
                : 'bg-red-500'
            }
            description="Current operational status"
          />
        </div>

        {/* Tokenized Assets Summary */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Tokenized Assets</GlassCardTitle>
            <GlassCardDescription>
              Summary of tokenized assets by class
            </GlassCardDescription>
          </GlassCardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {getAssetsSummaryByClass().length > 0 ? (
                  getAssetsSummaryByClass().map((summary) => (
                    <tr
                      key={summary.assetClass}
                      className="hover:bg-glass-hover transition-colors"
                    >
                      <td className="px-4 py-4 capitalize font-medium text-foreground">
                        {summary.assetClass}
                      </td>
                      <td className="px-4 py-4 font-mono text-foreground">
                        {summary.totalQuantity}
                      </td>
                      <td className="px-4 py-4 font-mono text-foreground">
                        ${summary.totalValue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No tokenized assets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Asset Details */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Asset Details</GlassCardTitle>
            <GlassCardDescription>
              Capacity and attributes for each tokenized asset
            </GlassCardDescription>
          </GlassCardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>{renderAssetDetailsRows()}</tbody>
            </table>
          </div>
        </GlassCard>

        {/* Orders */}
        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between">
            <div>
              <GlassCardTitle>Orders</GlassCardTitle>
              <GlassCardDescription>
                Track your accepted orders and their status
              </GlassCardDescription>
            </div>
            <GlowButton
              variant="outline"
              onClick={async () => {
                setIsViewingOrders(true);
                try {
                  if (!selectedNodeAddress) {
                    toast({
                      title: 'Error',
                      description: 'No node selected to view orders.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  await router.push(`/node/${selectedNodeAddress}/orders`);
                } finally {
                  setIsViewingOrders(false);
                }
              }}
              loading={isViewingOrders}
            >
              View All Orders
            </GlowButton>
          </GlassCardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {currentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-glass-hover transition-colors"
                  >
                    <td className="px-4 py-4 font-mono text-sm text-foreground">
                      {order.id}
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-foreground">
                      {truncateId(order.buyer, 12)}
                    </td>
                    <td className="px-4 py-4 capitalize text-foreground">
                      {order.asset?.name || 'Unknown Asset'}
                    </td>
                    <td className="px-4 py-4 font-mono text-foreground">
                      {order.tokenQuantity}
                    </td>
                    <td className="px-4 py-4 font-mono text-foreground">
                      ${formatTokenAmount(order.price, 6, 2)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        status={
                          order.currentStatus === OrderStatus.SETTLED
                            ? 'success'
                            : order.currentStatus === OrderStatus.CANCELLED
                              ? 'error'
                              : order.currentStatus === OrderStatus.PROCESSING
                                ? 'warning'
                                : 'pending'
                        }
                        label={order.currentStatus}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-4">
                      {order.currentStatus === OrderStatus.CREATED ? (
                        <GlowButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirmPickup(order)}
                        >
                          Confirm Pickup
                        </GlowButton>
                      ) : order.currentStatus === OrderStatus.PROCESSING ? (
                        <span className="text-sm text-accent font-medium">
                          In Transit
                        </span>
                      ) : order.currentStatus === OrderStatus.SETTLED ? (
                        <span className="text-sm text-trading-buy font-medium">
                          Completed
                        </span>
                      ) : order.currentStatus === OrderStatus.CANCELLED ? (
                        <span className="text-sm text-trading-sell font-medium">
                          Cancelled
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            )}

            {/* Pagination Controls */}
            {orders.length > ordersPerPage && (
              <div className="mt-4 flex items-center justify-between px-2 pt-4 border-t border-glass-border">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(endIndex, orders.length)} of {orders.length} orders
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="px-4 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Node Location */}
        <GlassCard className="overflow-hidden">
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              <GlassCardTitle>Node Location</GlassCardTitle>
            </div>
            <GlassCardDescription>
              Physical location of your node in the network
            </GlassCardDescription>
          </GlassCardHeader>
          <MapView
            lat={currentNodeData?.location?.location?.lat || '0'}
            lng={currentNodeData?.location?.location?.lng || '0'}
            addressName={
              currentNodeData?.location?.addressName || 'Unknown Location'
            }
          />
        </GlassCard>

        {/* Edit Price Modal */}
        {editingPrice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <GlassCard className="w-96">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Edit Asset Price
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Price (in wei)
                  </label>
                  <Input
                    type="number"
                    value={editingPrice.value}
                    onChange={(e) =>
                      setEditingPrice({
                        ...editingPrice,
                        value: e.target.value,
                      })
                    }
                    className="w-full bg-surface-overlay border-glass-border"
                    placeholder="Enter new price"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <GlowButton
                    variant="outline"
                    onClick={() => setEditingPrice(null)}
                  >
                    Cancel
                  </GlowButton>
                  <GlowButton
                    variant="primary"
                    onClick={async () => {
                      try {
                        await handlePriceUpdate(
                          editingPrice.id,
                          editingPrice.value,
                        );
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to update price',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Save
                  </GlowButton>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
