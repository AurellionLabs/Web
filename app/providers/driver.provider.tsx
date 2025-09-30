'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Journey } from '@/domain/shared';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { calculateETA } from '../utils/maps';

type DriverDelivery = Journey & { deliveryETA: number };

export interface DriverContextType {
  availableDeliveries: DriverDelivery[];
  myDeliveries: DriverDelivery[];
  isLoading: boolean;
  error: string | null;
  refreshDeliveries: () => Promise<void>;
  acceptDelivery: (jobId: string) => Promise<void>;
  confirmPickup: (jobId: string) => Promise<void>;
  completeDelivery: (jobId: string) => Promise<void>;
  packageSign: (jobId: string) => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

const calculateDeliveryETA = async (
  delivery: Journey,
): Promise<DriverDelivery> => {
  try {
    const deliveryETA = await calculateETA(
      delivery.parcelData.startLocation,
      delivery.parcelData.endLocation,
    );
    return { ...(delivery as Journey), deliveryETA };
  } catch (error) {
    return { ...(delivery as Journey), deliveryETA: -1 } as DriverDelivery;
  }
};

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [availableDeliveries, setAvailableDeliveries] = useState<
    DriverDelivery[]
  >(
    [],
  );
  const [myDeliveries, setMyDeliveries] = useState<DriverDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address: driverWalletAddress } = useWallet();
  const repoContext = RepositoryContext.getInstance();
  const repository = repoContext.getDriverRepository();

  const refreshDeliveries = async () => {
    console.log('[DriverProvider] Entering refreshDeliveries function...');

    if (!driverWalletAddress) {
      console.log(
        '[DriverProvider] refreshDeliveries aborted: driverWalletAddress is missing.',
      );
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

      console.log(
        '[DriverProvider] Raw data from repository.getAvailableDeliveries():',
        available,
      );
      console.log(
        '[DriverProvider] Raw data from repository.getMyDeliveries():',
        mine,
      );

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
      const ausys = repoContext.getAusysContract();
      // Assign driver to journey
      await ausys.assignDriverToJourneyId(driverWalletAddress!, jobId as any);
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
      const ausys = repoContext.getAusysContract();
      await ausys.packageSign(jobId as any);
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
      const ausys = repoContext.getAusysContract();
      await ausys.handOff(jobId as any);
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

  const packageSign = async (jobId: string) => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ausys = repoContext.getAusysContract();
      await ausys.packageSign(jobId as any);
      await refreshDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign package');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      '[DriverProvider] useEffect triggered. driverWalletAddress:',
      driverWalletAddress,
    );
    if (driverWalletAddress) {
      console.log(
        '[DriverProvider] Wallet address found, calling refreshDeliveries...',
      );
      refreshDeliveries();
    } else {
      console.log(
        '[DriverProvider] Wallet address NOT found, refreshDeliveries not called.',
      );
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
        packageSign,
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
