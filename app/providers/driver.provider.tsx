'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Delivery, DeliveryStatus } from '@/domain/driver/driver';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { calculateETA } from '../utils/maps';

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
    return { ...delivery, deliveryETA };
  } catch (error) {
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
  const { address: driverWalletAddress } = useWallet();
  const repository = RepositoryContext.getInstance().getDriverRepository();

  const refreshDeliveries = async () => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [available, mine] = await Promise.all([
        repository.getAvailableDeliveries(),
        repository.getMyDeliveries(driverWalletAddress),
      ]);

      // Calculate ETAs for all deliveries
      const availableWithETA = await Promise.all(
        available.map(calculateDeliveryETA),
      );
      const mineWithETA = await Promise.all(mine.map(calculateDeliveryETA));

      setAvailableDeliveries(availableWithETA);
      setMyDeliveries(mineWithETA);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load deliveries',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const acceptDelivery = async (jobId: string) => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await repository.acceptDelivery(jobId);
      await refreshDeliveries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to accept delivery',
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPickup = async (jobId: string) => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await repository.confirmPickup(jobId);
      await refreshDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm pickup');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completeDelivery = async (jobId: string) => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await repository.completeDelivery(jobId);
      await refreshDeliveries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete delivery',
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (driverWalletAddress) {
      refreshDeliveries();
    }
  }, [driverWalletAddress]);

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
