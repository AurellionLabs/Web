'use client';

import { createContext, useContext, ReactNode } from 'react';

// Types
export type Order = {
  id: string;
  customer: string;
  asset: string;
  quantity: number;
  value: string; // Numeric string without unit
  status: 'active' | 'pending' | 'completed' | 'cancelled';
};

type NodeContextType = {
  orders: Order[];
};

// Mock data
const mockOrders: Order[] = [
  {
    id: '1',
    customer: '0x1234...5678',
    asset: 'goat',
    quantity: 2,
    value: '2000',
    status: 'active',
  },
  {
    id: '2',
    customer: '0x8765...4321',
    asset: 'sheep',
    quantity: 1,
    value: '1000',
    status: 'completed',
  },
  {
    id: '3',
    customer: '0x9876...5432',
    asset: 'cow',
    quantity: 1,
    value: '3000',
    status: 'pending',
  },
  // Add more mock data for pagination testing
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `${i + 4}`,
    customer: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
    asset: ['goat', 'sheep', 'cow', 'chicken', 'duck'][
      Math.floor(Math.random() * 5)
    ],
    quantity: Math.floor(Math.random() * 10) + 1,
    value: Math.floor(Math.random() * 5000).toString(),
    status: ['active', 'pending', 'completed', 'cancelled'][
      Math.floor(Math.random() * 3)
    ] as Order['status'],
  })),
];

// Create context
const NodeContext = createContext<NodeContextType | undefined>(undefined);

// Provider component
export function NodeProvider({ children }: { children: ReactNode }) {
  // In a real application, you might want to add functions to update orders
  // and fetch them from your blockchain
  const value = {
    orders: mockOrders,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
}

// Hook for using the node context
export function useNode() {
  const context = useContext(NodeContext);
  if (context === undefined) {
    throw new Error('useNode must be used within a NodeProvider');
  }
  return context;
}
