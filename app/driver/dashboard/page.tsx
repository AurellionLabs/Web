'use client';

import { useEffect, useState } from 'react';
import { useMainProvider } from '@/app/providers/main.provider';
import {
  useDriver,
  JourneyStatus,
  Journey,
} from '@/app/providers/driver.provider';
import { colors } from '@/lib/constants/colors';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JourneyActionDialog } from '@/components/ui/journey-action-dialog';

type TabType = 'available' | 'my-journeys';

export default function DriverDashboard() {
  const { setCurrentUserRole } = useMainProvider();
  const {
    availableJourneys,
    myJourneys,
    isLoading,
    error,
    refreshJourneys,
    acceptJourney,
    completeJourney,
    confirmPickup,
  } = useDriver();
  const [activeTab, setActiveTab] = useState<TabType>('available');

  // Filter states
  const [filters, setFilters] = useState({
    jobId: '',
    pickupLocation: '',
    dropOffLocation: '',
    status: 'all',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const journeysPerPage = 5;

  useEffect(() => {
    setCurrentUserRole('driver');
  }, [setCurrentUserRole]);

  // Filter my journeys based on status and search
  const filteredMyJourneys = myJourneys.filter((journey: Journey) => {
    if (
      filters.jobId &&
      !journey.jobId.toLowerCase().includes(filters.jobId.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.status !== 'all' &&
      journey.currentStatus !== parseInt(filters.status as string)
    ) {
      return false;
    }

    return true;
  });

  // Filter available journeys based on location search
  const filteredAvailableJourneys = availableJourneys.filter(
    (journey: Journey) => {
      if (
        filters.jobId &&
        !journey.jobId.toLowerCase().includes(filters.jobId.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.pickupLocation &&
        !journey.parcelData.startName
          .toLowerCase()
          .includes(filters.pickupLocation.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.dropOffLocation &&
        !journey.parcelData.endName
          .toLowerCase()
          .includes(filters.dropOffLocation.toLowerCase())
      ) {
        return false;
      }

      return true;
    },
  );

  // Calculate statistics
  const availableCount = availableJourneys.length;
  const toPickupCount = myJourneys.filter(
    (journey: Journey) => journey.currentStatus === JourneyStatus.ACCEPTED,
  ).length;
  const toCompleteCount = myJourneys.filter(
    (journey: Journey) => journey.currentStatus === JourneyStatus.PICKED_UP,
  ).length;
  const completedJourneys = myJourneys.filter(
    (journey: Journey) => journey.currentStatus === JourneyStatus.COMPLETED,
  ).length;

  // Calculate total earnings from completed journeys
  const totalEarnings = myJourneys
    .filter(
      (journey: Journey) => journey.currentStatus === JourneyStatus.COMPLETED,
    )
    .reduce((total: number, journey: Journey) => total + journey.bounty, 0);

  // Calculate pagination
  const currentJourneys =
    activeTab === 'available' ? filteredAvailableJourneys : filteredMyJourneys;
  const totalPages = Math.ceil(currentJourneys.length / journeysPerPage);
  const startIndex = (currentPage - 1) * journeysPerPage;
  const endIndex = startIndex + journeysPerPage;
  const paginatedJourneys = currentJourneys.slice(startIndex, endIndex);

  const handleAcceptJourney = async (jobId: string) => {
    try {
      await acceptJourney(jobId);
      toast({
        title: 'Journey Accepted',
        description: 'You have successfully accepted this journey.',
      });
      setActiveTab('my-journeys');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to accept journey. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePickupJourney = async (jobId: string) => {
    try {
      await confirmPickup(jobId);
      toast({
        title: 'Pickup Confirmed',
        description: 'You have confirmed picking up the parcel.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to confirm pickup. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteJourney = async (jobId: string) => {
    try {
      await completeJourney(jobId);
      toast({
        title: 'Delivery Confirmed',
        description: 'You have successfully delivered the parcel.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to confirm delivery. Please try again.',
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
          <span>Loading journeys...</span>
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
              Error Loading Journeys
            </h2>
            <p className="text-gray-400 mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refreshJourneys()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderJourneyCard = (journey: Journey) => (
    <Card key={journey.jobId} className="bg-[#1a1f2d] border-0">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Job ID:</span>
              <span className="font-medium">{journey.jobId}</span>
              <span className="ml-4">
                {journey.currentStatus === JourneyStatus.PENDING && (
                  <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-full">
                    Available
                  </span>
                )}
                {journey.currentStatus === JourneyStatus.ACCEPTED && (
                  <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded-full">
                    Accepted
                  </span>
                )}
                {journey.currentStatus === JourneyStatus.PICKED_UP && (
                  <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded-full">
                    Picked Up
                  </span>
                )}
                {journey.currentStatus === JourneyStatus.COMPLETED && (
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
                      {journey.parcelData.startName}
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
                      {journey.parcelData.endName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">ETA: {journey.ETA} mins</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Customer: {journey.customer}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between items-end">
            <div className="text-2xl font-bold text-amber-500">
              ${journey.bounty.toFixed(2)}
            </div>
            <>
              {journey.currentStatus === JourneyStatus.PENDING && (
                <JourneyActionDialog
                  journey={journey}
                  onConfirm={handleAcceptJourney}
                  variant="accept"
                />
              )}
              {journey.currentStatus === JourneyStatus.ACCEPTED && (
                <JourneyActionDialog
                  journey={journey}
                  onConfirm={handlePickupJourney}
                  variant="pickup"
                />
              )}
              {journey.currentStatus === JourneyStatus.PICKED_UP && (
                <JourneyActionDialog
                  journey={journey}
                  onConfirm={handleCompleteJourney}
                  variant="complete"
                />
              )}
              {journey.currentStatus === JourneyStatus.COMPLETED && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Completed</span>
                </div>
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
              journeys.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshJourneys()}
            className="h-10 w-10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Available Journeys
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{availableCount}</h3>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-[${colors.background.secondary}]`}>
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

          <Card className={`bg-[${colors.background.secondary}]`}>
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

          <Card className={`bg-[${colors.background.secondary}]`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Completed Deliveries
                  </p>
                  <h3 className="text-2xl font-bold mt-2">
                    {completedJourneys}
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
            <TabsTrigger value="available">Available Journeys</TabsTrigger>
            <TabsTrigger value="my-journeys">My Journeys</TabsTrigger>
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

                {/* Journey List */}
                <div className="space-y-4">
                  {paginatedJourneys.map(renderJourneyCard)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-journeys">
            <Card className={`bg-[${colors.background.secondary}]`}>
              <CardHeader>
                <CardDescription>Manage your accepted journeys</CardDescription>
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
                        <SelectItem value={JourneyStatus.ACCEPTED.toString()}>
                          Accepted
                        </SelectItem>
                        <SelectItem value={JourneyStatus.PICKED_UP.toString()}>
                          Picked Up
                        </SelectItem>
                        <SelectItem value={JourneyStatus.COMPLETED.toString()}>
                          Completed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Journey List */}
                <div className="space-y-4">
                  {paginatedJourneys.map(renderJourneyCard)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {currentJourneys.length > journeysPerPage && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1} to{' '}
              {Math.min(endIndex, currentJourneys.length)} of{' '}
              {currentJourneys.length} journeys
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
