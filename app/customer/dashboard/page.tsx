'use client';

import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useCustomer } from '@/app/providers/customer.provider';
import { colors } from '@/lib/constants/colors';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { OrderActionDialog } from '@/components/ui/order-action-dialog';

type SortConfig = {
  key: 'quantity' | 'value' | null;
  direction: 'asc' | 'desc';
};

const ORDER_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const ASSETS = [
  { value: 'all', label: 'All Assets' },
  { value: 'cow', label: 'Cow' },
  { value: 'goat', label: 'Goat' },
  { value: 'sheep', label: 'Sheep' },
  { value: 'chicken', label: 'Chicken' },
] as const;

export default function CustomerDashboard() {
  const router = useRouter();
  const { setCurrentUserRole } = useMainProvider();
  const {
    orders,
    isLoading,
    error,
    refreshOrders,
    cancelOrder,
    confirmReceipt,
  } = useCustomer();

  // Filter states
  const [filters, setFilters] = useState({
    orderId: '',
    asset: 'all',
    status: 'all',
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  useEffect(() => {
    setCurrentUserRole('customer');
  }, [setCurrentUserRole]);

  // Apply filters and sorting
  const filteredOrders = orders.filter((order) => {
    if (
      filters.orderId &&
      !order.id.toLowerCase().includes(filters.orderId.toLowerCase())
    ) {
      return false;
    }
    if (filters.asset !== 'all' && order.asset !== filters.asset) {
      return false;
    }
    if (filters.status !== 'all' && order.status !== filters.status) {
      return false;
    }
    return true;
  });

  // Apply sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortConfig.key === null) return 0;

    const aValue =
      sortConfig.key === 'value'
        ? parseFloat(a[sortConfig.key])
        : a[sortConfig.key];
    const bValue =
      sortConfig.key === 'value'
        ? parseFloat(b[sortConfig.key])
        : b[sortConfig.key];

    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calculate statistics from filtered orders
  const inProgressOrders = filteredOrders.filter(
    (order) => order.status === 'in_progress',
  ).length;
  const completedOrders = filteredOrders.filter(
    (order) => order.status === 'completed',
  ).length;
  const pendingOrders = filteredOrders.filter(
    (order) => order.status === 'pending',
  ).length;

  const totalSpent = filteredOrders
    .filter((order) => order.status === 'completed')
    .reduce((total, order) => total + parseFloat(order.value), 0);

  // Calculate pagination values
  const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = sortedOrders.slice(startIndex, endIndex);

  // Pagination controls
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  const handleSort = (key: 'quantity' | 'value') => {
    setSortConfig((prevSort) => ({
      key,
      direction:
        prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      toast({
        title: 'Order Cancelled',
        description: 'Your order has been successfully cancelled.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to cancel order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    try {
      await confirmReceipt(orderId);
      toast({
        title: 'Receipt Confirmed',
        description: 'Thank you for confirming receipt of your order.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to confirm receipt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6 flex items-center justify-center`}
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-500">
              Error Loading Orders
            </h2>
            <p className="text-gray-400 mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refreshOrders()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[${colors.background.primary}] text-white p-4 sm:p-6`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Customer Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back! Here's an overview of your orders and activities.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshOrders()}
            className="h-10 w-10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    In Progress Orders
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {inProgressOrders}
                  </h3>
                </div>
                <Activity className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Completed Orders
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{completedOrders}</h3>
                </div>
                <Package className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Pending Orders
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{pendingOrders}</h3>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Spent
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    ${totalSpent.toFixed(2)}
                  </h3>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className={`bg-[${colors.background.secondary}]`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest order activity</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/customer/orders')}
            >
              View All Orders
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <label className="text-sm font-medium">Asset</label>
                <Select
                  value={filters.asset}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, asset: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSETS.map((asset) => (
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
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="h-12 px-4 text-left align-middle">
                      Order ID
                    </th>
                    <th className="h-12 px-4 text-left align-middle">Asset</th>
                    <th className="h-12 px-4 text-left align-middle">
                      Quantity
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleSort('quantity')}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </th>
                    <th className="h-12 px-4 text-left align-middle">
                      Value
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleSort('value')}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </th>
                    <th className="h-12 px-4 text-left align-middle">Status</th>
                    <th className="h-12 px-4 text-left align-middle">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-800">
                      <td className="p-4">{order.id}</td>
                      <td className="p-4 capitalize">{order.asset}</td>
                      <td className="p-4">{order.quantity}</td>
                      <td className="p-4">{order.value} USDT</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {order.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {order.status === 'cancelled' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {order.status === 'in_progress' && (
                            <Activity className="h-4 w-4 text-amber-500" />
                          )}
                          {order.status === 'pending' && (
                            <Clock className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="capitalize">
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {order.status === 'pending' && (
                            <OrderActionDialog
                              order={order}
                              onConfirm={handleCancelOrder}
                              variant="cancel"
                            />
                          )}
                          {order.status === 'in_progress' && (
                            <OrderActionDialog
                              order={order}
                              onConfirm={handleConfirmReceipt}
                              variant="confirm"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="mt-4 flex items-center justify-between px-2">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(endIndex, sortedOrders.length)} of{' '}
                  {sortedOrders.length} orders
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
