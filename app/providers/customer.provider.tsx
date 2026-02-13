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

type CustomerContextType = {
  orders: OrderWithAsset[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  confirmReceipt: (orderId: string) => Promise<void>;
  /** Sender signs for pickup on a journey (calls packageSign as sender) */
  signForPickup: (orderId: string, journeyId: string) => Promise<void>;
  /** Sign for delivery on a P2P order (calls packageSign) */
  signP2PDelivery: (orderId: string, journeyId: string) => Promise<void>;
  /** Complete the handoff on a P2P order (calls handOff, triggers settlement) */
  completeP2PHandoff: (orderId: string, journeyId: string) => Promise<void>;
  /** Fetch live buyer/driver signature states from the contract */
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

      const userAddr = address as string;

      // Fetch CLOB buyer orders and P2P orders in parallel
      const [buyerOrders, p2pOrders] = await Promise.all([
        orderRepository.getBuyerOrders(userAddr),
        orderRepository.getP2POrdersForUser(userAddr).catch((err) => {
          console.warn('[CustomerProvider] Failed to load P2P orders:', err);
          return [] as Order[];
        }),
      ]);

      console.log(
        'buyerOrders',
        buyerOrders.length,
        'p2pOrders',
        p2pOrders.length,
      );

      // Merge and deduplicate by order ID (P2P orders use different IDs)
      const seenIds = new Set<string>();
      const allOrders: Order[] = [];
      for (const order of [...buyerOrders, ...p2pOrders]) {
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
      console.log(
        '[CustomerProvider] confirmReceipt called for orderId:',
        orderId,
      );
      const orderToConfirm = orders.find((o) => o.id === orderId);

      if (!orderToConfirm) {
        console.error('[CustomerProvider] Order not found:', orderId);
        setError(`Order with ID ${orderId} not found.`);
        return;
      }

      console.log('[CustomerProvider] Order found:', orderToConfirm);

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
        const journey = await ausys.getJourney(journeyId as any);
        console.log(
          '[CustomerProvider] confirmReceipt - Journey status before signing:',
          {
            journeyId: journeyId.toString(),
            journeyStatus: journey.currentStatus.toString(),
            receiver: journey.receiver,
          },
        );

        const signTx = await ausys.packageSign(journeyId as any);
        await signTx.wait();

        // Verify receiver signature was recorded
        const isReceiverSigned = await ausys.customerHandOff(
          journey.receiver,
          journeyId as any,
        );
        const isDriverDeliverySigned = await ausys.driverDeliverySigned(
          journey.driver,
          journeyId as any,
        );
        console.log('[CustomerProvider] After receiver signs:', {
          receiverSigned: isReceiverSigned,
          driverDeliverySigned: isDriverDeliverySigned,
        });

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
            console.log(
              '[CustomerProvider] Driver has not signed for delivery yet',
            );
            // Don't throw error - just inform user that receipt is confirmed
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
   * Sender signs for pickup on a journey.
   * After signing, attempts handOn to start the journey (requires driver + sender).
   */
  const signForPickup = useCallback(
    async (orderId: string, journeyId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();

        console.log('[CustomerProvider] signForPickup', {
          orderId,
          journeyId,
        });

        // Sign for pickup as sender
        const signTx = await ausys.packageSign(journeyId as any);
        await signTx.wait();
        console.log('[CustomerProvider] sender packageSign tx confirmed');

        // Try to start journey (handOn) — needs both driver + sender signed
        try {
          const handOnTx = await ausys.handOn(journeyId as any);
          await handOnTx.wait();
          console.log(
            '[CustomerProvider] handOn tx confirmed — journey started',
          );
        } catch (handOnErr) {
          // handOn may fail if driver hasn't signed yet — that's fine
          console.log(
            '[CustomerProvider] handOn not ready yet (driver may not have signed):',
            handOnErr instanceof Error ? handOnErr.message : handOnErr,
          );
        }

        // Refresh orders to pick up updated state
        await loadCustomerOrders();
      } catch (err) {
        console.error('[CustomerProvider] signForPickup error:', err);
        setError('Failed to sign for pickup');
        handleContractError(err, 'sign for pickup');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [repoContext, loadCustomerOrders],
  );

  /**
   * Sign for delivery on a P2P order.
   * Calls packageSign on the journey, then attempts handOff if both sides signed.
   */
  const signP2PDelivery = useCallback(
    async (orderId: string, journeyId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();

        console.log('[CustomerProvider] signP2PDelivery', {
          orderId,
          journeyId,
        });

        const signTx = await ausys.packageSign(journeyId as any);
        await signTx.wait();
        console.log('[CustomerProvider] packageSign tx confirmed');

        // Refresh orders to pick up updated state
        await loadCustomerOrders();
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
   * Complete the handoff on a P2P order (triggers settlement).
   * Both buyer and driver must have signed before calling this.
   */
  const completeP2PHandoff = useCallback(
    async (orderId: string, journeyId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();

        console.log('[CustomerProvider] completeP2PHandoff', {
          orderId,
          journeyId,
        });

        const handOffTx = await ausys.handOff(journeyId as any);
        await handOffTx.wait();
        console.log('[CustomerProvider] handOff tx confirmed');

        // Update local state optimistically
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, currentStatus: OrderStatus.SETTLED } : o,
          ),
        );

        // Also refresh from indexer
        await loadCustomerOrders();
      } catch (err) {
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
   * Fetch live buyer/driver signature states from the contract.
   * Used by P2POrderFlow to determine which buttons to show.
   */
  const getP2PSignatureState = useCallback(
    async (
      orderId: string,
      journeyId: string,
    ): Promise<{ buyerSigned: boolean; driverDeliverySigned: boolean }> => {
      try {
        const ausys = repoContext.getAusysContract();
        const journey = await ausys.getJourney(journeyId as any);

        const [buyerSigned, driverDeliverySigned] = await Promise.all([
          ausys.customerHandOff(journey.receiver, journeyId as any),
          ausys.driverDeliverySigned(journey.driver, journeyId as any),
        ]);

        return {
          buyerSigned: Boolean(buyerSigned),
          driverDeliverySigned: Boolean(driverDeliverySigned),
        };
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

        console.log('[CustomerProvider] createP2PJourney', {
          orderId,
          sender: delivery.senderNodeAddress,
          receiver: delivery.receiverAddress,
        });

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
        console.log('[CustomerProvider] createOrderJourney tx confirmed');

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
    signForPickup,
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
