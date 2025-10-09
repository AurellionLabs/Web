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
import { OrderStatus } from '@/domain/orders/order';
import { usePlatform } from './platform.provider';
import { OrderWithAsset } from '@/app/types/shared';

type CustomerContextType = {
  orders: OrderWithAsset[];
  isLoading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  confirmReceipt: (orderId: string) => Promise<void>;
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
      // Fetch buyer orders directly from the repository
      const buyerOrders = await orderRepository.getBuyerOrders(
        address as string,
      );
      console.log('buyerOrders', buyerOrders);

      // Fetch asset details for each order
      const ordersWithAssets: OrderWithAsset[] = await Promise.all(
        buyerOrders.map(async (order) => {
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

        // Check journey status before signing
        try {
          const journey = await ausys.idToJourney(journeyId as any);
          const isReceiverSigned = await ausys.customerHandOff(
            journey.receiver,
            journeyId as any,
          );
          console.log('[CustomerProvider] Status before receiver signs:', {
            journeyId,
            journeyStatus: journey.currentStatus.toString(),
            receiver: journey.receiver,
            receiverAlreadySigned: isReceiverSigned,
          });
        } catch (e) {
          console.warn(
            '[CustomerProvider] Could not check status before signing:',
            e,
          );
        }

        // 1. Sign the package (receiver confirms receipt)
        const signTx = await ausys.packageSign(journeyId as any);
        await signTx.wait();
        console.log('[CustomerProvider] Receipt signature confirmed');

        // Verify signature was recorded
        try {
          const journey = await ausys.idToJourney(journeyId as any);
          const isReceiverSigned = await ausys.customerHandOff(
            journey.receiver,
            journeyId as any,
          );
          const isDriverSigned = await ausys.driverHandOn(
            journey.driver,
            journeyId as any,
          );
          console.log('[CustomerProvider] Status after receiver signs:', {
            receiverSigned: isReceiverSigned,
            driverSigned: isDriverSigned,
          });
        } catch (e) {
          console.warn('[CustomerProvider] Could not verify signature:', e);
        }

        // 2. Attempt to complete delivery (handOff) - will succeed if driver has also signed
        try {
          const handOffTx = await ausys.handOff(journeyId as any);
          await handOffTx.wait();
          console.log(
            '[CustomerProvider] Delivery completed successfully via handOff',
          );

          // Update order status to settled
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.id === orderId
                ? { ...order, currentStatus: OrderStatus.SETTLED }
                : order,
            ),
          );
        } catch (handOffErr) {
          console.log(
            '[CustomerProvider] handOff failed (expected if driver has not signed yet):',
            handOffErr,
          );

          // Check if it's the expected DriverNotSigned error
          if (
            handOffErr instanceof Error &&
            handOffErr.message.includes('0x9651c947')
          ) {
            console.log(
              '[CustomerProvider] Driver has not signed yet - this is expected',
            );
            // Not an error - just means we need to wait for driver
          } else {
            // Log unexpected errors but don't throw - the signature was successful
            console.warn(
              '[CustomerProvider] Unexpected error during handOff:',
              handOffErr,
            );
          }
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
