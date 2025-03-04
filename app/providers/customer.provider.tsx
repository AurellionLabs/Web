'use client';

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
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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

      // TODO: Replace this with actual blockchain call
      // Simulating API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Using mock data for now
      setOrders(mockOrders);
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
      // TODO: Replace with actual blockchain call
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

// Hook for using the customer context
export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}

// Mock data for development
const mockOrders: CustomerOrder[] = [
  {
    id: 'ORD001',
    asset: 'goat',
    quantity: 2,
    value: '2000',
    status: 'in_progress',
    timestamp: Date.now() - 86400000, // 1 day ago
  },
  {
    id: 'ORD002',
    asset: 'sheep',
    quantity: 1,
    value: '1000',
    status: 'completed',
    timestamp: Date.now() - 172800000, // 2 days ago
  },
  {
    id: 'ORD003',
    asset: 'cow',
    quantity: 1,
    value: '3000',
    status: 'pending',
    timestamp: Date.now() - 259200000, // 3 days ago
  },
  {
    id: 'ORD004',
    asset: 'chicken',
    quantity: 5,
    value: '500',
    status: 'cancelled',
    timestamp: Date.now() - 345600000, // 4 days ago
  },
  {
    id: 'ORD005',
    asset: 'cow',
    quantity: 3,
    value: '9000',
    status: 'completed',
    timestamp: Date.now() - 432000000, // 5 days ago
  },
  {
    id: 'ORD006',
    asset: 'goat',
    quantity: 4,
    value: '4000',
    status: 'in_progress',
    timestamp: Date.now() - 518400000, // 6 days ago
  },
  {
    id: 'ORD007',
    asset: 'sheep',
    quantity: 2,
    value: '2000',
    status: 'pending',
    timestamp: Date.now() - 604800000, // 7 days ago
  },
  {
    id: 'ORD008',
    asset: 'chicken',
    quantity: 10,
    value: '1000',
    status: 'completed',
    timestamp: Date.now() - 691200000, // 8 days ago
  },
  {
    id: 'ORD009',
    asset: 'cow',
    quantity: 2,
    value: '6000',
    status: 'cancelled',
    timestamp: Date.now() - 777600000, // 9 days ago
  },
  {
    id: 'ORD010',
    asset: 'goat',
    quantity: 3,
    value: '3000',
    status: 'in_progress',
    timestamp: Date.now() - 864000000, // 10 days ago
  },
  {
    id: 'ORD011',
    asset: 'sheep',
    quantity: 5,
    value: '5000',
    status: 'completed',
    timestamp: Date.now() - 950400000, // 11 days ago
  },
  {
    id: 'ORD012',
    asset: 'chicken',
    quantity: 8,
    value: '800',
    status: 'pending',
    timestamp: Date.now() - 1036800000, // 12 days ago
  },
  {
    id: 'ORD013',
    asset: 'cow',
    quantity: 1,
    value: '3000',
    status: 'in_progress',
    timestamp: Date.now() - 1123200000, // 13 days ago
  },
  {
    id: 'ORD014',
    asset: 'goat',
    quantity: 6,
    value: '6000',
    status: 'completed',
    timestamp: Date.now() - 1209600000, // 14 days ago
  },
  {
    id: 'ORD015',
    asset: 'sheep',
    quantity: 3,
    value: '3000',
    status: 'cancelled',
    timestamp: Date.now() - 1296000000, // 15 days ago
  },
];
