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

// Types
export type CustomerOrder = {
  id: string;
  journeyId: string | null;
  asset: string;
  quantity: number;
  value: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
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
  const repoContext = RepositoryContext.getInstance();
  const orderRepository = repoContext.getOrderRepository();
  const { address } = useWallet();
  const loadCustomerOrders = useCallback(async () => {
    if (!orderRepository) {
      setError('Order Repository not available.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const domainOrders = await orderRepository.getCustomerJourneys(
        address as string,
      );
      // domainOrders here returns journeys; for customer orders view, fetch buyer orders instead
      const buyerOrders = await orderRepository.getBuyerOrders(
        address as string,
      );
      const mappedOrders: CustomerOrder[] = buyerOrders.map((order: any) => ({
        id: order.id,
        journeyId:
          Array.isArray(order.journeyIds) && order.journeyIds.length > 0
            ? order.journeyIds[0]
            : null,
        asset: order.tokenId,
        quantity: Number(order.tokenQuantity),
        value: order.price?.toString?.() ?? String(order.price),
        status: getOrderStatus(order.currentStatus),
        timestamp: Date.now(),
        deliveryLocation: order.locationData?.endName ?? null,
      }));

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Error loading customer orders:', err);
      setError('Failed to load customer orders');
      handleContractError(err, 'load customer orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderRepository, address]);

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual blockchain call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: 'cancelled' as const }
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

      if (!orderToConfirm.journeyId) {
        setError(`Order ${orderId} has no associated journey to sign.`);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const ausys = repoContext.getAusysContract();
        const tx = await ausys.packageSign(orderToConfirm.journeyId as any);
        const receipt = await tx.wait();
        console.log('Confirmation Receipt:', receipt);

        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: 'completed' as const }
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
    [orders, loadCustomerOrders],
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

function getOrderStatus(
  status: bigint,
): 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' {
  switch (Number(status)) {
    case 0:
      return 'pending';
    case 1:
      return 'accepted';
    case 2:
      return 'in_progress';
    case 3:
      return 'completed';
    case 4:
      return 'cancelled';
    default:
      console.warn(`Unknown order status: ${status}`);
      return 'pending';
  }
}

// Hook for using the customer context
export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
