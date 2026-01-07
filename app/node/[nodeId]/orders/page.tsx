'use client';

import { useEffect, useState, Suspense } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useSearchParams, useParams } from 'next/navigation';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  RefreshCw,
  Package,
  Filter,
} from 'lucide-react';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { OrderWithAsset } from '@/app/types/shared';
import { formatTokenAmount } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const orderStatuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'created', label: 'Created' },
  { value: 'processing', label: 'Processing' },
  { value: 'settled', label: 'Settled' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type SortConfig = {
  key: 'quantity' | 'value' | null;
  direction: 'asc' | 'desc';
};

export default function OrdersPage() {
  const { setCurrentUserRole } = useMainProvider();
  const { orders, refreshOrders, selectNode, selectedNodeAddress } =
    useSelectedNode();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const params = useParams();
  const nodeId = params.nodeId as string;

  useEffect(() => {
    setCurrentUserRole('node');
    if (nodeId && nodeId !== selectedNodeAddress) {
      selectNode(nodeId);
    }
  }, [setCurrentUserRole, nodeId, selectedNodeAddress, selectNode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-accent animate-spin" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <OrdersContent
        nodeId={nodeId}
        orders={orders}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    </Suspense>
  );
}

function OrdersContent({
  nodeId,
  orders,
  onRefresh,
  isRefreshing,
}: {
  nodeId: string;
  orders: OrderWithAsset[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}) {
  const searchParams = useSearchParams();
  const [filteredOrders, setFilteredOrders] =
    useState<OrderWithAsset[]>(orders);
  const [displayedOrders, setDisplayedOrders] = useState<OrderWithAsset[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });
  const ordersPerPage = 10;

  const [filters, setFilters] = useState({
    orderId: '',
    customerId: '',
    assetType: 'all',
    status: searchParams.get('status') || 'all',
  });

  const handleSort = (key: 'quantity' | 'value') => {
    setSortConfig((prevSort) => ({
      key,
      direction:
        prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const uniqueAssets = Array.from(
    new Map(
      orders
        .filter((order) => order.asset !== null)
        .map((order) => [
          String(order.asset!.tokenId),
          { value: String(order.asset!.tokenId), label: order.asset!.name },
        ]),
    ).values(),
  );

  useEffect(() => {
    let result = orders;

    if (filters.orderId) {
      result = result.filter((order) =>
        order.id.toLowerCase().includes(filters.orderId.toLowerCase()),
      );
    }

    if (filters.customerId) {
      result = result.filter((order) =>
        order.buyer.toLowerCase().includes(filters.customerId.toLowerCase()),
      );
    }

    if (filters.assetType !== 'all') {
      result = result.filter(
        (order) => String(order.asset?.tokenId) === filters.assetType,
      );
    }

    if (filters.status !== 'all') {
      result = result.filter((order) => order.currentStatus === filters.status);
    }

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        if (sortConfig.key === 'quantity') {
          const aQuantity = Number(a.tokenQuantity);
          const bQuantity = Number(b.tokenQuantity);
          return sortConfig.direction === 'asc'
            ? aQuantity - bQuantity
            : bQuantity - aQuantity;
        }
        if (sortConfig.key === 'value') {
          const aValue = parseFloat(a.price);
          const bValue = parseFloat(b.price);
          return sortConfig.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }
        return 0;
      });
    }

    setFilteredOrders(result);
    setCurrentPage(1);
  }, [filters, sortConfig, orders]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    setDisplayedOrders(filteredOrders.slice(startIndex, endIndex));
  }, [currentPage, filteredOrders]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const getStatusBadgeStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'settled':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'pending';
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage all orders for this node
            </p>
          </div>
          <GlowButton
            variant="outline"
            onClick={onRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Orders
          </GlowButton>
        </div>

        {/* Filters */}
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-accent" />
              <GlassCardTitle>Filter Orders</GlassCardTitle>
            </div>
            <GlassCardDescription>
              Use the filters below to find specific orders
            </GlassCardDescription>
          </GlassCardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Order ID
              </label>
              <Input
                placeholder="Search by order ID"
                value={filters.orderId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, orderId: e.target.value }))
                }
                className="bg-surface-overlay border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Customer ID
              </label>
              <Input
                placeholder="Search by customer ID"
                value={filters.customerId}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
                className="bg-surface-overlay border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Asset Type
              </label>
              <Select
                value={filters.assetType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assetType: value }))
                }
              >
                <SelectTrigger className="bg-surface-overlay border-glass-border">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {uniqueAssets.map((asset) => (
                    <SelectItem key={asset.value} value={asset.value}>
                      {asset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="bg-surface-overlay border-glass-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>

        {/* Orders Table */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Orders List</GlassCardTitle>
            <GlassCardDescription>
              All orders matching your filter criteria
            </GlassCardDescription>
          </GlassCardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('quantity')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Quantity
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('value')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Value
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {displayedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-glass-hover transition-colors"
                  >
                    <td className="px-4 py-4 font-mono text-sm text-foreground">
                      {order.id}
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-foreground">
                      {order.buyer.slice(0, 8)}...{order.buyer.slice(-6)}
                    </td>
                    <td className="px-4 py-4 capitalize text-foreground">
                      {order.asset?.name || 'Unknown Asset'}
                    </td>
                    <td className="px-4 py-4 font-mono text-foreground">
                      {order.tokenQuantity}
                    </td>
                    <td className="px-4 py-4 font-mono text-foreground">
                      {formatTokenAmount(order.price, 6, 2)} USDT
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        status={getStatusBadgeStatus(order.currentStatus)}
                        label={order.currentStatus}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {displayedOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No orders found matching your criteria
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredOrders.length > ordersPerPage && (
            <div className="mt-4 flex items-center justify-between px-2 pt-4 border-t border-glass-border">
              <div className="text-sm text-muted-foreground">
                Showing{' '}
                {Math.min(
                  filteredOrders.length,
                  (currentPage - 1) * ordersPerPage + 1,
                )}{' '}
                to{' '}
                {Math.min(filteredOrders.length, currentPage * ordersPerPage)}{' '}
                of {filteredOrders.length} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="px-4 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
