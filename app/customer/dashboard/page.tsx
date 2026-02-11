'use client';

import React, { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useCustomer } from '@/app/providers/customer.provider';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/app/components/ui/glass-card';
import { GlowButton } from '@/app/components/ui/glow-button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { AnimatedNumber } from '@/app/components/ui/animated-number';
import { cn } from '@/lib/utils';
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
  TrendingUp,
  Wallet,
  Send,
} from 'lucide-react';
import { useUserHoldings, UserHolding } from '@/hooks/useUserHoldings';
import { RedemptionDialog } from '@/app/components/redemption/RedemptionDialog';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { OrderActionDialog } from '@/app/components/ui/order-action-dialog';
import { OrderStatus } from '@/domain/orders/order';
import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import {
  DeliveryDetailsDialog,
  DeliveryFormData,
} from '@/app/components/p2p/delivery-details-dialog';
import { P2PDeliveryDetails } from '@/domain/p2p';
import { getWalletAddress } from '@/dapp-connectors/base-controller';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '@/chain-constants';
import { BrowserProvider, Contract } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { AUSYS_ABI } from '@/lib/constants/contracts';
import { formatTokenAmount } from '@/lib/formatters';

type SortConfig = {
  key: 'tokenQuantity' | 'price' | null;
  direction: 'asc' | 'desc';
};

/**
 * Get display label for OrderStatus
 */
const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.CREATED:
      return 'Created';
    case OrderStatus.PROCESSING:
      return 'Processing';
    case OrderStatus.SETTLED:
      return 'Settled';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

/**
 * StatCard - Glowing stat card component
 */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  prefix?: string;
  suffix?: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  prefix,
  suffix,
  trend,
}) => (
  <GlassCard hover className="relative overflow-hidden">
    {/* Background glow */}
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
        <div className="flex items-baseline gap-1">
          {prefix && (
            <span className="text-2xl font-bold text-foreground">{prefix}</span>
          )}
          {typeof value === 'number' ? (
            <AnimatedNumber
              value={value}
              fixed={0}
              className="text-2xl font-bold text-foreground"
            />
          ) : (
            <span className="text-2xl font-bold text-foreground">{value}</span>
          )}
          {suffix && (
            <span className="text-lg text-muted-foreground">{suffix}</span>
          )}
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend >= 0 ? 'text-trading-buy' : 'text-trading-sell',
            )}
          >
            <TrendingUp className={cn('w-3 h-3', trend < 0 && 'rotate-180')} />
            <span>
              {trend >= 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
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

/**
 * CustomerDashboard - Dashboard with terminal styling
 */
export default function CustomerDashboard() {
  const { setCurrentUserRole } = useMainProvider();
  const {
    orders,
    isLoading,
    error,
    refreshOrders,
    cancelOrder,
    confirmReceipt,
    signP2PDelivery,
    completeP2PHandoff,
    getP2PSignatureState,
    createP2PJourney,
  } = useCustomer();
  const { toast } = useToast();
  const { address: walletAddress } = useWallet();

  // User holdings for redemption
  const {
    holdings,
    isLoading: holdingsLoading,
    error: holdingsError,
    refetch: refetchHoldings,
  } = useUserHoldings();

  // Redemption dialog state
  const [selectedHolding, setSelectedHolding] = useState<UserHolding | null>(
    null,
  );
  const [isRedemptionOpen, setIsRedemptionOpen] = useState(false);

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
  // Track which P2P orders are expanded to show the flow detail
  const [expandedP2POrders, setExpandedP2POrders] = useState<
    Record<string, boolean>
  >({});
  const [p2pActionLoading, setP2PActionLoading] = useState(false);
  // State for scheduling delivery on stuck P2P orders
  const [scheduleDeliveryOrderId, setScheduleDeliveryOrderId] = useState<
    string | null
  >(null);
  const [scheduleDeliveryDialogOpen, setScheduleDeliveryDialogOpen] =
    useState(false);

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
    (order) => order.currentStatus === OrderStatus.PROCESSING,
  ).length;
  const completedOrders = filteredOrders.filter(
    (order) => order.currentStatus === OrderStatus.SETTLED,
  ).length;
  const pendingOrders = filteredOrders.filter(
    (order) => order.currentStatus === OrderStatus.CREATED,
  ).length;
  const totalSpent = filteredOrders
    .filter((order) => order.currentStatus === OrderStatus.SETTLED)
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

  const toggleP2PExpand = (orderId: string) => {
    setExpandedP2POrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleSignP2PDelivery = async (orderId: string, journeyId: string) => {
    try {
      setP2PActionLoading(true);
      await signP2PDelivery(orderId, journeyId);
      toast({
        title: 'Delivery Signed',
        description: 'Your delivery signature has been recorded on-chain.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to sign for delivery. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setP2PActionLoading(false);
    }
  };

  const handleCompleteP2PHandoff = async (
    orderId: string,
    journeyId: string,
  ) => {
    try {
      setP2PActionLoading(true);
      await completeP2PHandoff(orderId, journeyId);
      toast({
        title: 'Handoff Complete',
        description:
          'The order has been settled. Tokens and payment distributed.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to complete handoff. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setP2PActionLoading(false);
    }
  };

  // Schedule delivery for a stuck P2P order (no journey yet)
  const handleScheduleDelivery = (orderId: string) => {
    setScheduleDeliveryOrderId(orderId);
    setScheduleDeliveryDialogOpen(true);
  };

  const handleConfirmScheduleDelivery = async (
    deliveryData: DeliveryFormData,
  ) => {
    if (!scheduleDeliveryOrderId || !walletAddress) return;
    const order = orders.find((o) => o.id === scheduleDeliveryOrderId);
    if (!order) return;
    try {
      setP2PActionLoading(true);

      const senderNode =
        deliveryData.senderNodeAddress ||
        order.seller ||
        order.nodes?.[0] ||
        '';

      const delivery: P2PDeliveryDetails = {
        senderNodeAddress: senderNode,
        receiverAddress: walletAddress,
        parcelData: {
          startLocation: {
            lat: order.locationData?.startLocation?.lat || '',
            lng: order.locationData?.startLocation?.lng || '',
          },
          endLocation: { lat: '', lng: '' },
          startName: order.locationData?.startName || 'Seller Location',
          endName: deliveryData.deliveryAddress,
        },
        bountyWei: BigInt('500000000000000000'), // 0.5 USDT default bounty
        etaTimestamp: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600), // 7 days
        tokenQuantity: BigInt(order.tokenQuantity),
        assetId: BigInt(order.tokenId),
        deliveryAddress: deliveryData.deliveryAddress,
      };

      await createP2PJourney(scheduleDeliveryOrderId, delivery);
      setScheduleDeliveryDialogOpen(false);
      setScheduleDeliveryOrderId(null);
      toast({
        title: 'Delivery Scheduled',
        description: 'A delivery journey has been created for this order.',
      });
    } catch (err) {
      console.error('Error scheduling delivery:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to schedule delivery. Please try again.';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
      throw err; // Re-throw so dialog can show the error
    } finally {
      setP2PActionLoading(false);
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    try {
      setLoading(true);
      await confirmReceipt(orderId);
      await refreshOrders();
      const order = orders.find((o) => o.id === orderId);
      if (order?.currentStatus === OrderStatus.SETTLED) {
        toast({
          title: 'Delivery Completed',
          description:
            'The delivery has been completed and payment has been processed.',
        });
      } else {
        toast({
          title: 'Receipt Confirmed',
          description: 'Your receipt confirmation has been recorded.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to confirm receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <GlassCard className="border-trading-sell/30">
            <h2 className="text-lg font-semibold text-trading-sell mb-2">
              Error Loading Orders
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <GlowButton variant="outline" onClick={() => refreshOrders()}>
              Try Again
            </GlowButton>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your orders and trading activity
            </p>
          </div>
          <GlowButton
            variant="secondary"
            onClick={() => refreshOrders()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </GlowButton>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="In Progress"
            value={activeOrders}
            icon={Activity}
            iconColor="bg-yellow-500"
          />
          <StatCard
            title="Completed"
            value={completedOrders}
            icon={Package}
            iconColor="bg-green-500"
            trend={12.5}
          />
          <StatCard
            title="Pending"
            value={pendingOrders}
            icon={Clock}
            iconColor="bg-blue-500"
          />
          <StatCard
            title="Total Spent"
            value={totalSpent / 1000000} // Convert from USDT units
            icon={ShoppingCart}
            iconColor="bg-purple-500"
            prefix="$"
          />
        </div>

        {/* My Assets - Holdings available for redemption */}
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <GlassCardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  My Assets
                </GlassCardTitle>
                <GlassCardDescription>
                  Tokenized assets you own - redeem to receive physical delivery
                </GlassCardDescription>
              </div>
              <GlowButton
                variant="ghost"
                size="sm"
                onClick={() => refetchHoldings()}
                disabled={holdingsLoading}
              >
                <RefreshCw
                  className={cn('w-4 h-4', holdingsLoading && 'animate-spin')}
                />
              </GlowButton>
            </div>
          </GlassCardHeader>

          {holdingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            </div>
          ) : holdingsError ? (
            <div className="text-center py-8">
              <p className="text-trading-sell text-sm">{holdingsError}</p>
              <GlowButton
                variant="outline"
                size="sm"
                onClick={() => refetchHoldings()}
                className="mt-4"
              >
                Try Again
              </GlowButton>
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No assets in your wallet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Trade on the order book to acquire tokenized assets
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {holdings.map((holding) => (
                <div
                  key={holding.tokenId}
                  className={cn(
                    'relative p-4 rounded-xl',
                    'bg-glass-bg border border-glass-border',
                    'hover:border-accent/30 transition-all duration-200',
                    'group',
                  )}
                >
                  {/* Asset glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    {/* Asset header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {holding.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {holding.assetClass}
                        </p>
                      </div>
                      <StatusBadge
                        status="connected"
                        label={holding.className}
                        size="sm"
                      />
                    </div>

                    {/* Balance */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-foreground">
                        {holding.balance.toString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        units
                      </span>
                    </div>

                    {/* Token ID */}
                    <p className="text-xs font-mono text-muted-foreground mb-4">
                      Token: {holding.tokenId.slice(0, 12)}...
                    </p>

                    {/* Redeem button */}
                    <GlowButton
                      variant="primary"
                      size="sm"
                      className="w-full"
                      leftIcon={<Send className="w-4 h-4" />}
                      onClick={() => {
                        setSelectedHolding(holding);
                        setIsRedemptionOpen(true);
                      }}
                    >
                      Redeem for Delivery
                    </GlowButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Redemption Dialog */}
        {selectedHolding && (
          <RedemptionDialog
            isOpen={isRedemptionOpen}
            onClose={() => {
              setIsRedemptionOpen(false);
              setSelectedHolding(null);
            }}
            holding={selectedHolding}
            onSuccess={() => {
              refetchHoldings();
              refreshOrders();
              toast({
                title: 'Redemption Initiated',
                description:
                  'Your physical delivery has been scheduled. Track it in the orders section below.',
              });
            }}
          />
        )}

        {/* Recent Orders */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Recent Orders</GlassCardTitle>
            <GlassCardDescription>
              Your latest order activity
            </GlassCardDescription>
          </GlassCardHeader>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={OrderStatus.CREATED}>
                    {getStatusLabel(OrderStatus.CREATED)}
                  </SelectItem>
                  <SelectItem value={OrderStatus.PROCESSING}>
                    {getStatusLabel(OrderStatus.PROCESSING)}
                  </SelectItem>
                  <SelectItem value={OrderStatus.SETTLED}>
                    {getStatusLabel(OrderStatus.SETTLED)}
                  </SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>
                    {getStatusLabel(OrderStatus.CANCELLED)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Orders table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('tokenQuantity')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Quantity
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('price')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Value
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
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
                {currentOrders.map((order) => {
                  const isP2P = Boolean(order.isP2P);
                  const isExpanded = expandedP2POrders[order.id];

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={cn(
                          'hover:bg-glass-hover transition-colors',
                          isP2P && 'cursor-pointer',
                          isExpanded && 'bg-glass-hover',
                        )}
                        onClick={
                          isP2P ? () => toggleP2PExpand(order.id) : undefined
                        }
                      >
                        <td className="px-4 py-4 text-sm font-mono text-foreground">
                          <div className="flex items-center gap-2">
                            {order.id.slice(0, 8)}...
                            {isP2P && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                P2P
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground capitalize">
                          {order.asset?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-4 text-sm font-mono text-foreground">
                          {order.tokenQuantity}
                        </td>
                        <td className="px-4 py-4 text-sm font-mono text-foreground">
                          ${formatTokenAmount(order.price, 6, 2)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            status={
                              order.currentStatus === OrderStatus.SETTLED
                                ? 'connected'
                                : order.currentStatus === OrderStatus.CANCELLED
                                  ? 'disconnected'
                                  : order.currentStatus ===
                                      OrderStatus.PROCESSING
                                    ? 'warning'
                                    : 'pending'
                            }
                            label={getStatusLabel(order.currentStatus)}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {order.currentStatus === OrderStatus.CREATED && (
                              <OrderActionDialog
                                order={order}
                                onConfirm={handleCancelOrder}
                                variant="cancel"
                              />
                            )}
                            {order.currentStatus === OrderStatus.PROCESSING &&
                              !isP2P && (
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
                            {isP2P &&
                              order.currentStatus !== OrderStatus.SETTLED &&
                              order.currentStatus !== OrderStatus.CANCELLED && (
                                <button
                                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleP2PExpand(order.id);
                                  }}
                                >
                                  {isExpanded ? 'Hide Flow' : 'View Flow'}
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable P2P Order Flow row */}
                      {isP2P && isExpanded && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-2 bg-surface-overlay/50"
                          >
                            <P2POrderFlow
                              order={order}
                              onSignDelivery={handleSignP2PDelivery}
                              onCompleteHandoff={handleCompleteP2PHandoff}
                              onScheduleDelivery={handleScheduleDelivery}
                              fetchSignatureState={getP2PSignatureState}
                              isActionLoading={p2pActionLoading}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {currentOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2 pt-4 border-t border-glass-border">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(endIndex, sortedOrders.length)} of{' '}
                  {sortedOrders.length} orders
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
      </div>

      {/* Delivery Details Dialog for stuck P2P orders */}
      {scheduleDeliveryOrderId &&
        (() => {
          const stuckOrder = orders.find(
            (o) => o.id === scheduleDeliveryOrderId,
          );
          if (!stuckOrder) return null;
          // Build a P2POffer-shaped object from the order for the dialog
          const pseudoOffer = {
            id: stuckOrder.id,
            creator: stuckOrder.seller,
            targetCounterparty: null,
            token: stuckOrder.token,
            tokenId: stuckOrder.tokenId,
            quantity: BigInt(stuckOrder.tokenQuantity),
            price: BigInt(stuckOrder.price),
            txFee: BigInt(stuckOrder.txFee),
            isSellerInitiated: true,
            status: 1, // PROCESSING
            buyer: stuckOrder.buyer,
            seller: stuckOrder.seller,
            createdAt: 0,
            expiresAt: 0,
            locationData: stuckOrder.locationData,
            nodes: stuckOrder.nodes || [],
          };
          return (
            <DeliveryDetailsDialog
              offer={pseudoOffer as any}
              open={scheduleDeliveryDialogOpen}
              onOpenChange={(open) => {
                setScheduleDeliveryDialogOpen(open);
                if (!open) setScheduleDeliveryOrderId(null);
              }}
              onConfirm={handleConfirmScheduleDelivery}
              assetName={stuckOrder.asset?.name}
            />
          );
        })()}
    </div>
  );
}
