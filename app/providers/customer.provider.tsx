'use client';

import { LocationContract } from '@/typechain-types';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { handleContractError } from '@/utils/error-handler';
import { useWallet } from '@/hooks/useWallet';
import { Asset } from '@/domain/shared';
import { usePlatform } from '@/app/providers/platform.provider';
import { Order, OrderStatus } from '@/domain/orders/order';
import { getOrderStatus } from '@/app/utils/helpers';
// Types
export type CustomerOrder = {
  id: string;
  journeyId: string | null;
  asset: Asset;
  quantity: number;
  value: string;
  status: OrderStatus;
  timestamp: number;
  deliveryLocation: string | null;
};

type CustomerContextType = {
  orders: CustomerOrder[];
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
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderRepository = RepositoryContext.getInstance().getOrderRepository();
  const orderService = ServiceContext.getInstance().getOrderService();
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
      const contractOrders = await orderRepository.getCustomerOrders(
        address as string,
      );
      console.log(`[CustomerProvider] Contract orders: ${contractOrders[0]}`);
      console.log('[CustomerProvider] asset id', contractOrders[0].tokenId);
      console.log(
        '[CustomerProvider] asset id',
        contractOrders[0].tokenId.toString(),
      );

      const mappedOrders: CustomerOrder[] = await Promise.all(
        contractOrders.map(async (order: Order) => {
          const asset = await getAssetByTokenId(order.tokenId.toString());
          if (!asset) {
            throw new Error(
              `Asset not found for token ID: ${order.tokenId.toString()}`,
            );
          }

          return {
            id: order.id,
            journeyId: order.journeyIds.length > 0 ? order.journeyIds[0] : null,
            asset,
            quantity: Number(order.requestedTokenQuantity),
            value: order.price.toString(),
            status: getOrderStatus(order.currentStatus),
            timestamp: Date.now(),
            deliveryLocation: order.locationData.endName ?? null,
          };
        }),
      );

      setOrders(mappedOrders);
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
            ? { ...order, status: OrderStatus.CANCELLED }
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
      if (!orderService) {
        setError('Order Service not available.');
        return;
      }
      const orderToConfirm = orders.find((o) => o.id === orderId);

      if (!orderToConfirm) {
        setError(`Order with ID ${orderId} not found.`);
        return;
      }

      if (!orderToConfirm.journeyId) {
        setError(`Order ${orderId} has no associated journey to sign.`);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const receipt = await orderService.customerSignPackage(
          orderToConfirm.journeyId,
        );
        console.log('Confirmation Receipt:', receipt);

        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: OrderStatus.COMPLETED }
              : order,
          ),
        );
      } catch (err) {
        console.error('Error confirming receipt:', err);
        setError('Failed to confirm receipt');
        handleContractError(err, 'confirm receipt');
      } finally {
        setIsLoading(false);
      }
    },
    [orderService, orders, loadCustomerOrders],
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
