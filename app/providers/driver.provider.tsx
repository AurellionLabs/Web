'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Delivery, DeliveryStatus } from '@/domain/driver/driver';
import { useWallet } from '@/hooks/useWallet';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { NEXT_PUBLIC_AUSYS_SUBGRAPH_URL } from '@/chain-constants';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  type EmitSigEventsByJourneyResponse,
} from '@/infrastructure/shared/graph-queries';

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
  const { address: driverWalletAddress, connectedWallet } = useWallet();
  const repoContext = RepositoryContext.getInstance();
  const repository = repoContext.getDriverRepository();

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

      // Ensure no job appears in both lists: remove from available if in myDeliveries
      const myJobIds = new Set(mineWithETA.map((d) => d.jobId.toLowerCase()));
      const dedupedAvailable = availableWithETA.filter(
        (d) => !myJobIds.has(d.jobId.toLowerCase()),
      );

      // Check EmitSig events for ACCEPTED deliveries to detect if driver
      // has already signed for pickup (restore AWAITING_SENDER on reload)
      const driverAddr = driverWalletAddress.toLowerCase();
      const mineWithSigState = await Promise.all(
        mineWithETA.map(async (delivery) => {
          if (delivery.currentStatus !== DeliveryStatus.ACCEPTED) {
            return delivery;
          }
          try {
            const sigResponse =
              await graphqlRequest<EmitSigEventsByJourneyResponse>(
                NEXT_PUBLIC_AUSYS_SUBGRAPH_URL,
                GET_EMIT_SIG_EVENTS_BY_JOURNEY,
                { journeyId: delivery.jobId, limit: 50 },
              );
            const sigEvents = sigResponse.diamondEmitSigEventss?.items || [];
            const driverSigned = sigEvents.some(
              (e) => e.user.toLowerCase() === driverAddr,
            );
            if (driverSigned) {
              return {
                ...delivery,
                currentStatus: DeliveryStatus.AWAITING_SENDER,
              };
            }
          } catch (err) {
            console.warn(
              `[DriverProvider] EmitSig check failed for ${delivery.jobId}:`,
              err,
            );
          }
          return delivery;
        }),
      );

      setAvailableDeliveries(dedupedAvailable);
      setMyDeliveries(mineWithSigState);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load deliveries',
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get a signer-aligned Ausys contract.
   * If the RepositoryContext signer doesn't match the current wallet,
   * derive a fresh signer from the Privy wallet's Ethereum provider.
   */
  const getSignerAlignedContract = async () => {
    const ausys = repoContext.getAusysContract();
    if (!driverWalletAddress) throw new Error('Wallet not connected');

    const signerAddr = await repoContext.getSignerAddress();
    if (signerAddr.toLowerCase() === driverWalletAddress.toLowerCase()) {
      return ausys; // Already aligned
    }

    console.warn(
      `[DriverProvider] Signer mismatch: stored=${signerAddr}, wallet=${driverWalletAddress}. Reconnecting...`,
    );

    if (connectedWallet) {
      const ethereumProvider = await connectedWallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const freshSigner = await provider.getSigner();
      await repoContext.updateSigner(freshSigner);
      return repoContext.getAusysContract();
    }

    // Fallback: return existing contract (may still fail)
    console.warn(
      '[DriverProvider] No Privy wallet available for signer alignment',
    );
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
        const DRIVER_ROLE = await (ausys as any).DRIVER_ROLE();
        const hasDriverRole = await (ausys as any).hasAuSysRole(
          DRIVER_ROLE,
          driverWalletAddress,
        );

        if (!hasDriverRole) {
          try {
            const tx = await (ausys as any).setDriver(
              driverWalletAddress,
              true,
            );
            await tx.wait();
          } catch (roleErr) {
            console.warn('[Accept] Could not auto-grant driver role:', roleErr);
            // Don't throw here — let assignDriverToJourney attempt and fail
            // with a clear InvalidCaller error if the role is truly missing.
          }
        } else {
        }
      } catch (roleCheckErr) {
        console.error('[Accept] Role check failed (non-fatal):', roleCheckErr);
        // Continue anyway — the contract will enforce the role check
      }

      // Assign driver to journey
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
      await new Promise((r) => setTimeout(r, 3000));
      await refreshDeliveries();

      // Schedule a follow-up refresh in case the first was too early
      setTimeout(() => {
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
      try {
        const journey = await (ausys as any).getJourney(jobId);
      } catch (e) {
        console.warn('[confirmPickup] Could not fetch journey details:', e);
      }

      const tx = await ausys.packageSign(jobId as any);
      const receipt = await tx.wait();
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

      // 2. Auto-attempt handOff with retry — RPC may not have propagated
      //    the packageSign state change yet.
      const MAX_HANDOFF_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_HANDOFF_ATTEMPTS; attempt++) {
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
            await refreshDeliveries();
          }, 5000);

          return 'settled';
        } catch (handOffErr) {
          const msg =
            handOffErr instanceof Error
              ? handOffErr.message
              : String(handOffErr);

          // DriverNotSigned — we just signed as driver, RPC likely stale.
          // Retry after a short delay to let state propagate.
          if (
            (msg.includes('0x9651c947') || msg.includes('DriverNotSigned')) &&
            attempt < MAX_HANDOFF_ATTEMPTS
          ) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }

          // ReceiverNotSigned — receiver genuinely hasn't signed yet
          if (msg.includes('0x04d27bc2') || msg.includes('ReceiverNotSigned')) {
            await refreshDeliveries();
            return 'receiver_not_signed';
          }
          // DriverNotSigned after all retries
          if (msg.includes('0x9651c947') || msg.includes('DriverNotSigned')) {
            console.warn(
              '[DriverProvider] handOff: driver sig not detected after retries',
            );
            await refreshDeliveries();
            return 'receiver_not_signed';
          }
          // Other errors — the sign itself succeeded, don't crash
          console.warn('[DriverProvider] handOff not ready yet:', msg);
          await refreshDeliveries();
          return 'signed';
        }
      }
      // Shouldn't reach here
      await refreshDeliveries();
      return 'signed';
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
    if (driverWalletAddress) {
      refreshDeliveries();
    } else {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
