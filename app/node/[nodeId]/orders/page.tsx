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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { OrderWithAsset } from '@/app/types/shared';

const orderStatuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
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
    // Select the node if it's not already selected
    if (nodeId && nodeId !== selectedNodeAddress) {
      selectNode(nodeId);
    }
  }, [setCurrentUserRole, nodeId, selectedNodeAddress, selectNode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders();
      console.log('orders for node', nodeId, '>>>>>>>>>', orders);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
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

  // Get unique assets from orders for filtering
  const uniqueAssets = Array.from(
    new Map(
      orders
        .filter((order) => order.asset !== null)
        .map((order) => [
          String(order.asset!.tokenID),
          { value: String(order.asset!.tokenID), label: order.asset!.name },
        ]),
    ).values(),
  );

  useEffect(() => {
    // Apply filters
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
        (order) => String(order.asset?.tokenID) === filters.assetType,
      );
    }

    if (filters.status !== 'all') {
      result = result.filter((order) => order.currentStatus === filters.status);
    }

    // Apply sorting
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        if (sortConfig.key === 'quantity') {
          const aQuantity = Number(a.tokenQuantity);
          const bQuantity = Number(b.tokenQuantity);
          return sortConfig.direction === 'asc'
            ? aQuantity - bQuantity
            : bQuantity - aQuantity;
        }
        // For value, convert string to number
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
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, sortConfig, orders]);

  useEffect(() => {
    // Apply pagination
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    setDisplayedOrders(filteredOrders.slice(startIndex, endIndex));
  }, [currentPage, filteredOrders]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Orders</h1>
        <Button variant="outline" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Orders
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
          <CardDescription>
            Use the filters below to find specific orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Order ID</label>
              <Input
                placeholder="Search by order ID"
                value={filters.orderId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, orderId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer ID</label>
              <Input
                placeholder="Search by customer ID"
                value={filters.customerId}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Type</label>
              <Select
                value={filters.assetType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assetType: value }))
                }
              >
                <SelectTrigger>
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
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders List</CardTitle>
          <CardDescription>
            All orders matching your filter criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">Order ID</th>
                  <th className="h-12 px-4 text-left align-middle">Customer</th>
                  <th className="h-12 px-4 text-left align-middle">Asset</th>
                  <th className="h-12 px-4 text-left align-middle">
                    Quantity
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('quantity')}
                      className="h-8 px-2"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                  <th className="h-12 px-4 text-left align-middle">
                    Value
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('value')}
                      className="h-8 px-2"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                  <th className="h-12 px-4 text-left align-middle">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-4">{order.id}</td>
                    <td className="p-4">{order.buyer}</td>
                    <td className="p-4 capitalize">
                      {order.asset?.name || 'Unknown Asset'}
                    </td>
                    <td className="p-4">{order.tokenQuantity}</td>
                    <td className="p-4">{order.price} USDT</td>
                    <td className="p-4 capitalize">{order.currentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing{' '}
              {Math.min(
                filteredOrders.length,
                (currentPage - 1) * ordersPerPage + 1,
              )}{' '}
              to {Math.min(filteredOrders.length, currentPage * ordersPerPage)}{' '}
              of {filteredOrders.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
