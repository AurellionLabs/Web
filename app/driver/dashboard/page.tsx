'use client';

import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import {
  useDriver,
  DeliveryStatus,
  Delivery,
} from '@/app/providers/driver.provider';
import { colors } from '@/lib/constants/colors';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  Activity,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  MapPin,
  Truck,
  Navigation,
  CheckCircle,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import { DeliveryActionDialog } from '@/app/components/ui/delivery-action-dialog';
import { setupSignatureListener } from '@/dapp-connectors/dapp-listener';

type TabType = 'available' | 'my-deliveries';

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
  } = useDriver();
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [waitingForSignature, setWaitingForSignature] = useState<{
    [key: string]: boolean;
  }>({});
  const [signatureCleanups, setSignatureCleanups] = useState<{
    [key: string]: () => void;
  }>({});

  // Filter states
  const [filters, setFilters] = useState({
    jobId: '',
    pickupLocation: '',
    dropOffLocation: '',
    status: 'all',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const deliveriesPerPage = 5;

  useEffect(() => {
    setCurrentUserRole('driver');
  }, [setCurrentUserRole]);

  // Filter my deliveries based on status and search
  const filteredMyDeliveries = myDeliveries.filter((delivery: Delivery) => {
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
  });

  // Filter available deliveries based on location search
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
        !delivery.parcelData.startName
          .toLowerCase()
          .includes(filters.pickupLocation.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.dropOffLocation &&
        !delivery.parcelData.endName
          .toLowerCase()
          .includes(filters.dropOffLocation.toLowerCase())
      ) {
        return false;
      }

      return true;
    },
  );

  // Calculate statistics
  const availableCount = availableDeliveries.length;
  const toPickupCount = myDeliveries.filter(
    (delivery: Delivery) => delivery.currentStatus === DeliveryStatus.ACCEPTED,
  ).length;
  const toCompleteCount = myDeliveries.filter(
    (delivery: Delivery) => delivery.currentStatus === DeliveryStatus.PICKED_UP,
  ).length;
  const completedDeliveries = myDeliveries.filter(
    (delivery: Delivery) => delivery.currentStatus === DeliveryStatus.COMPLETED,
  ).length;

  // Calculate total earnings from completed deliveries
  const totalEarnings = myDeliveries
    .filter(
      (delivery: Delivery) =>
        delivery.currentStatus === DeliveryStatus.COMPLETED,
    )
    .reduce((total: number, delivery: Delivery) => total + delivery.fee, 0);

  // Calculate pagination
  const currentDeliveries =
    activeTab === 'available'
      ? filteredAvailableDeliveries
      : filteredMyDeliveries;
  const totalPages = Math.ceil(currentDeliveries.length / deliveriesPerPage);
  const startIndex = (currentPage - 1) * deliveriesPerPage;
  const endIndex = startIndex + deliveriesPerPage;
  const paginatedDeliveries = currentDeliveries.slice(startIndex, endIndex);

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
      setWaitingForSignature((prev) => ({ ...prev, [jobId]: true }));
      await confirmPickup(jobId);

      const cleanup = await setupSignatureListener({
        onSignature: async (user, id) => {
          if (id === jobId) {
            setWaitingForSignature((prev) => ({ ...prev, [jobId]: false }));
            await refreshDeliveries();
            toast({
              title: 'Signature Received',
              description: 'The customer has signed the pickup confirmation.',
            });
          }
        },
        onTimeout: () => {
          setWaitingForSignature((prev) => ({ ...prev, [jobId]: false }));
          toast({
            title: 'Signature Timeout',
            description:
              'The customer did not sign within the time limit. Please try again.',
            variant: 'destructive',
          });
        },
        onError: (error) => {
          console.error('Error in signature listener:', error);
          setWaitingForSignature((prev) => ({ ...prev, [jobId]: false }));
          toast({
            title: 'Error',
            description: 'Failed to confirm pickup. Please try again.',
            variant: 'destructive',
          });
        },
      });

      // Store cleanup function
      setSignatureCleanups((prev) => ({
        ...prev,
        [jobId]: cleanup,
      }));
    } catch (err) {
      setWaitingForSignature((prev) => ({ ...prev, [jobId]: false }));
      if (
        err instanceof Error &&
        err.message.includes('wait for customer to sign')
      ) {
        // Keep the waiting state active if we're waiting for customer signature
        setWaitingForSignature((prev) => ({ ...prev, [jobId]: true }));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to confirm pickup. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCompleteDelivery = async (jobId: string) => {
    try {
      setWaitingForSignature((prev) => ({ ...prev, [jobId]: true }));
      await completeDelivery(jobId);
      toast({
        title: 'Delivery Confirmed',
        description: 'You have successfully delivered the parcel.',
      });
      setWaitingForSignature((prev) => ({ ...prev, [jobId]: false }));
    } catch (err) {
      setWaitingForSignature((prev) => ({ ...prev, [jobId]: false }));
      if (
        err instanceof Error &&
        err.message.includes('wait for customer to sign')
      ) {
        // Keep the waiting state active if we're waiting for customer signature
        setWaitingForSignature((prev) => ({ ...prev, [jobId]: true }));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to confirm delivery. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  // Add cleanup effect
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
          <span>Loading deliveries...</span>
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
              Error Loading Deliveries
            </h2>
            <p className="text-gray-400 mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refreshDeliveries()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderDeliveryCard = (delivery: Delivery) => (
    <Card key={delivery.jobId} className="bg-[#1a1f2d] border-0">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Job ID:</span>
              <span className="font-medium">{delivery.jobId}</span>
              <span className="ml-4">
                {delivery.currentStatus === DeliveryStatus.PENDING && (
                  <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-full">
                    Available
                  </span>
                )}
                {delivery.currentStatus === DeliveryStatus.ACCEPTED && (
                  <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded-full">
                    Accepted
                  </span>
                )}
                {delivery.currentStatus === DeliveryStatus.PICKED_UP && (
                  <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded-full">
                    Picked Up
                  </span>
                )}
                {delivery.currentStatus === DeliveryStatus.COMPLETED && (
                  <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-full">
                    Completed
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm font-medium">Pickup Location</div>
                    <div className="text-sm text-gray-400">
                      {delivery.parcelData.startName}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm font-medium">Delivery Location</div>
                    <div className="text-sm text-gray-400">
                      {delivery.parcelData.endName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">ETA: {delivery.ETA} mins</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Customer: {delivery.customer}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between items-end">
            <div className="text-2xl font-bold text-amber-500">
              ${delivery.fee.toFixed(2)}
            </div>
            <>
              {delivery.currentStatus === DeliveryStatus.PENDING && (
                <DeliveryActionDialog
                  delivery={delivery}
                  onConfirm={handleAcceptDelivery}
                  variant="accept"
                  isLoading={isLoading}
                />
              )}
              {delivery.currentStatus === DeliveryStatus.ACCEPTED && (
                <DeliveryActionDialog
                  delivery={delivery}
                  onConfirm={handlePickupDelivery}
                  variant="pickup"
                  isLoading={isLoading}
                  isWaitingForSignature={waitingForSignature[delivery.jobId]}
                  waitingForRole="customer"
                />
              )}
              {delivery.currentStatus === DeliveryStatus.PICKED_UP && (
                <DeliveryActionDialog
                  delivery={delivery}
                  onConfirm={handleCompleteDelivery}
                  variant="complete"
                  isLoading={isLoading}
                  isWaitingForSignature={waitingForSignature[delivery.jobId]}
                  waitingForRole="customer"
                />
              )}
            </>
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
            <h1 className="text-3xl font-bold">Driver Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back! Here's an overview of your deliveries and available
              jobs.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshDeliveries()}
            className="h-10 w-10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card
            className={`bg-[${colors.background.secondary}] cursor-pointer transition-colors hover:bg-[#1f2437]`}
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
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Available Deliveries
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{availableCount}</h3>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-[${colors.background.secondary}] cursor-pointer transition-colors hover:bg-[#1f2437]`}
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
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    To Pick Up
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{toPickupCount}</h3>
                </div>
                <MapPin className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-[${colors.background.secondary}] cursor-pointer transition-colors hover:bg-[#1f2437]`}
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
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    To Complete
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{toCompleteCount}</h3>
                </div>
                <Navigation className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-[${colors.background.secondary}] cursor-pointer transition-colors hover:bg-[#1f2437]`}
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
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Completed Deliveries
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {completedDeliveries}
                  </h3>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Earnings
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    ${totalEarnings.toFixed(2)}
                  </h3>
                </div>
                <Truck className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Interface */}
        <Tabs
          value={activeTab}
          defaultValue="available"
          className="w-full"
          onValueChange={(value) => setActiveTab(value as TabType)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Available Deliveries</TabsTrigger>
            <TabsTrigger value="my-deliveries">My Deliveries</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <Card className={`bg-[${colors.background.secondary}]`}>
              <CardHeader>
                <CardDescription>
                  Browse and accept delivery requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Location-based filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job ID</label>
                    <Input
                      placeholder="Search by job ID"
                      value={filters.jobId}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          jobId: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
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
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
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
                    />
                  </div>
                </div>

                {/* Delivery List */}
                <div className="space-y-4">
                  {paginatedDeliveries.map(renderDeliveryCard)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-deliveries">
            <Card className={`bg-[${colors.background.secondary}]`}>
              <CardHeader>
                <CardDescription>
                  Manage your accepted deliveries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Status-based filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job ID</label>
                    <Input
                      placeholder="Search by job ID"
                      value={filters.jobId}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          jobId: e.target.value,
                        }))
                      }
                    />
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
                        <SelectItem value={DeliveryStatus.ACCEPTED.toString()}>
                          Accepted
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
                  {paginatedDeliveries.map(renderDeliveryCard)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {currentDeliveries.length > deliveriesPerPage && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1} to{' '}
              {Math.min(endIndex, currentDeliveries.length)} of{' '}
              {currentDeliveries.length} deliveries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
