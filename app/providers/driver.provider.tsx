'use client';

import {
  assignDriverToJobId,
  checkIfDriverAssignedToJobId,
  driverPackageSign,
  fetchAllJourneys,
  fetchJourney,
  fetchOrderIdFromJourney,
  getOrder,
  packageHandOff,
  packageHandOn,
} from '@/dapp-connectors/ausys-controller';
import { getWalletAddress } from '@/dapp-connectors/base-controller';
import { AddressLike } from 'ethers';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { calculateETA } from '../utils/maps';

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
  deliveryETA: number;
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

const calculateDeliveryETA = async (delivery: Delivery): Promise<Delivery> => {
  try {
    const deliveryETA = await calculateETA(
      delivery.parcelData.startLocation,
      delivery.parcelData.endLocation,
    );
    return { ...delivery, deliveryETA: deliveryETA };
  } catch (error) {
    // If ETA calculation fails, return -1
    return { ...delivery, deliveryETA: -1 };
  }
};

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>(
    [],
  );
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveriesFromBlockchain = async (): Promise<{
    available: Delivery[];
    assigned: Delivery[];
  }> => {
    const journeys = await fetchAllJourneys();
    const assigned = (await Promise.all(
      journeys.map(async (journey) => {
        const isAssigned = await checkIfDriverAssignedToJobId(
          journey.journeyId,
        );
        if (isAssigned) {
          return {
            jobId: journey.journeyId,
            currentStatus: Number(journey.currentStatus),
            customer: journey.sender,
            fee: Number(journey.bounty) || 0,
            ETA: Number(journey.ETA) || 0,
            deliveryETA: Number(journey.ETA) || 0,
            parcelData: journey.parcelData,
          } as Delivery;
        }
        return null;
      }),
    )) as (Delivery | null)[];

    const available = await Promise.all(
      journeys.map(async (journey) => {
        const isAssigned = await checkIfDriverAssignedToJobId(
          journey.journeyId,
        );
        if (!isAssigned) {
          return {
            jobId: journey.journeyId,
            currentStatus: Number(journey.currentStatus),
            customer: journey.sender,
            fee: Number(journey.bounty) || 0,
            ETA: Number(journey.ETA) || 0,
            deliveryETA: Number(journey.ETA) || 0,
            parcelData: journey.parcelData,
          };
        }
        return null;
      }),
    );
    return {
      available: available.filter((delivery) => delivery !== null),
      assigned: assigned.filter((delivery) => delivery !== null),
    };
  };

  const refreshDeliveries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching all journeys...');
      const journeys = await fetchAllJourneys();
      console.log('Fetched journeys:', journeys);

      if (!journeys || journeys.length === 0) {
        console.log('No journeys available');
        setAvailableDeliveries([]);
        setMyDeliveries([]);
        setIsLoading(false);
        return;
      }

      // Process journeys into deliveries
      const processedDeliveries = await Promise.all(
        journeys.map(async (journey) => {
          try {
            const orderId = await fetchOrderIdFromJourney(journey.journeyId);
            const order = await getOrder(orderId);

            return {
              jobId: journey.journeyId,
              customer: order?.customer || '',
              fee: Number(journey.bounty),
              ETA: Number(journey.ETA),
              deliveryETA: Number(journey.ETA),
              currentStatus: Number(journey.currentStatus),
              parcelData: journey.parcelData,
            };
          } catch (err) {
            console.error(
              `Error processing journey ${journey.journeyId}:`,
              err,
            );
            return null;
          }
        }),
      );

      // Filter out any null values from failed processing
      const validDeliveries = processedDeliveries.filter(
        (delivery) => delivery !== null,
      ) as Delivery[];
      console.log('Processed deliveries:', validDeliveries);

      // Split into available and my deliveries
      const walletAddress = getWalletAddress();
      const available: Delivery[] = [];
      const mine: Delivery[] = [];

      for (const delivery of validDeliveries) {
        try {
          const isAssigned = await checkIfDriverAssignedToJobId(delivery.jobId);
          if (
            isAssigned &&
            delivery.currentStatus !== DeliveryStatus.COMPLETED
          ) {
            mine.push(delivery);
          } else if (
            !isAssigned &&
            delivery.currentStatus === DeliveryStatus.PENDING
          ) {
            available.push(delivery);
          }
        } catch (err) {
          console.error(
            `Error checking assignment for job ${delivery.jobId}:`,
            err,
          );
        }
      }

      setAvailableDeliveries(available);
      setMyDeliveries(mine);
    } catch (err) {
      console.error('Error refreshing deliveries:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load deliveries',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const acceptDelivery = async (jobId: string) => {
    try {
      setError(null);
      await assignDriverToJobId(jobId);
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
      await driverPackageSign(jobId);
      const journey = await fetchJourney(jobId);
      try {
        await packageHandOn(journey.sender, journey.driver, journey.journeyId);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to hand on package wait for customer to sign',
        );
        throw err;
      }
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
      await driverPackageSign(jobId);
      const journey = await fetchJourney(jobId);
      const orderId = await fetchOrderIdFromJourney(journey.journeyId);
      const order = await getOrder(orderId);
      try {
        await packageHandOff(
          journey.sender,
          journey.driver,
          journey.journeyId,
          order?.token as AddressLike,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to package hand off wait for customer to sign',
        );
        throw err;
      }

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
