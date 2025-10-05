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
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from '@/app/components/ui/use-toast';
import { OrderActionDialog } from '@/app/components/ui/order-action-dialog';
import { OrderStatus } from '@/domain/orders/order';
import { OrderWithAsset } from '@/app/providers/customer.provider';
import { getWalletAddress } from '@/dapp-connectors/base-controller';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '@/chain-constants';
import { BrowserProvider, Contract } from 'ethers';
import { AUSYS_ABI } from '@/lib/constants/contracts';

type SortConfig = {
  key: 'tokenQuantity' | 'price' | null;
  direction: 'asc' | 'desc';
};

// Helper function to get display label for OrderStatus
const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Pending';
    case OrderStatus.ACTIVE:
      return 'Active';
    case OrderStatus.COMPLETED:
      return 'Completed';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

const ASSETS = [
  { value: 'all', label: 'All Assets' },
  { value: '3', label: 'Cow' },
  { value: '1', label: 'Goat' },
  { value: '2', label: 'Sheep' },
  { value: '4', label: 'Chicken' },
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
  const [waitingForSignature, setWaitingForSignature] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [signatureCleanups, setSignatureCleanups] = useState<
    Record<string, () => void>
  >({});

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
    if (filters.asset !== 'all' && order.tokenId.toString() !== filters.asset) {
      return false;
    }
    if (filters.status !== 'all' && order.currentStatus !== filters.status) {
      return false;
    }
    return true;
  });

  // Apply sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortConfig.key === null) return 0;

    const aValue =
      sortConfig.key === 'price'
        ? parseFloat(a[sortConfig.key])
        : a[sortConfig.key];
    const bValue =
      sortConfig.key === 'price'
        ? parseFloat(b[sortConfig.key])
        : b[sortConfig.key];

    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calculate statistics from filtered orders
  const activeOrders = filteredOrders.filter(
    (order) => order.currentStatus === OrderStatus.ACTIVE,
  ).length;
  const completedOrders = filteredOrders.filter(
    (order) => order.currentStatus === OrderStatus.COMPLETED,
  ).length;
  const pendingOrders = filteredOrders.filter(
    (order) => order.currentStatus === OrderStatus.PENDING,
  ).length;

  const totalSpent = filteredOrders
    .filter((order) => order.currentStatus === OrderStatus.COMPLETED)
    .reduce((total, order) => total + parseFloat(order.price), 0);

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

  const handleSort = (key: 'tokenQuantity' | 'price') => {
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

  const handleSignatureTimeout = (orderId: string) => {
    setWaitingForSignature((prev) => ({ ...prev, [orderId]: false }));
    toast({
      title: 'Signature Timeout',
      description:
        'The driver did not sign within the time limit. Please try again.',
      variant: 'destructive',
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('Ethereum provider not found');
      return;
    }

    const setupEventListener = async () => {
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const contract = new Contract(
          NEXT_PUBLIC_AUSYS_ADDRESS,
          AUSYS_ABI,
          provider,
        );

        const filter = contract.filters.emitSig();

        const handleSignatureEvent = async (user: string, id: string) => {
          if (waitingForSignature[id]) {
            if (signatureCleanups[id]) {
              signatureCleanups[id]();
              setSignatureCleanups((prev) => {
                const newCleanups = { ...prev };
                delete newCleanups[id];
                return newCleanups;
              });
            }

            const customerAddress = getWalletAddress();
            if (user.toLowerCase() !== customerAddress.toLowerCase()) {
              setWaitingForSignature((prev) => ({ ...prev, [id]: false }));
              await refreshOrders();
              toast({
                title: 'Signature Received',
                description: 'The driver has signed the receipt confirmation.',
              });
            }
          }
        };

        contract.on(filter, handleSignatureEvent);

        return () => {
          contract.off(filter, handleSignatureEvent);
          Object.values(signatureCleanups).forEach((cleanup) => cleanup());
        };
      } catch (error) {
        console.error('Error setting up event listener:', error);
      }
    };

    setupEventListener();
  }, [waitingForSignature, signatureCleanups, refreshOrders]);

  const handleConfirmReceipt = async (orderId: string) => {
    try {
      setLoading(true);
      await confirmReceipt(orderId);
      setWaitingForSignature((prev) => ({ ...prev, [orderId]: true }));

      // Set a timeout to stop waiting after some time
      const timeoutId = setTimeout(() => {
        setWaitingForSignature((prev) => ({ ...prev, [orderId]: false }));
        toast({
          title: 'Signature Timeout',
          description:
            'The driver did not sign within the time limit. Please try again.',
          variant: 'destructive',
        });
      }, 120000); // 2 minutes timeout

      // Store cleanup function
      setSignatureCleanups((prev) => ({
        ...prev,
        [orderId]: () => clearTimeout(timeoutId),
      }));

      toast({
        title: 'Receipt Confirmation Sent',
        description: 'Waiting for driver signature confirmation.',
      });
    } catch (error) {
      console.error('Error confirming receipt:', error);
      if (error instanceof Error) {
        if (
          error.message.includes('Customer can only sign for the final leg')
        ) {
          toast({
            title: 'Cannot Sign Yet',
            description:
              'You can only sign for the final leg of the journey when the package arrives at your location.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to confirm receipt. Please try again.',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Cleanup signature listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(signatureCleanups).forEach((cleanup) => cleanup());
    };
  }, [signatureCleanups]);

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

  const renderOrderCard = (order: OrderWithAsset) => (
    <Card key={order.id} className="bg-[#1a1f2d] border-0">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Order ID:</span>
              <span className="font-medium">{order.id}</span>
              <span className="ml-4">
                {order.currentStatus === OrderStatus.PENDING && (
                  <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-full">
                    Pending
                  </span>
                )}
                {order.currentStatus === OrderStatus.ACTIVE && (
                  <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
                {order.currentStatus === OrderStatus.COMPLETED && (
                  <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-full">
                    Completed
                  </span>
                )}
                {order.currentStatus === OrderStatus.CANCELLED && (
                  <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded-full">
                    Cancelled
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Asset</div>
                <div className="text-sm text-gray-400 capitalize">
                  {order.asset?.name}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Quantity</div>
                <div className="text-sm text-gray-400">
                  {order.tokenQuantity}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              {order.locationData?.endName && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.locationData.endName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-between items-end">
            <div className="text-2xl font-bold text-amber-500">
              ${parseFloat(order.price).toFixed(2)}
            </div>
            <div className="flex justify-end space-x-4">
              {order.currentStatus === OrderStatus.PENDING && (
                <OrderActionDialog
                  order={order}
                  onConfirm={handleCancelOrder}
                  variant="cancel"
                />
              )}
              {order.currentStatus === OrderStatus.ACTIVE && (
                <OrderActionDialog
                  order={order}
                  onConfirm={handleConfirmReceipt}
                  variant="confirm"
                  isLoading={loading}
                  isWaitingForSignature={waitingForSignature[order.id]}
                  waitingForRole="driver"
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
                  <h3 className="text-2xl font-bold mt-2">{activeOrders}</h3>
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
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={OrderStatus.PENDING}>
                      {getStatusLabel(OrderStatus.PENDING)}
                    </SelectItem>
                    <SelectItem value={OrderStatus.ACTIVE}>
                      {getStatusLabel(OrderStatus.ACTIVE)}
                    </SelectItem>
                    <SelectItem value={OrderStatus.COMPLETED}>
                      {getStatusLabel(OrderStatus.COMPLETED)}
                    </SelectItem>
                    <SelectItem value={OrderStatus.CANCELLED}>
                      {getStatusLabel(OrderStatus.CANCELLED)}
                    </SelectItem>
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
                        onClick={() => handleSort('tokenQuantity')}
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
                        onClick={() => handleSort('price')}
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
                      <td className="p-4 capitalize">{order.asset?.name}</td>
                      <td className="p-4">{order.tokenQuantity}</td>
                      <td className="p-4">{order.price} USDT</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {order.currentStatus === OrderStatus.COMPLETED && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {order.currentStatus === OrderStatus.CANCELLED && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {order.currentStatus === OrderStatus.ACTIVE && (
                            <Activity className="h-4 w-4 text-amber-500" />
                          )}
                          {order.currentStatus === OrderStatus.PENDING && (
                            <Clock className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="capitalize">
                            {getStatusLabel(order.currentStatus)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {order.currentStatus === OrderStatus.PENDING && (
                            <OrderActionDialog
                              order={order}
                              onConfirm={handleCancelOrder}
                              variant="cancel"
                            />
                          )}
                          {order.currentStatus === OrderStatus.ACTIVE && (
                            <OrderActionDialog
                              order={order}
                              onConfirm={handleConfirmReceipt}
                              variant="confirm"
                              isLoading={loading}
                              isWaitingForSignature={
                                waitingForSignature[order.id]
                              }
                              waitingForRole="driver"
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
