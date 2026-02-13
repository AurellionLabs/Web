'use client';

import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDriver } from '@/app/providers/driver.provider';
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
  Activity,
  Package,
  Clock,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Truck,
  Navigation,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import { DeliveryActionDialog } from '@/app/components/ui/delivery-action-dialog';
import { Delivery, DeliveryStatus } from '@/domain/driver';
import { cn } from '@/lib/utils';

type TabType = 'available' | 'my-deliveries';

/**
 * StatCard - Protocol stat card component
 */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  onClick?: () => void;
  isClickable?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  onClick,
  isClickable = false,
}) => (
  <GlassCard
    hover={isClickable}
    className={cn(
      'relative overflow-hidden',
      isClickable &&
        'cursor-pointer transition-all duration-300 hover:scale-[1.02]',
    )}
    onClick={onClick}
  >
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
 * DeliveryCard - Card for displaying delivery information
 */
interface DeliveryCardProps {
  delivery: Delivery;
  onAccept?: (jobId: string) => Promise<void>;
  onPickup?: (jobId: string) => Promise<void>;
  onComplete?: (jobId: string) => Promise<void>;
  isLoading?: boolean;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onAccept,
  onPickup,
  onComplete,
  isLoading,
}) => {
  const getStatusBadge = () => {
    switch (delivery.currentStatus) {
      case DeliveryStatus.PENDING:
        return <StatusBadge status="info" label="Available" size="sm" />;
      case DeliveryStatus.ACCEPTED:
        return <StatusBadge status="warning" label="Accepted" size="sm" />;
      case DeliveryStatus.AWAITING_SENDER:
        return (
          <StatusBadge status="warning" label="Awaiting Signing" size="sm" />
        );
      case DeliveryStatus.PICKED_UP:
        return <StatusBadge status="warning" label="Picked Up" size="sm" />;
      case DeliveryStatus.COMPLETED:
        return <StatusBadge status="success" label="Completed" size="sm" />;
      default:
        return <StatusBadge status="neutral" label="Unknown" size="sm" />;
    }
  };

  return (
    <GlassCard hover className="transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-4 flex-1">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Job ID:</span>
            <span className="font-mono font-medium text-foreground">
              {delivery.jobId}
            </span>
            {getStatusBadge()}
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup Location</p>
                <p className="text-sm text-foreground">
                  {delivery.parcelData.startName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Navigation className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Delivery Location
                </p>
                <p className="text-sm text-foreground">
                  {delivery.parcelData.endName}
                </p>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>ETA: {delivery.ETA} mins</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="font-mono truncate max-w-[120px]">
                {delivery.customer.slice(0, 6)}...{delivery.customer.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Fee and Action */}
        <div className="flex flex-col items-end justify-between gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Fee</p>
            <p className="text-2xl font-bold text-accent">
              ${delivery.fee.toFixed(2)}
            </p>
          </div>

          {delivery.currentStatus === DeliveryStatus.PENDING && onAccept && (
            <DeliveryActionDialog
              delivery={delivery}
              onConfirm={onAccept}
              variant="accept"
              isLoading={isLoading}
            />
          )}
          {delivery.currentStatus === DeliveryStatus.ACCEPTED && onPickup && (
            <DeliveryActionDialog
              delivery={delivery}
              onConfirm={onPickup}
              variant="pickup"
              isLoading={isLoading}
            />
          )}
          {delivery.currentStatus === DeliveryStatus.AWAITING_SENDER && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs text-amber-300">
                Awaiting sender signature
              </span>
            </div>
          )}
          {delivery.currentStatus === DeliveryStatus.PICKED_UP &&
            onComplete && (
              <DeliveryActionDialog
                delivery={delivery}
                onConfirm={onComplete}
                variant="complete"
                isLoading={isLoading}
              />
            )}
        </div>
      </div>
    </GlassCard>
  );
};

/**
 * DriverDashboard - Driver dashboard with Aurellion theme
 */
export default function DriverDashboard() {
  const { setCurrentUserRole } = useMainProvider();
  const {
    availableDeliveries,
    myDeliveries,
    isLoading,
    error,
    refreshDeliveries,
    acceptDelivery,
    completeDelivery,
    confirmPickup,
    packageSign,
    startJourney,
  } = useDriver();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('available');
  // Local status overrides (e.g., driver signed but waiting for sender)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, DeliveryStatus>
  >({});

  const [filters, setFilters] = useState({
    jobId: '',
    pickupLocation: '',
    dropOffLocation: '',
    status: 'all',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const deliveriesPerPage = 5;

  useEffect(() => {
    setCurrentUserRole('driver');
  }, [setCurrentUserRole]);

  // Apply local status overrides (e.g., AWAITING_SENDER)
  const effectiveMyDeliveries = myDeliveries.map((d) =>
    statusOverrides[d.jobId] !== undefined
      ? { ...d, currentStatus: statusOverrides[d.jobId] }
      : d,
  );

  // Filter deliveries
  const filteredMyDeliveries = effectiveMyDeliveries.filter(
    (delivery: Delivery) => {
      if (
        filters.jobId &&
        !delivery.jobId.toLowerCase().includes(filters.jobId.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.status !== 'all' &&
        delivery.currentStatus !== parseInt(filters.status as string)
      ) {
        return false;
      }
      return true;
    },
  );

  const filteredAvailableDeliveries = availableDeliveries.filter(
    (delivery: Delivery) => {
      if (
        filters.jobId &&
        !delivery.jobId.toLowerCase().includes(filters.jobId.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.pickupLocation &&
        (!delivery.parcelData?.startName ||
          !delivery.parcelData.startName
            .toLowerCase()
            .includes(filters.pickupLocation.toLowerCase()))
      ) {
        return false;
      }
      if (
        filters.dropOffLocation &&
        (!delivery.parcelData?.endName ||
          !delivery.parcelData.endName
            .toLowerCase()
            .includes(filters.dropOffLocation.toLowerCase()))
      ) {
        return false;
      }
      return true;
    },
  );

  // Calculate statistics
  const availableCount = availableDeliveries.length;
  const toPickupCount = effectiveMyDeliveries.filter(
    (delivery: Delivery) =>
      delivery.currentStatus === DeliveryStatus.ACCEPTED ||
      delivery.currentStatus === DeliveryStatus.AWAITING_SENDER,
  ).length;
  const toCompleteCount = effectiveMyDeliveries.filter(
    (delivery: Delivery) => delivery.currentStatus === DeliveryStatus.PICKED_UP,
  ).length;
  const completedDeliveries = effectiveMyDeliveries.filter(
    (delivery: Delivery) => delivery.currentStatus === DeliveryStatus.COMPLETED,
  ).length;

  const totalEarnings = effectiveMyDeliveries
    .filter(
      (delivery: Delivery) =>
        delivery.currentStatus === DeliveryStatus.COMPLETED,
    )
    .reduce((total: number, delivery: Delivery) => total + delivery.fee, 0);

  // Pagination
  const currentDeliveries =
    activeTab === 'available'
      ? filteredAvailableDeliveries
      : filteredMyDeliveries;
  const totalPages = Math.ceil(currentDeliveries.length / deliveriesPerPage);
  const startIndex = (currentPage - 1) * deliveriesPerPage;
  const endIndex = startIndex + deliveriesPerPage;
  const paginatedDeliveries = currentDeliveries.slice(startIndex, endIndex);

  // Handlers
  const handleAcceptDelivery = async (jobId: string) => {
    try {
      await acceptDelivery(jobId);
      toast({
        title: 'Delivery Accepted',
        description: 'You have successfully accepted this delivery.',
      });
      setActiveTab('my-deliveries');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to accept delivery. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePickupDelivery = async (jobId: string) => {
    try {
      // Step 1: Driver signs for pickup
      await confirmPickup(jobId);

      // Step 2: Try to start journey (requires both driver + sender signatures)
      try {
        await startJourney(jobId);
        toast({
          title: 'Journey Started',
          description:
            'Pickup signatures confirmed. The journey is now In Progress.',
        });
      } catch (err) {
        // If handOn fails because sender hasn't signed yet, that's expected
        const msg = err instanceof Error ? err.message : String(err);
        const isSenderPending =
          msg.includes('SenderNotSigned') ||
          msg.includes('DriverNotSigned') ||
          msg.includes('0x9651c947') || // DriverNotSigned selector
          msg.includes('0x4b2c0751') || // SenderNotSigned selector
          msg.includes('revert');

        if (isSenderPending) {
          // Update the local status override to show "Awaiting Sender"
          setStatusOverrides((prev) => ({
            ...prev,
            [jobId]: DeliveryStatus.AWAITING_SENDER,
          }));
          toast({
            title: 'Signed for Pickup',
            description:
              'Your signature is recorded. Waiting for the sender to confirm.',
          });
        } else {
          throw err;
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to confirm pickup. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteDelivery = async (jobId: string) => {
    try {
      await packageSign(jobId);
      await completeDelivery(jobId);
      toast({
        title: 'Delivery Confirmed',
        description: 'You have successfully delivered the parcel.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to confirm delivery. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading deliveries...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <GlassCard className="border-trading-sell/30">
            <h2 className="text-lg font-semibold text-trading-sell mb-2">
              Error Loading Deliveries
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <GlowButton variant="outline" onClick={() => refreshDeliveries()}>
              Try Again
            </GlowButton>
          </GlassCard>
        </div>
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
              Driver Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back! Here's an overview of your deliveries
            </p>
          </div>
          <GlowButton
            variant="outline"
            onClick={() => refreshDeliveries()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </GlowButton>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Available"
            value={availableCount}
            icon={Package}
            iconColor="bg-blue-500"
            onClick={() => {
              setActiveTab('available');
              setFilters({
                jobId: '',
                pickupLocation: '',
                dropOffLocation: '',
                status: 'all',
              });
              setCurrentPage(1);
            }}
            isClickable
          />
          <StatCard
            title="To Pick Up"
            value={toPickupCount}
            icon={MapPin}
            iconColor="bg-amber-500"
            onClick={() => {
              setActiveTab('my-deliveries');
              setFilters({
                jobId: '',
                pickupLocation: '',
                dropOffLocation: '',
                status: DeliveryStatus.ACCEPTED.toString(),
              });
              setCurrentPage(1);
            }}
            isClickable
          />
          <StatCard
            title="To Complete"
            value={toCompleteCount}
            icon={Navigation}
            iconColor="bg-accent"
            onClick={() => {
              setActiveTab('my-deliveries');
              setFilters({
                jobId: '',
                pickupLocation: '',
                dropOffLocation: '',
                status: DeliveryStatus.PICKED_UP.toString(),
              });
              setCurrentPage(1);
            }}
            isClickable
          />
          <StatCard
            title="Completed"
            value={completedDeliveries}
            icon={CheckCircle2}
            iconColor="bg-green-500"
            onClick={() => {
              setActiveTab('my-deliveries');
              setFilters({
                jobId: '',
                pickupLocation: '',
                dropOffLocation: '',
                status: DeliveryStatus.COMPLETED.toString(),
              });
              setCurrentPage(1);
            }}
            isClickable
          />
          <StatCard
            title="Total Earnings"
            value={`$${totalEarnings.toFixed(2)}`}
            icon={DollarSign}
            iconColor="bg-purple-500"
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          defaultValue="available"
          className="w-full"
          onValueChange={(value) => {
            setActiveTab(value as TabType);
            setCurrentPage(1);
          }}
        >
          <TabsList className="grid w-full grid-cols-2 bg-surface-overlay border border-glass-border">
            <TabsTrigger
              value="available"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              Available Deliveries
            </TabsTrigger>
            <TabsTrigger
              value="my-deliveries"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              My Deliveries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Available Deliveries</GlassCardTitle>
                <GlassCardDescription>
                  Browse and accept delivery requests
                </GlassCardDescription>
              </GlassCardHeader>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Job ID
                  </label>
                  <Input
                    placeholder="Search by job ID"
                    value={filters.jobId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        jobId: e.target.value,
                      }))
                    }
                    className="bg-surface-overlay border-glass-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Pickup Location
                  </label>
                  <Input
                    placeholder="Search by pickup location"
                    value={filters.pickupLocation}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        pickupLocation: e.target.value,
                      }))
                    }
                    className="bg-surface-overlay border-glass-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Drop-off Location
                  </label>
                  <Input
                    placeholder="Search by drop-off location"
                    value={filters.dropOffLocation}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dropOffLocation: e.target.value,
                      }))
                    }
                    className="bg-surface-overlay border-glass-border"
                  />
                </div>
              </div>

              {/* Delivery List */}
              <div className="space-y-4">
                {paginatedDeliveries.length > 0 ? (
                  paginatedDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.jobId}
                      delivery={delivery}
                      onAccept={handleAcceptDelivery}
                      isLoading={isLoading}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No available deliveries
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="my-deliveries" className="mt-6">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>My Deliveries</GlassCardTitle>
                <GlassCardDescription>
                  Manage your accepted deliveries
                </GlassCardDescription>
              </GlassCardHeader>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Job ID
                  </label>
                  <Input
                    placeholder="Search by job ID"
                    value={filters.jobId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        jobId: e.target.value,
                      }))
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
                      <SelectItem value={DeliveryStatus.ACCEPTED.toString()}>
                        Accepted
                      </SelectItem>
                      <SelectItem
                        value={DeliveryStatus.AWAITING_SENDER.toString()}
                      >
                        Waiting for Sender
                      </SelectItem>
                      <SelectItem value={DeliveryStatus.PICKED_UP.toString()}>
                        Picked Up
                      </SelectItem>
                      <SelectItem value={DeliveryStatus.COMPLETED.toString()}>
                        Completed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Delivery List */}
              <div className="space-y-4">
                {paginatedDeliveries.length > 0 ? (
                  paginatedDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.jobId}
                      delivery={delivery}
                      onPickup={handlePickupDelivery}
                      onComplete={handleCompleteDelivery}
                      isLoading={isLoading}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No deliveries found</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {currentDeliveries.length > deliveriesPerPage && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{' '}
              {Math.min(endIndex, currentDeliveries.length)} of{' '}
              {currentDeliveries.length} deliveries
            </div>
            <div className="flex gap-2">
              <GlowButton
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </GlowButton>
              <GlowButton
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </GlowButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
