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
  ACCEPTED = 1,
  PICKED_UP = 2,
  COMPLETED = 3,
  CANCELED = 4,
}

export interface Journey {
  jobId: string;
  customer: string;
  bounty: number;
  ETA: number;
  currentStatus: JourneyStatus;
  parcelData: ParcelData;
}

export interface DriverContextType {
  availableJourneys: Journey[];
  myJourneys: Journey[];
  isLoading: boolean;
  error: string | null;
  refreshJourneys: () => Promise<void>;
  acceptJourney: (jobId: string) => Promise<void>;
  confirmPickup: (jobId: string) => Promise<void>;
  completeJourney: (jobId: string) => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [availableJourneys, setAvailableJourneys] = useState<Journey[]>([]);
  const [myJourneys, setMyJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for testing
  const mockAvailableJourneys: Journey[] = [
    {
      jobId: 'J001',
      currentStatus: JourneyStatus.PENDING,
      customer: 'John Doe',
      bounty: 50.0,
      ETA: 45,
      parcelData: {
        startLocation: { lat: '1.2345', lng: '2.3456' },
        endLocation: { lat: '3.4567', lng: '4.5678' },
        startName: '123 Main St, City A',
        endName: '456 Oak St, City B',
      },
    },
    {
      jobId: 'J002',
      currentStatus: JourneyStatus.PENDING,
      customer: 'Jane Smith',
      bounty: 75.0,
      ETA: 60,
      parcelData: {
        startLocation: { lat: '5.6789', lng: '6.7890' },
        endLocation: { lat: '7.8901', lng: '8.9012' },
        startName: '789 Pine St, City C',
        endName: '321 Elm St, City D',
      },
    },
  ];

  const mockMyJourneys: Journey[] = [
    {
      jobId: 'J003',
      currentStatus: JourneyStatus.ACCEPTED,
      customer: 'Alice Chen',
      bounty: 65.0,
      ETA: 30,
      parcelData: {
        startLocation: { lat: '9.0123', lng: '10.1234' },
        endLocation: { lat: '11.2345', lng: '12.3456' },
        startName: '741 Maple St, City E',
        endName: '852 Cedar St, City F',
      },
    },
    {
      jobId: 'J004',
      currentStatus: JourneyStatus.PICKED_UP,
      customer: 'David Lee',
      bounty: 85.0,
      ETA: 45,
      parcelData: {
        startLocation: { lat: '13.4567', lng: '14.5678' },
        endLocation: { lat: '15.6789', lng: '16.7890' },
        startName: '963 Birch St, City G',
        endName: '147 Walnut St, City H',
      },
    },
    {
      jobId: 'J005',
      currentStatus: JourneyStatus.COMPLETED,
      customer: 'Frank Zhang',
      bounty: 55.0,
      ETA: 35,
      parcelData: {
        startLocation: { lat: '17.8901', lng: '18.9012' },
        endLocation: { lat: '19.0123', lng: '20.1234' },
        startName: '258 Cherry St, City I',
        endName: '369 Plum St, City J',
      },
    },
    {
      jobId: 'J006',
      currentStatus: JourneyStatus.COMPLETED,
      customer: 'Henry Lim',
      bounty: 45.0,
      ETA: 25,
      parcelData: {
        startLocation: { lat: '21.2345', lng: '22.3456' },
        endLocation: { lat: '23.4567', lng: '24.5678' },
        startName: '951 Peach St, City K',
        endName: '753 Apple St, City L',
      },
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

      // Add to my journeys
      setMyJourneys((prev) => [
        ...prev,
        {
          ...journeyToAccept,
          currentStatus: JourneyStatus.ACCEPTED,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept journey');
      throw err;
    }
  };

  const confirmPickup = async (jobId: string) => {
    try {
      setError(null);
      // TODO: Replace with actual blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state after successful blockchain transaction
      const journeyToPickup = myJourneys.find((j) => j.jobId === jobId);
      if (!journeyToPickup) throw new Error('Journey not found');

      // Update journey status in myJourneys
      setMyJourneys((prev) =>
        prev.map((journey) =>
          journey.jobId === jobId
            ? { ...journey, currentStatus: JourneyStatus.PICKED_UP }
            : journey,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm pickup');
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
        confirmPickup,
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
