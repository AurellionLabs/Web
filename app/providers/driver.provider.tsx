'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Delivery, DeliveryStatus } from '@/domain/driver/driver';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { Ausys__factory } from '@/lib/contracts';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '@/chain-constants';

export interface DriverContextType {
  availableDeliveries: Delivery[];
  myDeliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
  refreshDeliveries: () => Promise<void>;
  acceptDelivery: (jobId: string) => Promise<void>;
  confirmPickup: (jobId: string) => Promise<void>;
  completeDelivery: (
    jobId: string,
  ) => Promise<'settled' | 'receiver_not_signed' | 'signed'>;
  packageSign: (jobId: string) => Promise<void>;
  startJourney: (jobId: string) => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

const calculateDeliveryETA = async (delivery: Delivery): Promise<Delivery> => {
  // TODO: Re-enable Google Routes API ETA calculation when needed
  // For now, return a generic placeholder ETA (15 min)
  return { ...delivery, deliveryETA: 15 };
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

      // Ensure no job appears in both lists: remove from available if in myDeliveries
      const myJobIds = new Set(mineWithETA.map((d) => d.jobId.toLowerCase()));
      const dedupedAvailable = availableWithETA.filter(
        (d) => !myJobIds.has(d.jobId.toLowerCase()),
      );

      setAvailableDeliveries(dedupedAvailable);
      setMyDeliveries(mineWithETA);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load deliveries',
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ensure the contract's signer matches the wallet address.
   * If there's a mismatch (e.g. after account switch), reconnect the contract
   * with a fresh signer derived from the current wallet.
   */
  const getSignerAlignedContract = async () => {
    const ausys = repoContext.getAusysContract();
    const storedSigner = repoContext.getSigner();
    const signerAddr = await storedSigner.getAddress();

    if (signerAddr.toLowerCase() !== driverWalletAddress!.toLowerCase()) {
      console.warn(
        `[DriverProvider] Signer mismatch: signer=${signerAddr}, wallet=${driverWalletAddress}. Reconnecting contract...`,
      );
      // Re-derive signer from the stored signer's provider
      const provider = storedSigner.provider;
      if (provider && provider instanceof ethers.BrowserProvider) {
        const freshSigner = await provider.getSigner();
        return Ausys__factory.connect(NEXT_PUBLIC_DIAMOND_ADDRESS, freshSigner);
      }
      // Fallback: return existing contract (may still fail)
      console.warn(
        '[DriverProvider] Could not reconnect; using existing signer',
      );
    }
    return ausys;
  };

  const acceptDelivery = async (jobId: string) => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ausys = await getSignerAlignedContract();

      // Check and grant DRIVER_ROLE if needed (best-effort; contract enforces it)
      try {
        console.log('[Accept] Checking driver role for', driverWalletAddress);
        const DRIVER_ROLE = await (ausys as any).DRIVER_ROLE();
        const hasDriverRole = await (ausys as any).hasAuSysRole(
          DRIVER_ROLE,
          driverWalletAddress,
        );

        if (!hasDriverRole) {
          console.log(
            '[Accept] Driver role not found, attempting to grant via setDriver...',
          );
          try {
            const tx = await (ausys as any).setDriver(
              driverWalletAddress,
              true,
            );
            await tx.wait();
            console.log('[Accept] Driver role granted successfully');
          } catch (roleErr) {
            console.warn('[Accept] Could not auto-grant driver role:', roleErr);
            // Don't throw here — let assignDriverToJourney attempt and fail
            // with a clear InvalidCaller error if the role is truly missing.
          }
        } else {
          console.log('[Accept] Driver role already granted');
        }
      } catch (roleCheckErr) {
        console.error('[Accept] Role check failed (non-fatal):', roleCheckErr);
        // Continue anyway — the contract will enforce the role check
      }

      // Assign driver to journey
      console.log(
        '[Accept] Calling assignDriverToJourney',
        driverWalletAddress,
        jobId,
      );
      await ausys.assignDriverToJourney(driverWalletAddress!, jobId as any);

      // Optimistically move the job from available → myDeliveries
      const acceptedJob = availableDeliveries.find(
        (d) => d.jobId.toLowerCase() === jobId.toLowerCase(),
      );
      if (acceptedJob) {
        setAvailableDeliveries((prev) =>
          prev.filter((d) => d.jobId.toLowerCase() !== jobId.toLowerCase()),
        );
        setMyDeliveries((prev) => [
          { ...acceptedJob, currentStatus: DeliveryStatus.ACCEPTED },
          ...prev,
        ]);
      }

      // Wait for indexer to catch up, then refresh with real data
      console.log('[Accept] Tx confirmed. Waiting for indexer to catch up...');
      await new Promise((r) => setTimeout(r, 3000));
      await refreshDeliveries();

      // Schedule a follow-up refresh in case the first was too early
      setTimeout(() => {
        console.log('[Accept] Follow-up refresh for indexer consistency.');
        refreshDeliveries();
      }, 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // Decode InvalidCaller (0x48f5c3ed) — caller not authorized or missing role
      if (msg.includes('0x48f5c3ed') || msg.includes('InvalidCaller')) {
        setError(
          'Your wallet is not authorized to accept this delivery. ' +
            'Please ensure you are using the correct wallet and have the DRIVER_ROLE. ' +
            'Try refreshing the page.',
        );
      } else {
        setError(msg || 'Failed to accept delivery');
      }
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
      const ausys = await getSignerAlignedContract();

      // Debug: Check journey details
      console.log('[confirmPickup] Driver address:', driverWalletAddress);
      console.log('[confirmPickup] Journey ID:', jobId);
      try {
        const journey = await (ausys as any).getJourney(jobId);
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
      console.log('[confirmPickup] packageSign tx mined:', receipt?.hash);
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
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);

    try {
      const ausys = await getSignerAlignedContract();
      const tx = await ausys.handOn(jobId as any);
      await tx.wait();
      await refreshDeliveries();
    } catch (err) {
      // Don't setError here — let the caller (handlePickupDelivery) decide
      // whether this is an expected condition (e.g. SenderNotSigned) or a real error.
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete delivery: sign for delivery (packageSign) then auto-attempt handOff.
   * If handOff fails because receiver hasn't signed yet, that's expected — not an error.
   * Returns 'settled' if handOff succeeds, 'receiver_not_signed' if receiver hasn't signed.
   */
  const completeDelivery = async (
    jobId: string,
  ): Promise<'settled' | 'receiver_not_signed' | 'signed'> => {
    if (!driverWalletAddress) {
      setError('Wallet not connected');
      return 'signed';
    }

    setIsLoading(true);
    setError(null);

    try {
      const ausys = await getSignerAlignedContract();

      // 1. Sign for delivery (driver confirms delivery)
      const signTx = await ausys.packageSign(jobId as any);
      await signTx.wait();

      // 2. Auto-attempt handOff — succeeds if receiver has also signed
      try {
        const handOffTx = await ausys.handOff(jobId as any);
        await handOffTx.wait();

        // Optimistically update this delivery to completed
        setMyDeliveries((prev) =>
          prev.map((d) =>
            d.jobId === jobId
              ? { ...d, currentStatus: DeliveryStatus.COMPLETED }
              : d,
          ),
        );

        // Delay indexer refresh so optimistic state isn't overwritten
        setTimeout(async () => {
          console.log(
            '[DriverProvider] Refreshing deliveries after settlement...',
          );
          await refreshDeliveries();
        }, 5000);

        return 'settled';
      } catch (handOffErr) {
        const msg =
          handOffErr instanceof Error ? handOffErr.message : String(handOffErr);
        // ReceiverNotSigned (0x04d27bc2) — receiver/customer hasn't signed yet
        if (msg.includes('0x04d27bc2') || msg.includes('ReceiverNotSigned')) {
          console.log('[DriverProvider] handOff: receiver has not signed yet');
          await refreshDeliveries();
          return 'receiver_not_signed';
        }
        // DriverNotSigned (0x9651c947) — shouldn't happen since we just signed
        if (msg.includes('0x9651c947') || msg.includes('DriverNotSigned')) {
          console.warn('[DriverProvider] handOff: driver sig not detected yet');
          await refreshDeliveries();
          return 'receiver_not_signed';
        }
        // Other errors — the sign itself succeeded, don't crash
        console.warn('[DriverProvider] handOff not ready yet:', msg);
        await refreshDeliveries();
        return 'signed';
      }
    } catch (err) {
      console.error('[DriverProvider] completeDelivery error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to sign for delivery',
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
      const ausys = await getSignerAlignedContract();

      // Log journey status before signing
      const journey = await ausys.getJourney(jobId as any);
      console.log(
        '[DriverProvider] packageSign - Journey status before signing:',
        {
          jobId,
          journeyStatus: journey.currentStatus.toString(),
          driver: journey.driver,
          caller: driverWalletAddress,
        },
      );

      const tx = await ausys.packageSign(jobId as any);
      await tx.wait();

      console.log(
        '[DriverProvider] packageSign succeeded for journey:',
        jobId,
        'status:',
        journey.currentStatus.toString(),
      );

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
