'use client';

import {
  customerPackageSign,
  getOrders,
} from '@/dapp-connectors/ausys-controller';
import { LocationContract } from '@/typechain-types';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';

// Types
export type CustomerOrder = {
  id: string;
  asset: string;
  quantity: number;
  value: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  timestamp: number;
  deliveryLocation?: string;
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

  // This function will be replaced with actual blockchain integration later
  const loadCustomerOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const contractOrders = await getOrders();

      // Map contract orders to CustomerOrder format
      const mappedOrders: CustomerOrder[] = contractOrders.map((order) => ({
        id: order.id,
        asset: order.tokenId.toString(),
        quantity: Number(order.tokenQuantity),
        value: order.price.toString(),
        status: getOrderStatus(order.currentStatus),
        timestamp: Date.now(), // You might want to use a real timestamp if available
        deliveryLocation: order.locationData.endName,
      }));

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const confirmReceipt = useCallback(async (orderId: string) => {
    try {
      setIsLoading(true);
      await customerPackageSign(orderId);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: 'completed' as const }
            : order,
        ),
      );
    } catch (err) {
      console.error('Error confirming receipt:', err);
      throw new Error('Failed to confirm receipt');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    case 0: // PENDING
      return 'pending';
    case 1: // ACCEPTED
      return 'accepted';
    case 2: // PICKED_UP/IN_PROGRESS
      return 'in_progress';
    case 3: // COMPLETED
      return 'completed';
    case 4: // CANCELED
      return 'cancelled';
    default:
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

// Add this helper function
