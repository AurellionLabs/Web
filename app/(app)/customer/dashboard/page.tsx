'use client';

import React, { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useCustomer } from '@/app/providers/customer.provider';
import {
  EvaPanel,
  HexStatCard,
  ScanTable,
  ChevronTableRow,
  TrapButton,
  EvaButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  LaurelAccent,
  HexCluster,
  GreekKeyStrip,
  TargetRings,
} from '@/app/components/eva/eva-components';
import { ChevronDataStream } from '@/app/components/eva/eva-animations';
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
  MoreHorizontal,
  PenLine,
  Info,
} from 'lucide-react';
import { useUserHoldings, UserHolding } from '@/hooks/useUserHoldings';
import { useSettlementDestination } from '@/hooks/useSettlementDestination';
import { AssetDetailDrawer } from '@/app/components/assets/AssetDetailDrawer';
import { SettlementDestinationModal } from '@/app/components/settlement/SettlementDestinationModal';
import { PendingSettlementBanner } from '@/app/components/settlement/PendingSettlementBanner';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { OrderStatus } from '@/domain/orders/order';
import { P2POrderFlow } from '@/app/components/p2p/p2p-order-flow';
import {
  DeliveryDetailsDialog,
  DeliveryFormData,
} from '@/app/components/p2p/delivery-details-dialog';
import { P2PDeliveryDetails } from '@/domain/p2p';
import { getWalletAddress } from '@/dapp-connectors/base-controller';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';
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
const getStatusLabel = (
  status: OrderStatus,
  journeyStatus?: number | null,
): string => {
  // When journey is in transit, show "In Transit"
  if (status === OrderStatus.PROCESSING && journeyStatus === 1) {
    return 'In Transit';
  }
  // When journey is pending/awaiting pickup
  if (
    status === OrderStatus.PROCESSING &&
    (journeyStatus === 0 || journeyStatus === null)
  ) {
    return 'Awaiting Pickup';
  }
  switch (status) {
    case OrderStatus.CREATED:
      return 'Pending';
    case OrderStatus.PROCESSING:
      return 'Processing';
    case OrderStatus.SETTLED:
      return 'Completed';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

/* StatCard removed — using HexStatCard from EVA components */

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

  // Settlement destination
  const { pendingOrders: pendingSettlements, refetch: refetchSettlements } =
    useSettlementDestination();
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<
    string | null
  >(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Asset detail drawer state
  const [selectedHolding, setSelectedHolding] = useState<UserHolding | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Debug: Log P2P orders with tokenIds
  useEffect(() => {
    const p2pOrders = orders.filter((o) => o.isP2P);
    if (p2pOrders.length > 0) {
    }
  }, [orders]);

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
    if (filters.status !== 'all') {
      if (filters.status === 'in_transit') {
        // In Transit: PROCESSING status with journeyStatus === 1
        if (
          order.currentStatus !== OrderStatus.PROCESSING ||
          order.journeyStatus !== 1
        ) {
          return false;
        }
      } else if (filters.status === 'awaiting_pickup') {
        // Awaiting Pickup: PROCESSING status with journeyStatus === 0 or null
        if (
          order.currentStatus !== OrderStatus.PROCESSING ||
          order.journeyStatus === 1
        ) {
          return false;
        }
      } else if (order.currentStatus !== filters.status) {
        return false;
      }
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
    .reduce(
      (total, order) =>
        total + parseFloat(formatTokenAmount(order.price, 18, 6)),
      0,
    );

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
      const result = await signP2PDelivery(orderId, journeyId);

      if (result === 'settled') {
        toast({
          title: 'Order Settled',
          description:
            'Both parties signed. Tokens and payment have been distributed.',
        });
      } else if (result === 'driver_not_signed') {
        toast({
          title: 'Delivery Signed',
          description:
            'Your signature has been recorded. Waiting for driver to sign.',
        });
      } else {
        toast({
          title: 'Delivery Signed',
          description: 'Your delivery signature has been recorded on-chain.',
        });
      }

      return result;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to sign for delivery. Please try again.',
        variant: 'destructive',
      });
      throw err;
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
      const result = await completeP2PHandoff(orderId, journeyId);

      if (result === 'settled') {
        toast({
          title: 'Handoff Complete',
          description:
            'The order has been settled. Tokens and payment distributed.',
        });
      } else if (result === 'driver_not_signed') {
        toast({
          title: 'Waiting for Driver',
          description:
            'The driver has not signed for delivery yet. Please wait.',
        });
      }

      return result;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to complete handoff. Please try again.',
        variant: 'destructive',
      });
      throw err;
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
          startName: order.locationData?.startName || 'Pickup Location',
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
          <RefreshCw className="w-8 h-8 text-gold animate-spin" />
          <span className="font-mono text-sm tracking-[0.15em] uppercase text-white/70">
            Loading orders...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <EvaPanel label="Error" sysId="ERR.ORD" accent="crimson">
            <p className="font-mono text-sm text-white/75 mb-4">{error}</p>
            <TrapButton variant="gold" onClick={() => refreshOrders()}>
              Try Again
            </TrapButton>
          </EvaPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <LaurelAccent side="left" className="hidden md:block mt-1" />
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground">
                Dashboard
              </h1>
              <p className="font-mono text-sm tracking-[0.15em] uppercase text-white/70 mt-1">
                Overview of your orders and trading activity
              </p>
              <GreekKeyStrip color="crimson" />
            </div>
          </div>
          <TrapButton variant="gold" onClick={() => refreshOrders()}>
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </span>
          </TrapButton>
        </div>

        <EvaScanLine variant="mixed" />

        {/* ── Stats Overview — Hex Cards ── */}
        <div className="relative">
          <HexCluster size="md" className="absolute top-2 right-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HexStatCard
              label="In Progress"
              value={String(activeOrders)}
              color="gold"
              powerLevel={Math.min(activeOrders * 2, 10)}
            />
            <HexStatCard
              label="Completed"
              value={String(completedOrders)}
              sub="+12.5% vs last week"
              color="emerald"
              powerLevel={Math.min(completedOrders, 10)}
            />
            <HexStatCard
              label="Pending"
              value={String(pendingOrders)}
              color="crimson"
              powerLevel={Math.min(pendingOrders * 3, 10)}
            />
            <HexStatCard
              label="Total Spent"
              value={`$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="gold"
              powerLevel={6}
            />
          </div>
          <div className="mt-4">
            <GreekKeyStrip color="gold" />
          </div>
        </div>

        {/* ── Settlement Banner ── */}
        <PendingSettlementBanner
          count={pendingSettlements.length}
          onAction={() => {
            if (pendingSettlements.length > 0) {
              setSelectedPendingOrder(pendingSettlements[0]);
              setIsSettlementModalOpen(true);
            }
          }}
        />

        {/* ── Chevron Data Stream divider ── */}
        <ChevronDataStream text="Order Activity Stream" speed="5s" />

        <EvaSectionMarker section="SEC.01" label="Holdings" variant="gold" />

        {/* My Assets - Holdings available for redemption */}
        <EvaPanel
          label="My Assets"
          sublabel="Tokenized assets you own"
          sysId="AST.HLD"
          status="active"
          accent="gold"
        >
          <div className="flex items-center justify-end mb-4">
            <EvaButton
              variant="gold"
              size="sm"
              onClick={() => refetchHoldings()}
              disabled={holdingsLoading}
            >
              <RefreshCw
                className={cn('w-4 h-4', holdingsLoading && 'animate-spin')}
              />
            </EvaButton>
          </div>

          {holdingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : holdingsError ? (
            <div className="text-center py-8">
              <p className="font-mono text-sm text-crimson">{holdingsError}</p>
              <TrapButton
                variant="gold"
                size="sm"
                onClick={() => refetchHoldings()}
                className="mt-4"
              >
                Try Again
              </TrapButton>
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-12">
              <TargetRings size={80} className="mx-auto mb-4" />
              <p className="font-mono text-sm text-white/70">
                No assets in your wallet
              </p>
              <p className="font-mono text-xs text-white/50 mt-1">
                Trade on the order book to acquire tokenized assets
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                return null;
              })()}
              {holdings.map((holding) => (
                <div
                  key={holding.tokenId}
                  className="relative group"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  }}
                >
                  <div
                    className="absolute inset-0 bg-card/70 group-hover:bg-card/90 transition-colors"
                    style={{
                      clipPath:
                        'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                    }}
                  />
                  <div className="absolute left-0 top-0 bottom-3 w-[3px] bg-gold/30" />
                  <div className="absolute inset-0 eva-hex-pattern opacity-15 pointer-events-none" />

                  <div className="relative p-5">
                    {/* Asset header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <EvaStatusBadge
                          status="active"
                          label={holding.className}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSelectedHolding(holding);
                          setIsDrawerOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-gold/10 transition-colors group/info"
                        aria-label="View asset details"
                      >
                        <Info className="w-4 h-4 text-foreground/25 group-hover/info:text-gold transition-colors" />
                      </button>
                    </div>

                    {/* Asset name */}
                    <p className="font-mono text-sm font-medium text-foreground/70 uppercase tracking-wider mb-1">
                      {holding.name || holding.className}
                    </p>

                    {/* Balance */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-mono text-3xl font-bold text-gold tabular-nums">
                        {holding.balance.toString()}
                      </span>
                      <span className="font-mono text-sm text-white/60 uppercase tracking-wider">
                        units
                      </span>
                    </div>

                    {/* Token ID */}
                    <p className="font-mono text-[10px] text-white/50 tabular-nums">
                      Token: {holding.tokenId.slice(0, 12)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </EvaPanel>

        {/* Asset Detail Drawer */}
        <AssetDetailDrawer
          holding={selectedHolding}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedHolding(null);
          }}
          onRedemptionSuccess={() => {
            refetchHoldings();
            refreshOrders();
            toast({
              title: 'Redemption Initiated',
              description:
                'Your physical delivery has been scheduled. Track it in the orders section below.',
            });
          }}
        />

        <EvaSectionMarker section="SEC.02" label="Orders" variant="crimson" />

        {/* Recent Orders */}
        <EvaPanel
          label="Recent Orders"
          sublabel="Latest order activity"
          sysId="ORD.RCT"
          accent="crimson"
        >
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
                    {getStatusLabel(OrderStatus.CREATED, undefined)}
                  </SelectItem>
                  <SelectItem value="awaiting_pickup">
                    {getStatusLabel(OrderStatus.PROCESSING, 0)}
                  </SelectItem>
                  <SelectItem value="in_transit">
                    {getStatusLabel(OrderStatus.PROCESSING, 1)}
                  </SelectItem>
                  <SelectItem value={OrderStatus.SETTLED}>
                    {getStatusLabel(OrderStatus.SETTLED, undefined)}
                  </SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>
                    {getStatusLabel(OrderStatus.CANCELLED, undefined)}
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
                          ${formatTokenAmount(order.price, 18, 2)}
                        </td>
                        <td className="px-4 py-4">
                          <EvaStatusBadge
                            status={
                              order.currentStatus === OrderStatus.SETTLED
                                ? 'completed'
                                : order.currentStatus ===
                                      OrderStatus.PROCESSING &&
                                    order.journeyStatus === 1
                                  ? 'active'
                                  : order.currentStatus ===
                                      OrderStatus.PROCESSING
                                    ? 'processing'
                                    : 'created'
                            }
                            label={getStatusLabel(
                              order.currentStatus,
                              order.journeyStatus,
                            )}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="p-2 rounded-lg hover:bg-glass-hover transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* Sign for Delivery — available when order is PROCESSING and journey is in transit */}
                                {order.journeyIds &&
                                  order.journeyIds.length > 0 &&
                                  order.currentStatus ===
                                    OrderStatus.PROCESSING &&
                                  order.journeyStatus === 1 && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (isP2P) {
                                          handleSignP2PDelivery(
                                            order.id,
                                            order.journeyIds![0],
                                          );
                                        } else {
                                          handleConfirmReceipt(order.id);
                                        }
                                      }}
                                      disabled={loading}
                                    >
                                      <PenLine className="w-4 h-4 mr-2" />
                                      Sign for Delivery
                                    </DropdownMenuItem>
                                  )}
                                {/* Confirm Receipt — PROCESSING, non-P2P */}
                                {order.currentStatus ===
                                  OrderStatus.PROCESSING &&
                                  !isP2P && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleConfirmReceipt(order.id)
                                      }
                                      disabled={loading}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Confirm Receipt
                                    </DropdownMenuItem>
                                  )}
                                {/* Cancel Order — only CREATED */}
                                {order.currentStatus ===
                                  OrderStatus.CREATED && (
                                  <DropdownMenuItem
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="text-red-400 focus:text-red-400"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                )}
                                {/* P2P Flow toggle */}
                                {isP2P &&
                                  order.currentStatus !== OrderStatus.SETTLED &&
                                  order.currentStatus !==
                                    OrderStatus.CANCELLED && (
                                    <DropdownMenuItem
                                      onClick={() => toggleP2PExpand(order.id)}
                                    >
                                      <Package className="w-4 h-4 mr-2" />
                                      {isExpanded
                                        ? 'Hide P2P Flow'
                                        : 'View P2P Flow'}
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                              onSettled={(orderId) => {
                                setSelectedPendingOrder(orderId);
                                setIsSettlementModalOpen(true);
                              }}
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
              <div className="mt-4 flex items-center justify-between px-2 pt-4 border-t border-border/15">
                <div className="font-mono text-xs text-white/60 tracking-wider">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(endIndex, sortedOrders.length)} of{' '}
                  {sortedOrders.length} orders
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4 text-white/70" />
                  </button>
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/70" />
                  </button>
                  <span className="px-4 font-mono text-xs text-white/60 tabular-nums">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white/70" />
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gold/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </EvaPanel>
      </div>

      {/* Settlement Destination Modal */}
      {selectedPendingOrder && (
        <SettlementDestinationModal
          isOpen={isSettlementModalOpen}
          orderId={selectedPendingOrder}
          onClose={() => {
            setIsSettlementModalOpen(false);
            setSelectedPendingOrder(null);
          }}
          onSuccess={() => {
            refetchSettlements();
          }}
        />
      )}

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
              initialDeliveryAddress={stuckOrder.locationData?.endName || ''}
              lockDeliveryAddress={Boolean(stuckOrder.locationData?.endName)}
            />
          );
        })()}
    </div>
  );
}
