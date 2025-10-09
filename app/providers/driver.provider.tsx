'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Delivery } from '@/domain/driver/driver';
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
  packageSign: (jobId: string) => Promise<void>;
  startJourney: (jobId: string) => Promise<void>;
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

      // Check and grant DRIVER_ROLE if needed
      try {
        console.log('[Accept] Checking driver role for', driverWalletAddress);
        const DRIVER_ROLE = await (ausys as any).DRIVER_ROLE();
        const hasDriverRole = await (ausys as any).hasRole(
          DRIVER_ROLE,
          driverWalletAddress,
        );

        if (!hasDriverRole) {
          console.log(
            '[Accept] Driver role not found, attempting to grant via setDriver...',
          );
          // Try to self-grant driver role (requires ADMIN_ROLE or contract owner)
          try {
            const tx = await (ausys as any).setDriver(
              driverWalletAddress,
              true,
            );
            await tx.wait();
            console.log('[Accept] Driver role granted successfully');
          } catch (roleErr) {
            console.warn('[Accept] Could not auto-grant driver role:', roleErr);
            setError(
              'You need DRIVER_ROLE to accept deliveries. Please contact an admin.',
            );
            throw new Error(
              'Missing DRIVER_ROLE. Contact admin to grant driver permissions.',
            );
          }
        } else {
          console.log('[Accept] Driver role already granted');
        }
      } catch (e) {
        console.error('[Accept] Role check/grant failed:', e);
        // Continue anyway in case role check failed but user actually has role
      }

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

      // Debug: Check journey details
      console.log('[confirmPickup] Driver address:', driverWalletAddress);
      console.log('[confirmPickup] Journey ID:', jobId);
      try {
        const journey = await (ausys as any).idToJourney(jobId);
        console.log('[confirmPickup] Journey details:', {
          sender: journey.sender,
          receiver: journey.receiver,
          driver: journey.driver,
          status: journey.currentStatus.toString(),
        });
      } catch (e) {
        console.warn('[confirmPickup] Could not fetch journey details:', e);
      }

      const tx = await ausys.packageSign(jobId as any);
      console.log('[confirmPickup] packageSign tx sent:', tx.hash);
      const receipt = await tx.wait();
      console.log(
        '[confirmPickup] packageSign tx mined:',
        receipt?.transactionHash,
      );
      await refreshDeliveries();
    } catch (err) {
      console.error('[confirmPickup] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm pickup');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const startJourney = async (jobId: string) => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ausys = repoContext.getAusysContract();
      const tx = await ausys.handOn(jobId as any);
      await tx.wait();
      await refreshDeliveries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start journey (handOn)',
      );
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
      const tx = await ausys.handOff(jobId as any);
      await tx.wait();
      await refreshDeliveries();
    } catch (err) {
      console.error('[DriverProvider] handOff error:', err);
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
      const tx = await ausys.packageSign(jobId as any);
      await tx.wait();
      await refreshDeliveries();
    } catch (err) {
      console.error('[DriverProvider] packageSign error:', err);
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
        startJourney,
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
