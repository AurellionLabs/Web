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

export enum DeliveryStatus {
  PENDING = 0,
  ACCEPTED = 1,
  PICKED_UP = 2,
  COMPLETED = 3,
  CANCELED = 4,
}

export interface Delivery {
  jobId: string;
  customer: string;
  fee: number;
  ETA: number;
  currentStatus: DeliveryStatus;
  parcelData: ParcelData;
}

export interface DriverContextType {
  availableDeliveries: Delivery[];
  myDeliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
  refreshDeliveries: () => Promise<void>;
  acceptDelivery: (jobId: string) => Promise<void>;
  confirmPickup: (jobId: string) => Promise<void>;
  completeDelivery: (jobId: string) => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>(
    [],
  );
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for testing
  const mockAvailableDeliveries: Delivery[] = [
    {
      jobId: 'J001',
      currentStatus: DeliveryStatus.PENDING,
      customer: 'John Doe',
      fee: 50.0,
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
      currentStatus: DeliveryStatus.PENDING,
      customer: 'Jane Smith',
      fee: 75.0,
      ETA: 60,
      parcelData: {
        startLocation: { lat: '5.6789', lng: '6.7890' },
        endLocation: { lat: '7.8901', lng: '8.9012' },
        startName: '789 Pine St, City C',
        endName: '321 Elm St, City D',
      },
    },
  ];

  const mockMyDeliveries: Delivery[] = [
    {
      jobId: 'J003',
      currentStatus: DeliveryStatus.ACCEPTED,
      customer: 'Alice Chen',
      fee: 65.0,
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
      currentStatus: DeliveryStatus.PICKED_UP,
      customer: 'David Lee',
      fee: 85.0,
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
      currentStatus: DeliveryStatus.COMPLETED,
      customer: 'Frank Zhang',
      fee: 55.0,
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
      currentStatus: DeliveryStatus.COMPLETED,
      customer: 'Henry Lim',
      fee: 45.0,
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
  const fetchDeliveriesFromBlockchain = async (): Promise<{
    available: Delivery[];
    assigned: Delivery[];
  }> => {
    // This is where you'll integrate your blockchain calls
    // For now, returning mock data
    return {
      available: mockAvailableDeliveries,
      assigned: mockMyDeliveries,
    };
  };

  const refreshDeliveries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDeliveriesFromBlockchain();
      setAvailableDeliveries(data.available);
      setMyDeliveries(data.assigned);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch deliveries',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const acceptDelivery = async (jobId: string) => {
    try {
      setError(null);
      // TODO: Replace with actual blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state after successful blockchain transaction
      const deliveryToAccept = availableDeliveries.find(
        (d) => d.jobId === jobId,
      );
      if (!deliveryToAccept) throw new Error('Delivery not found');

      // Remove from available deliveries
      setAvailableDeliveries((prev) =>
        prev.filter((delivery) => delivery.jobId !== jobId),
      );

      // Add to my deliveries
      setMyDeliveries((prev) => [
        ...prev,
        {
          ...deliveryToAccept,
          currentStatus: DeliveryStatus.ACCEPTED,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to accept delivery',
      );
      throw err;
    }
  };

  const confirmPickup = async (jobId: string) => {
    try {
      setError(null);
      // TODO: Replace with actual blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state after successful blockchain transaction
      const deliveryToPickup = myDeliveries.find((d) => d.jobId === jobId);
      if (!deliveryToPickup) throw new Error('Delivery not found');

      // Update delivery status in myDeliveries
      setMyDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.jobId === jobId
            ? { ...delivery, currentStatus: DeliveryStatus.PICKED_UP }
            : delivery,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm pickup');
      throw err;
    }
  };

  const completeDelivery = async (jobId: string) => {
    try {
      setError(null);
      // TODO: Replace with actual blockchain transaction
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update delivery status in myDeliveries
      setMyDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.jobId === jobId
            ? { ...delivery, currentStatus: DeliveryStatus.COMPLETED }
            : delivery,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete delivery',
      );
      throw err;
    }
  };

  useEffect(() => {
    refreshDeliveries();
  }, []);

  return (
    <DriverContext.Provider
      value={{
        availableDeliveries,
        myDeliveries,
        isLoading,
        error,
        refreshDeliveries,
        acceptDelivery,
        confirmPickup,
        completeDelivery,
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
