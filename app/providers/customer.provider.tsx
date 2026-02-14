'use client';

import { ethers } from 'ethers';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
// ServiceContext not used; we call contract directly via RepositoryContext
import { handleContractError } from '@/utils/error-handler';
import { useWallet } from '@/hooks/useWallet';
import { Order, OrderStatus } from '@/domain/orders/order';
import { usePlatform } from './platform.provider';
import { OrderWithAsset } from '@/app/types/shared';
import { P2PDeliveryDetails } from '@/domain/p2p';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  GET_EMIT_SIG_EVENTS_BY_JOURNEY,
  type EmitSigEventsByJourneyResponse,
} from '@/infrastructure/shared/graph-queries';
import { NEXT_PUBLIC_AUSYS_SUBGRAPH_URL } from '@/chain-constants';

type CustomerContextType = {
  orders: OrderWithAsset[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  confirmReceipt: (orderId: string) => Promise<void>;
  /** Sign for delivery on a P2P order (calls packageSign, then auto-attempts handOff).
   *  Returns 'settled' if handOff succeeded, 'driver_not_signed' if driver hasn't signed,
   *  or 'signed' if only the signature recorded. */
  signP2PDelivery: (
    orderId: string,
    journeyId: string,
  ) => Promise<'settled' | 'driver_not_signed' | 'signed'>;
  /** Attempt handOff on a P2P order. Returns 'settled' or 'driver_not_signed'. */
  completeP2PHandoff: (
    orderId: string,
    journeyId: string,
  ) => Promise<'settled' | 'driver_not_signed'>;
  /** Fetch live receiver/driver delivery signature states */
  getP2PSignatureState: (
    orderId: string,
    journeyId: string,
  ) => Promise<{ buyerSigned: boolean; driverDeliverySigned: boolean }>;
  /** Create a delivery journey for an accepted P2P order that has no journey */
  createP2PJourney: (
    orderId: string,
    delivery: P2PDeliveryDetails,
  ) => Promise<void>;
};

// Create context
const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined,
);

// Provider component
export function CustomerProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderWithAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repoContext = RepositoryContext.getInstance();
  const orderRepository = repoContext.getOrderRepository();
  const { address } = useWallet();
  const { getAssetByTokenId } = usePlatform();
  const loadCustomerOrders = useCallback(async () => {
    if (!orderRepository) {
      setError('Order Repository not available.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      if (!address) {
        setOrders([]);
        return;
      }

      const userAddr = address;

      // Fetch CLOB buyer orders and P2P orders in parallel
      const [buyerOrders, allP2POrders] = await Promise.all([
        orderRepository.getBuyerOrders(userAddr),
        orderRepository.getP2POrdersForUser(userAddr).catch((err) => {
          console.warn('[CustomerProvider] Failed to load P2P orders:', err);
          return [] as Order[];
        }),
      ]);

      // Customer dashboard only shows P2P orders where the user is the BUYER.
      // Seller P2P orders belong on the node dashboard (seller = node operator).
      const p2pBuyerOrders = allP2POrders.filter(
        (order) => order.buyer?.toLowerCase() === userAddr.toLowerCase(),
      );

      // Merge and deduplicate by order ID
      const seenIds = new Set<string>();
      const allOrders: Order[] = [];
      for (const order of [...buyerOrders, ...p2pBuyerOrders]) {
        const oid = order.id.toLowerCase();
        if (!seenIds.has(oid)) {
          seenIds.add(oid);
          allOrders.push(order);
        }
      }

      // Fetch asset details for each order
      const ordersWithAssets: OrderWithAsset[] = await Promise.all(
        allOrders.map(async (order) => {
          try {
            const asset = await getAssetByTokenId(order.tokenId);
            return {
              ...order,
              asset,
            };
          } catch (err) {
            console.warn(
              `Failed to fetch asset for tokenId ${order.tokenId}:`,
              err,
            );
            return {
              ...order,
              asset: null,
            };
          }
        }),
      );

      setOrders(ordersWithAssets);
    } catch (err) {
      console.error('Error loading customer orders:', err);
      setError('Failed to load customer orders');
      handleContractError(err, 'load customer orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderRepository, address, getAssetByTokenId]);

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual blockchain call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, currentStatus: OrderStatus.CANCELLED }
            : order,
        ),
      );
    } catch (err) {
      console.error('Error cancelling order:', err);
      throw new Error('Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmReceipt = useCallback(
    async (orderId: string) => {
      const orderToConfirm = orders.find((o) => o.id === orderId);

      if (!orderToConfirm) {
        console.error('[CustomerProvider] Order not found:', orderId);
        setError(`Order with ID ${orderId} not found.`);
        return;
      }

      if (
        !orderToConfirm.journeyIds ||
        orderToConfirm.journeyIds.length === 0
      ) {
        setError(`Order ${orderId} has no associated journey to sign.`);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();
        const journeyId = orderToConfirm.journeyIds[0];

        // 1. Sign the receipt (receiver confirms receipt) - this sets customerHandOff[receiver][id] = true
        // 1. Sign the receipt (receiver confirms delivery)
        const signTx = await ausys.packageSign(journeyId as any);
        await signTx.wait();

        // 2. Try to complete delivery (handOff) - this will work if driver has also signed for delivery
        try {
          const handOffTx = await ausys.handOff(journeyId as any);
          await handOffTx.wait();

          // Success! Update order status
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.id === orderId
                ? { ...order, currentStatus: OrderStatus.SETTLED }
                : order,
            ),
          );
        } catch (handOffErr) {
          // handOff failed - driver hasn't signed for delivery yet
          if (
            handOffErr instanceof Error &&
            handOffErr.message.includes('0x9651c947')
          ) {
            // DriverNotSigned — receipt confirmed, waiting for driver
            return;
          }

          // Other errors should be thrown
          throw handOffErr;
        }
      } catch (err) {
        console.error('Error confirming receipt:', err);
        setError('Failed to confirm receipt');
        handleContractError(err, 'confirm receipt');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [orders, repoContext],
  );

  /**
   * Sign for delivery on a P2P order.
   * Calls packageSign on the journey, then auto-attempts handOff.
   * Returns 'settled' if handOff succeeds, 'driver_not_signed' if
   * the driver hasn't signed yet (not an error — just waiting).
   */
  const signP2PDelivery = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<'settled' | 'driver_not_signed' | 'signed'> => {
      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();

        // 1. Sign for delivery (receiver confirms delivery receipt)
        const signTx = await ausys.packageSign(journeyId as any);
        await signTx.wait();

        // 2. Auto-attempt handOff — succeeds if driver has also signed
        try {
          const handOffTx = await ausys.handOff(journeyId as any);
          await handOffTx.wait();

          // Success — update order status optimistically
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? { ...o, currentStatus: OrderStatus.SETTLED }
                : o,
            ),
          );

          await loadCustomerOrders();
          return 'settled';
        } catch (handOffErr) {
          const msg =
            handOffErr instanceof Error
              ? handOffErr.message
              : String(handOffErr);
          // DriverNotSigned — expected, not an error
          if (msg.includes('0x9651c947') || msg.includes('0x9651c547')) {
            console.log(
              '[CustomerProvider] signP2PDelivery: driver has not signed yet, waiting',
            );
            return 'driver_not_signed';
          }
          // Other handOff errors — the sign itself succeeded, don't throw
          console.warn('[CustomerProvider] handOff not ready yet:', msg);
          return 'signed';
        }
      } catch (err) {
        console.error('[CustomerProvider] signP2PDelivery error:', err);
        setError('Failed to sign for delivery');
        handleContractError(err, 'sign P2P delivery');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [repoContext, loadCustomerOrders],
  );

  /**
   * Attempt to complete the handoff on a P2P order (triggers settlement).
   * If the driver hasn't signed yet, resolves with 'driver_not_signed'
   * instead of throwing — the UI can show a waiting state.
   */
  const completeP2PHandoff = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<'settled' | 'driver_not_signed'> => {
      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();

        const handOffTx = await ausys.handOff(journeyId as any);
        await handOffTx.wait();

        // Update local state optimistically
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, currentStatus: OrderStatus.SETTLED } : o,
          ),
        );

        // Also refresh from indexer
        await loadCustomerOrders();
        return 'settled';
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // DriverNotSigned (0x9651c947 / 0x9651c547) — driver hasn't signed yet
        if (msg.includes('0x9651c947') || msg.includes('0x9651c547')) {
          console.log('[CustomerProvider] handOff: driver has not signed yet');
          return 'driver_not_signed';
        }
        console.error('[CustomerProvider] completeP2PHandoff error:', err);
        setError('Failed to complete handoff');
        handleContractError(err, 'complete P2P handoff');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [repoContext, loadCustomerOrders],
  );

  /**
   * Fetch live receiver/driver delivery signature states.
   *
   * Uses two data sources:
   * 1. Journey currentStatus from the contract (definitive for completed states)
   * 2. EmitSig events from the indexer (tracks individual packageSign calls)
   *
   * Contract packageSign emits EmitSig(address user, bytes32 id):
   * - Receiver can only sign during InTransit (status 1), so any receiver EmitSig → buyerSigned
   * - Driver signs once for pickup (status 0) and once for delivery (status 1),
   *   so 2+ driver EmitSig events → driverDeliverySigned
   */
  const getP2PSignatureState = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<{ buyerSigned: boolean; driverDeliverySigned: boolean }> => {
      try {
        const ausys = repoContext.getAusysContract();
        const journey = await ausys.getJourney(journeyId as any);
        const status = Number(journey.currentStatus);

        // Definitive: Delivered means both parties signed and handOff succeeded
        if (status >= 2) {
          return { buyerSigned: true, driverDeliverySigned: true };
        }

        // For InTransit, query EmitSig events to determine who has signed
        if (status === 1) {
          try {
            const sigResponse =
              await graphqlRequest<EmitSigEventsByJourneyResponse>(
                NEXT_PUBLIC_AUSYS_SUBGRAPH_URL,
                GET_EMIT_SIG_EVENTS_BY_JOURNEY,
                { journeyId, limit: 50 },
              );

            const sigEvents = sigResponse.diamondEmitSigEventss?.items || [];
            const receiver = journey.receiver.toLowerCase();
            const driver = journey.driver.toLowerCase();

            // Receiver can only sign during InTransit → any match = buyerSigned
            const buyerSigned = sigEvents.some(
              (e) => e.user.toLowerCase() === receiver,
            );

            // Driver signs once for pickup (status 0), once for delivery (status 1)
            // 2+ driver sigs = both pickup + delivery signed
            const driverSigCount = sigEvents.filter(
              (e) => e.user.toLowerCase() === driver,
            ).length;
            const driverDeliverySigned = driverSigCount >= 2;

            return { buyerSigned, driverDeliverySigned };
          } catch (indexerErr) {
            // Indexer unavailable — fall back to safe defaults
            console.warn(
              '[CustomerProvider] EmitSig query failed, using defaults:',
              indexerErr,
            );
            return { buyerSigned: false, driverDeliverySigned: false };
          }
        }

        // Status 0 (Pending) — no delivery signatures possible yet
        return { buyerSigned: false, driverDeliverySigned: false };
      } catch (err) {
        console.warn('[CustomerProvider] getP2PSignatureState error:', err);
        return { buyerSigned: false, driverDeliverySigned: false };
      }
    },
    [repoContext],
  );

  /**
   * Create a delivery journey for an accepted P2P order that has no journey yet.
   * This handles orders that "slipped through" before the Accept & Schedule flow.
   */
  const createP2PJourney = useCallback(
    async (orderId: string, delivery: P2PDeliveryDetails) => {
      try {
        setIsLoading(true);
        setError(null);
        // Use the Diamond contract (has createOrderJourney), not the Ausys contract
        const diamond = repoContext.getDiamondContext().getDiamond();

        const journeyTx = await diamond.createOrderJourney(
          orderId,
          delivery.senderNodeAddress,
          delivery.receiverAddress,
          delivery.parcelData,
          delivery.bountyWei,
          delivery.etaTimestamp,
          delivery.tokenQuantity,
          delivery.assetId,
        );
        await journeyTx.wait();

        // Refresh orders to pick up the new journey
        await loadCustomerOrders();
      } catch (err) {
        console.error('[CustomerProvider] createP2PJourney error:', err);
        setError('Failed to create delivery journey');
        handleContractError(err, 'create P2P journey');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [repoContext, loadCustomerOrders],
  );

  const refreshOrders = useCallback(async () => {
    await loadCustomerOrders();
  }, [loadCustomerOrders]);

  useEffect(() => {
    loadCustomerOrders();
  }, [loadCustomerOrders]);

  const value = {
    orders,
    isLoading,
    error,
    refreshOrders,
    cancelOrder,
    confirmReceipt,
    signP2PDelivery,
    completeP2PHandoff,
    getP2PSignatureState,
    createP2PJourney,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

// Hook for using the customer context
export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
