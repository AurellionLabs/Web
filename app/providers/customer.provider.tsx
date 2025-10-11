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
        const journey = await ausys.idToJourney(journeyId as any);
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
