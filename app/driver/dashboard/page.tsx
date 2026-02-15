'use client';

import { useEffect, useRef, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import { useDriver } from '@/app/providers/driver.provider';
import {
  EvaPanel,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  HexStatCard,
  TargetRings,
  TrapButton,
  EvaStatusBadge,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
import {
  CascadeLoadBars,
  ChevronDataStream,
} from '@/app/components/eva/eva-animations';
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
import { useWallet } from '@/hooks/useWallet';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  type EmitSigEventsByJourneyResponse,
} from '@/infrastructure/shared/graph-queries';
import { NEXT_PUBLIC_AUSYS_SUBGRAPH_URL } from '@/chain-constants';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

type TabType = 'available' | 'my-deliveries';

/**
 * StatCard - Protocol stat card using HexStatCard
 */
interface StatCardProps {
  title: string;
  value: number | string;
  color?: 'gold' | 'crimson' | 'emerald';
  powerLevel?: number;
  onClick?: () => void;
  isClickable?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  color = 'gold',
  powerLevel = 0,
  onClick,
  isClickable = false,
}) => (
  <div
    className={cn(
      isClickable &&
        'cursor-pointer transition-transform duration-300 hover:scale-[1.03]',
    )}
    onClick={onClick}
  >
    <HexStatCard
      label={title}
      value={typeof value === 'number' ? value.toString() : value}
      color={color}
      powerLevel={powerLevel}
    />
  </div>
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
  isWaitingForCustomer?: boolean;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onAccept,
  onPickup,
  onComplete,
  isLoading,
  isWaitingForCustomer,
}) => {
  const getStatusBadge = () => {
    switch (delivery.currentStatus) {
      case DeliveryStatus.PENDING:
        return <EvaStatusBadge status="created" label="Available" />;
      case DeliveryStatus.ACCEPTED:
        return <EvaStatusBadge status="processing" label="Accepted" />;
      case DeliveryStatus.AWAITING_SENDER:
        return <EvaStatusBadge status="pending" label="Waiting for Sender" />;
      case DeliveryStatus.PICKED_UP:
        return <EvaStatusBadge status="active" label="Picked Up" />;
      case DeliveryStatus.COMPLETED:
        return <EvaStatusBadge status="completed" label="Completed" />;
      default:
        return <EvaStatusBadge status="pending" label="Unknown" />;
    }
  };

  return (
    <EvaPanel
      label="Delivery"
      sysId={`JOB-${delivery.jobId.slice(0, 6)}`}
      accent={
        delivery.currentStatus === DeliveryStatus.COMPLETED ? 'gold' : 'crimson'
      }
    >
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-4 flex-1">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
              Job ID:
            </span>
            <span className="font-mono font-bold text-gold tracking-wider">
              {delivery.jobId}
            </span>
            {getStatusBadge()}
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-crimson mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40">
                  Pickup Location
                </p>
                <p className="font-mono text-sm text-foreground/80">
                  {delivery.parcelData.startName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Navigation className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40">
                  Delivery Location
                </p>
                <p className="font-mono text-sm text-foreground/80">
                  {delivery.parcelData.endName}
                </p>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-6 font-mono text-xs text-foreground/40 tracking-wider">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="uppercase">ETA: {delivery.ETA} mins</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="tabular-nums truncate max-w-[120px]">
                {delivery.customer.slice(0, 6)}...{delivery.customer.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Fee and Action */}
        <div className="flex flex-col items-end justify-between gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40">
              Fee
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-gold">
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
            <div
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20"
              style={{
                clipPath:
                  'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              }}
            >
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-amber-300">
                Waiting for sender to sign
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
                isWaitingForSignature={isWaitingForCustomer}
                waitingForRole="customer"
              />
            )}
        </div>
      </div>
    </EvaPanel>
  );
};

/**
 * DriverDashboard - Driver dashboard with EVA/NERV theme
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
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('available');
  // Local status overrides (e.g., driver signed but waiting for sender)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, DeliveryStatus>
  >({});
  // Track jobs where driver signed for delivery but customer hasn't yet
  const [waitingForCustomerJobs, setWaitingForCustomerJobs] = useState<
    Set<string>
  >(new Set());

  // Ref to avoid re-checking the same delivery jobs on every render
  const checkedDeliveryJobsRef = useRef<Set<string>>(new Set());

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

  // On load/refresh, check EmitSig events for PICKED_UP deliveries to restore
  // the "waiting for customer" state (waitingForCustomerJobs is local React
  // state and resets on reload). Pickup-phase checking is handled by the
  // DriverProvider which sets AWAITING_SENDER directly on delivery objects.
  useEffect(() => {
    const checkDeliverySignatures = async () => {
      if (!address || myDeliveries.length === 0) return;
      const driverAddr = address.toLowerCase();

      const uncheckedPickedUp = myDeliveries.filter(
        (d) =>
          d.currentStatus === DeliveryStatus.PICKED_UP &&
          !checkedDeliveryJobsRef.current.has(d.jobId),
      );

      if (uncheckedPickedUp.length === 0) return;

      uncheckedPickedUp.forEach((d) =>
        checkedDeliveryJobsRef.current.add(d.jobId),
      );
      const newWaitingJobs = new Set<string>();

      await Promise.all(
        uncheckedPickedUp.map(async (delivery) => {
          try {
            const ausys = RepositoryContext.getInstance().getAusysContract();
            const journey = await ausys.getJourney(delivery.jobId as any);
            const pickupTimestamp = Number(journey.journeyStart);
            const receiverAddr = journey.receiver.toLowerCase();

            const sigResponse =
              await graphqlRequest<EmitSigEventsByJourneyResponse>(
                NEXT_PUBLIC_AUSYS_SUBGRAPH_URL,
                GET_EMIT_SIG_EVENTS_BY_JOURNEY,
                { journeyId: delivery.jobId, limit: 50 },
              );

            const sigEvents = sigResponse.diamondEmitSigEventss?.items || [];
            // Only sigs after journey started count as delivery sigs
            const deliverySigs = sigEvents.filter(
              (e) => Number(e.block_timestamp) > pickupTimestamp,
            );

            const driverDeliverySigned = deliverySigs.some(
              (e) => e.user.toLowerCase() === driverAddr,
            );
            const receiverSigned = deliverySigs.some(
              (e) => e.user.toLowerCase() === receiverAddr,
            );

            if (driverDeliverySigned && !receiverSigned) {
              newWaitingJobs.add(delivery.jobId);
              console.log(
                `[DriverDashboard] Restored waitingForCustomer for ${delivery.jobId}`,
              );
            }
          } catch (err) {
            checkedDeliveryJobsRef.current.delete(delivery.jobId);
            console.warn(
              `[DriverDashboard] Delivery sig check failed for ${delivery.jobId}:`,
              err,
            );
          }
        }),
      );

      if (newWaitingJobs.size > 0) {
        setWaitingForCustomerJobs(
          (prev) => new Set([...prev, ...newWaitingJobs]),
        );
      }
    };

    checkDeliverySignatures();
  }, [myDeliveries, address]);

  // Apply local status overrides (e.g., AWAITING_SENDER), but only when still
  // relevant. If the underlying delivery has progressed (e.g., ACCEPTED → PICKED_UP),
  // ignore the stale override so the real status takes precedence.
  const effectiveMyDeliveries = myDeliveries.map((d) => {
    const override = statusOverrides[d.jobId];
    if (override === undefined) return d;
    // AWAITING_SENDER only applies while the delivery is still ACCEPTED
    if (
      override === DeliveryStatus.AWAITING_SENDER &&
      d.currentStatus !== DeliveryStatus.ACCEPTED
    ) {
      return d;
    }
    return { ...d, currentStatus: override };
  });

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
      const msg = err instanceof Error ? err.message : String(err);
      // Show a user-friendly message for known contract errors
      let description = 'Failed to accept delivery. Please try again.';
      if (msg.includes('0x48f5c3ed') || msg.includes('InvalidCaller')) {
        description =
          'Your wallet is not authorized. Ensure you have the Driver role and try refreshing the page.';
      } else if (
        msg.includes('0xd5391167') ||
        msg.includes('DriverMaxAssignment')
      ) {
        description =
          'Maximum delivery assignments reached. Complete existing deliveries first.';
      }
      toast({
        title: 'Error',
        description,
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
      // completeDelivery now handles both packageSign + auto-attempt handOff
      const result = await completeDelivery(jobId);

      if (result === 'settled') {
        // Clear waiting state for this job
        setWaitingForCustomerJobs((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        toast({
          title: 'Delivery Complete',
          description: 'Both parties have signed. Order has been settled.',
        });
      } else if (result === 'receiver_not_signed') {
        // Track this job as waiting for customer
        setWaitingForCustomerJobs((prev) => new Set(prev).add(jobId));
        toast({
          title: 'Delivery Signed',
          description:
            'Your signature has been recorded. Waiting for customer to sign.',
        });
      } else {
        toast({
          title: 'Delivery Signed',
          description: 'Your delivery signature has been recorded.',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to sign for delivery. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <TargetRings size={80} />
            <RefreshCw className="w-8 h-8 text-gold animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50">
            Loading deliveries...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <EvaPanel label="System Error" accent="crimson" status="warning">
            <h2 className="font-mono text-lg font-bold tracking-[0.15em] uppercase text-crimson mb-2">
              Error Loading Deliveries
            </h2>
            <p className="font-mono text-xs text-foreground/40 mb-4">{error}</p>
            <TrapButton variant="crimson" onClick={() => refreshDeliveries()}>
              TRY AGAIN
            </TrapButton>
          </EvaPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LaurelAccent side="left" />
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
                Driver Dashboard
              </h1>
              <p className="font-mono text-xs tracking-[0.1em] uppercase text-foreground/40 mt-1">
                Welcome back — here is an overview of your deliveries
              </p>
            </div>
          </div>
          <TrapButton variant="gold" onClick={() => refreshDeliveries()}>
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              REFRESH
            </span>
          </TrapButton>
        </div>

        <GreekKeyStrip color="gold" />

        {/* Stats Overview */}
        <EvaSectionMarker
          section="OVERVIEW"
          label="DELIVERY METRICS"
          variant="gold"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Available"
            value={availableCount}
            color="gold"
            powerLevel={Math.min(10, availableCount)}
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
            color="gold"
            powerLevel={Math.min(10, toPickupCount * 3)}
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
            color="crimson"
            powerLevel={Math.min(10, toCompleteCount * 3)}
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
            color="emerald"
            powerLevel={Math.min(10, Math.ceil(completedDeliveries / 2))}
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
            color="gold"
            powerLevel={Math.min(10, Math.ceil(totalEarnings / 50))}
          />
        </div>

        {/* Delivery Subsystem Metrics */}
        <ChevronDataStream text="Delivery Subsystem Diagnostics" />

        <CascadeLoadBars
          labels={[
            'GPS LOCK',
            'ROUTE CALC',
            'ETA ENGINE',
            'DISPATCH',
            'TRACKING',
            'SETTLEMENT',
            'COMMS',
            'VERIFY',
          ]}
        />

        <EvaScanLine variant="mixed" />

        {/* Deliveries Section */}
        <EvaSectionMarker
          section="DELIVERIES"
          label="JOB MANAGEMENT"
          variant="crimson"
        />

        <ChevronDataStream text="Processing Delivery Data" speed="6s" />

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
          <TabsList className="grid w-full grid-cols-2 bg-card/60 border border-border/30">
            <TabsTrigger
              value="available"
              className="font-mono text-xs tracking-[0.15em] uppercase data-[state=active]:bg-gold/15 data-[state=active]:text-gold"
            >
              Available Deliveries
            </TabsTrigger>
            <TabsTrigger
              value="my-deliveries"
              className="font-mono text-xs tracking-[0.15em] uppercase data-[state=active]:bg-crimson/15 data-[state=active]:text-crimson"
            >
              My Deliveries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6">
            <EvaPanel
              label="Available Deliveries"
              sublabel="Browse and accept delivery requests"
              sysId="AVL-01"
              accent="gold"
              status="active"
            >
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40 font-bold">
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
                    className="bg-background/60 border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40 font-bold">
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
                    className="bg-background/60 border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40 font-bold">
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
                    className="bg-background/60 border-border/40 font-mono"
                  />
                </div>
              </div>

              <EvaScanLine variant="gold" />

              {/* Delivery List */}
              <div className="space-y-4 mt-4">
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
                    <div className="flex justify-center mb-4">
                      <TargetRings size={48} />
                    </div>
                    <Truck className="w-12 h-12 text-foreground/15 mx-auto mb-4" />
                    <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/30">
                      No available deliveries
                    </p>
                  </div>
                )}
              </div>
            </EvaPanel>
          </TabsContent>

          <TabsContent value="my-deliveries" className="mt-6">
            <EvaPanel
              label="My Deliveries"
              sublabel="Manage your accepted deliveries"
              sysId="MYD-02"
              accent="crimson"
              status="active"
            >
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40 font-bold">
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
                    className="bg-background/60 border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/40 font-bold">
                    Status
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-background/60 border-border/40 font-mono text-xs tracking-wider uppercase">
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

              <EvaScanLine variant="crimson" />

              {/* Delivery List */}
              <div className="space-y-4 mt-4">
                {paginatedDeliveries.length > 0 ? (
                  paginatedDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.jobId}
                      delivery={delivery}
                      onPickup={handlePickupDelivery}
                      onComplete={handleCompleteDelivery}
                      isLoading={isLoading}
                      isWaitingForCustomer={waitingForCustomerJobs.has(
                        delivery.jobId,
                      )}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <TargetRings size={48} />
                    </div>
                    <Truck className="w-12 h-12 text-foreground/15 mx-auto mb-4" />
                    <p className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/30">
                      No deliveries found
                    </p>
                  </div>
                )}
              </div>
            </EvaPanel>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {currentDeliveries.length > deliveriesPerPage && (
          <div className="flex justify-between items-center">
            <div className="font-mono text-xs tracking-[0.1em] uppercase text-foreground/40 tabular-nums">
              Showing {startIndex + 1} to{' '}
              {Math.min(endIndex, currentDeliveries.length)} of{' '}
              {currentDeliveries.length} deliveries
            </div>
            <div className="flex gap-2">
              <TrapButton
                variant="gold"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <span className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  PREVIOUS
                </span>
              </TrapButton>
              <TrapButton
                variant="gold"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                <span className="flex items-center gap-2">
                  NEXT
                  <ChevronRight className="w-4 h-4" />
                </span>
              </TrapButton>
            </div>
          </div>
        )}

        <GreekKeyStrip color="crimson" />
      </div>
    </div>
  );
}
