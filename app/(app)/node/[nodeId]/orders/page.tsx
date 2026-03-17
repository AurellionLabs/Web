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
  EvaPanel,
  TrapButton,
  EvaStatusBadge,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
  ScanTable,
  ChevronTableRow,
} from '@/app/components/eva/eva-components';
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
import { useQuoteTokenMetadata } from '@/hooks/useQuoteTokenMetadata';

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
            <RefreshCw className="w-8 h-8 text-gold animate-spin" />
            <span className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/40">
              Loading...
            </span>
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
  const { decimals: quoteTokenDecimals, symbol: quoteTokenSymbol } =
    useQuoteTokenMetadata();
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

  const getEvaBadgeStatus = (
    status: string,
  ): 'active' | 'pending' | 'processing' | 'completed' | 'created' => {
    switch (status.toLowerCase()) {
      case 'settled':
        return 'completed';
      case 'cancelled':
        return 'pending';
      case 'processing':
        return 'processing';
      default:
        return 'created';
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Decorative top accent */}
        <GreekKeyStrip color="gold" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                Orders
              </h1>
              <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40 mt-1">
                View and manage all orders for this node
              </p>
            </div>
            <LaurelAccent side="right" />
          </div>
          <TrapButton
            variant="gold"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <span className="flex items-center gap-2">
              <RefreshCw
                className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh Orders'}
            </span>
          </TrapButton>
        </div>

        <EvaScanLine variant="mixed" />

        {/* Filters Section */}
        <EvaSectionMarker
          section="Filters"
          label="Order Query Parameters"
          variant="crimson"
        />

        <EvaPanel
          label="Filter Orders"
          sublabel="Use the filters below to find specific orders"
          sysId="FLT-01"
          accent="crimson"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/45">
                Order ID
              </label>
              <Input
                placeholder="Search by order ID"
                value={filters.orderId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, orderId: e.target.value }))
                }
                className="bg-background/60 border-border/40 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/45">
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
                className="bg-background/60 border-border/40 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/45">
                Asset Type
              </label>
              <Select
                value={filters.assetType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assetType: value }))
                }
              >
                <SelectTrigger className="bg-background/60 border-border/40 font-mono text-sm">
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
              <label className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/45">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="bg-background/60 border-border/40 font-mono text-sm">
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
        </EvaPanel>

        <EvaScanLine variant="gold" />

        {/* Orders Table Section */}
        <EvaSectionMarker
          section="Orders List"
          label="Matching Filter Criteria"
          variant="gold"
        />

        <EvaPanel
          label="Orders List"
          sublabel="All orders matching your filter criteria"
          sysId="ORD-TBL"
          accent="gold"
          noPadding
        >
          <div className="p-5">
            <ScanTable
              headers={[
                'Order ID',
                'Customer',
                'Asset',
                'Quantity ↕',
                'Value ↕',
                'Status',
              ]}
            >
              {displayedOrders.map((order, idx) => (
                <ChevronTableRow key={order.id} index={idx}>
                  <td className="px-4 py-4 font-mono text-sm tracking-[0.05em] text-foreground/80">
                    {order.id}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm tracking-[0.05em] text-foreground/80">
                    {order.buyer.slice(0, 8)}...{order.buyer.slice(-6)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm tracking-[0.05em] uppercase text-foreground/80">
                    {order.asset?.name || 'Unknown Asset'}
                  </td>
                  <td
                    className="px-4 py-4 font-mono text-sm text-gold tabular-nums cursor-pointer"
                    onClick={() => handleSort('quantity')}
                  >
                    <span className="flex items-center gap-1">
                      {order.tokenQuantity}
                      <ArrowUpDown className="w-3 h-3 text-foreground/20" />
                    </span>
                  </td>
                  <td
                    className="px-4 py-4 font-mono text-sm text-gold tabular-nums cursor-pointer"
                    onClick={() => handleSort('value')}
                  >
                    <span className="flex items-center gap-1">
                      {formatTokenAmount(order.price, quoteTokenDecimals, 2)}{' '}
                      {quoteTokenSymbol}
                      <ArrowUpDown className="w-3 h-3 text-foreground/20" />
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <EvaStatusBadge
                      status={getEvaBadgeStatus(order.currentStatus)}
                      label={order.currentStatus}
                    />
                  </td>
                </ChevronTableRow>
              ))}
            </ScanTable>

            {displayedOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
                <p className="font-mono text-sm tracking-[0.15em] uppercase text-foreground/30">
                  No orders found matching your criteria
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredOrders.length > ordersPerPage && (
            <>
              <EvaScanLine variant="mixed" />
              <div className="flex items-center justify-between px-5 py-4">
                <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-foreground/40">
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
                    className="p-2 hover:bg-gold/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{
                      clipPath:
                        'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  >
                    <ChevronsLeft className="w-4 h-4 text-gold/60" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gold/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{
                      clipPath:
                        'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 text-gold/60" />
                  </button>
                  <span className="px-4 font-mono text-[11px] tracking-[0.15em] uppercase text-foreground/50">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gold/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{
                      clipPath:
                        'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  >
                    <ChevronRight className="w-4 h-4 text-gold/60" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gold/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    style={{
                      clipPath:
                        'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    }}
                  >
                    <ChevronsRight className="w-4 h-4 text-gold/60" />
                  </button>
                </div>
              </div>
            </>
          )}
        </EvaPanel>

        {/* Bottom decorative accent */}
        <GreekKeyStrip color="crimson" />
      </div>
    </div>
  );
}
