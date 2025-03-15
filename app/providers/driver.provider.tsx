'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Location = {
  lat: string;
  lng: string;
};

export type ParcelData = {
  startLocation: Location;
  endLocation: Location;
  startName: string;
  endName: string;
};

export enum JourneyStatus {
  PENDING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELED = 3,
}

export type Journey = {
  parcelData: ParcelData;
  jobId: string;
  currentStatus: JourneyStatus;
  customer: string;
  reciever: string;
  driver: string;
  journeyStart: number;
  journeyEnd: number;
  bounty: number;
  ETA: number;
};

interface DriverContextType {
  availableJourneys: Journey[];
  myJourneys: Journey[];
  isLoading: boolean;
  error: string | null;
  refreshJourneys: () => Promise<void>;
  acceptJourney: (jobId: string) => Promise<void>;
  completeJourney: (jobId: string) => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [availableJourneys, setAvailableJourneys] = useState<Journey[]>([]);
  const [myJourneys, setMyJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for available journeys (always PENDING)
  const mockAvailableJourneys: Journey[] = [
    {
      jobId: 'J001',
      parcelData: {
        startLocation: { lat: '1.3521', lng: '103.8198' },
        endLocation: { lat: '1.3644', lng: '103.9915' },
        startName: 'Downtown Singapore',
        endName: 'Changi Airport',
      },
      currentStatus: JourneyStatus.PENDING,
      customer: 'John Doe',
      reciever: 'Jane Smith',
      driver: '',
      journeyStart: Date.now(),
      journeyEnd: Date.now() + 3600000,
      bounty: 50.0,
      ETA: 45,
    },
    {
      jobId: 'J002',
      parcelData: {
        startLocation: { lat: '1.3644', lng: '103.9915' },
        endLocation: { lat: '1.3521', lng: '103.8198' },
        startName: 'Changi Airport',
        endName: 'Downtown Singapore',
      },
      currentStatus: JourneyStatus.PENDING,
      customer: 'Jane Smith',
      reciever: 'John Doe',
      driver: '',
      journeyStart: Date.now() + 7200000,
      journeyEnd: Date.now() + 10800000,
      bounty: 75.0,
      ETA: 60,
    },
  ];

  // Mock data for driver's assigned journeys
  const mockMyJourneys: Journey[] = [
    {
      jobId: 'J003',
      parcelData: {
        startLocation: { lat: '1.3521', lng: '103.8198' },
        endLocation: { lat: '1.2855', lng: '103.8565' },
        startName: 'Downtown Singapore',
        endName: 'Sentosa Island',
      },
      currentStatus: JourneyStatus.IN_PROGRESS,
      customer: 'Alice Chen',
      reciever: 'Bob Wilson',
      driver: 'CURRENT_DRIVER_ADDRESS',
      journeyStart: Date.now() - 1800000,
      journeyEnd: Date.now() + 1800000,
      bounty: 65.0,
      ETA: 30,
    },
    {
      jobId: 'J004',
      parcelData: {
        startLocation: { lat: '1.2855', lng: '103.8565' },
        endLocation: { lat: '1.3347', lng: '103.9619' },
        startName: 'Sentosa Island',
        endName: 'East Coast Park',
      },
      currentStatus: JourneyStatus.IN_PROGRESS,
      customer: 'David Lee',
      reciever: 'Emma Wang',
      driver: 'CURRENT_DRIVER_ADDRESS',
      journeyStart: Date.now() - 900000,
      journeyEnd: Date.now() + 2700000,
      bounty: 85.0,
      ETA: 45,
    },
    {
      jobId: 'J005',
      parcelData: {
        startLocation: { lat: '1.3347', lng: '103.9619' },
        endLocation: { lat: '1.3139', lng: '103.8759' },
        startName: 'East Coast Park',
        endName: 'Marina Bay Sands',
      },
      currentStatus: JourneyStatus.COMPLETED,
      customer: 'Frank Zhang',
      reciever: 'Grace Tan',
      driver: 'CURRENT_DRIVER_ADDRESS',
      journeyStart: Date.now() - 86400000,
      journeyEnd: Date.now() - 82800000,
      bounty: 55.0,
      ETA: 35,
    },
    {
      jobId: 'J006',
      parcelData: {
        startLocation: { lat: '1.3139', lng: '103.8759' },
        endLocation: { lat: '1.2982', lng: '103.8557' },
        startName: 'Marina Bay Sands',
        endName: 'Clarke Quay',
      },
      currentStatus: JourneyStatus.COMPLETED,
      customer: 'Henry Lim',
      reciever: 'Ivy Wong',
      driver: 'CURRENT_DRIVER_ADDRESS',
      journeyStart: Date.now() - 172800000,
      journeyEnd: Date.now() - 169200000,
      bounty: 45.0,
      ETA: 25,
    },
  ];

  // TODO: Replace this with actual blockchain integration
  const fetchJourneysFromBlockchain = async (): Promise<{
    available: Journey[];
    assigned: Journey[];
  }> => {
    // This is where you'll integrate your blockchain calls
    // For now, returning mock data
    return {
      available: mockAvailableJourneys,
      assigned: mockMyJourneys,
    };
  };

  const refreshJourneys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchJourneysFromBlockchain();
      setAvailableJourneys(data.available);
      setMyJourneys(data.assigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch journeys');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptJourney = async (jobId: string) => {
    try {
      setError(null);
      // TODO: Replace with actual blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state after successful blockchain transaction
      const journeyToAccept = availableJourneys.find((j) => j.jobId === jobId);
      if (!journeyToAccept) throw new Error('Journey not found');

      // Remove from available journeys
      setAvailableJourneys((prev) =>
        prev.filter((journey) => journey.jobId !== jobId),
      );

      // Add to my journeys with updated status
      setMyJourneys((prev) => [
        ...prev,
        {
          ...journeyToAccept,
          currentStatus: JourneyStatus.IN_PROGRESS,
          driver: 'CURRENT_DRIVER_ADDRESS', // TODO: Replace with actual driver's address
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept journey');
      throw err;
    }
  };

  const completeJourney = async (jobId: string) => {
    try {
      setError(null);
      // TODO: Replace with actual blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update journey status in myJourneys
      setMyJourneys((prev) =>
        prev.map((journey) =>
          journey.jobId === jobId
            ? { ...journey, currentStatus: JourneyStatus.COMPLETED }
            : journey,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete journey',
      );
      throw err;
    }
  };

  useEffect(() => {
    refreshJourneys();
  }, []);

  return (
    <DriverContext.Provider
      value={{
        availableJourneys,
        myJourneys,
        isLoading,
        error,
        refreshJourneys,
        acceptJourney,
        completeJourney,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
}
