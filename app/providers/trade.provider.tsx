'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { getOrders } from '@/dapp-connectors/ausys-controller';

export interface TokenizedAsset {
  id: string;
  nodeId: string;
  nodeName: string;
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

export interface Order {
  id: string;
  nodeId: string;
  nodeName: string;
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  deliveryLocation: string;
}

export interface TradeContextType {
  assets: TokenizedAsset[];
  setAssets: (assets: TokenizedAsset[]) => void;
  fetchAssets: () => Promise<void>;
  isLoading: boolean;
  getAssetById: (id: string) => TokenizedAsset | undefined;
  placeOrder: (order: Order) => Promise<boolean>;
  orders: Order[];
  loadOrders: () => Promise<void>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    console.log('fetchAssets called');
    setIsLoading(true);
    try {
      // Using mock data for now
      const mockData: TokenizedAsset[] = [
        {
          id: '1',
          nodeId: 'node1',
          nodeName: 'Green Valley Farm',
          assetClass: 'goat',
          quantity: 10,
          pricePerUnit: 500,
          totalValue: 5000,
        },
        {
          id: '2',
          nodeId: 'node1',
          nodeName: 'Green Valley Farm',
          assetClass: 'sheep',
          quantity: 15,
          pricePerUnit: 600,
          totalValue: 9000,
        },
        {
          id: '3',
          nodeId: 'node2',
          nodeName: 'Highland Ranch',
          assetClass: 'goat',
          quantity: 8,
          pricePerUnit: 550,
          totalValue: 4400,
        },
        {
          id: '4',
          nodeId: 'node3',
          nodeName: 'Sunrise Farms',
          assetClass: 'cattle',
          quantity: 5,
          pricePerUnit: 2000,
          totalValue: 10000,
        },
        {
          id: '5',
          nodeId: 'node3',
          nodeName: 'Sunrise Farms',
          assetClass: 'sheep',
          quantity: 25,
          pricePerUnit: 550,
          totalValue: 13750,
        },
        {
          id: '6',
          nodeId: 'node4',
          nodeName: 'Mountain View Ranch',
          assetClass: 'cattle',
          quantity: 3,
          pricePerUnit: 2200,
          totalValue: 6600,
        },
        {
          id: '7',
          nodeId: 'node2',
          nodeName: 'Highland Ranch',
          assetClass: 'sheep',
          quantity: 20,
          pricePerUnit: 580,
          totalValue: 11600,
        },
        {
          id: '8',
          nodeId: 'node4',
          nodeName: 'Mountain View Ranch',
          assetClass: 'goat',
          quantity: 12,
          pricePerUnit: 480,
          totalValue: 5760,
        },
      ];
      console.log('Setting mock data:', mockData);
      setAssets(mockData);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Call fetchAssets on mount
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const getAssetById = useCallback(
    (id: string) => {
      return assets.find((asset) => asset.id === id);
    },
    [assets],
  );

  const placeOrder = useCallback(async (order: Order): Promise<boolean> => {
    try {
      // TODO: Replace with actual blockchain transaction
      console.log('Placing order:', order);
      return true;
    } catch (error) {
      console.error('Error placing order:', error);
      return false;
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedOrders = await getOrders();
      // Map to match local Order type
      const mappedOrders: Order[] = fetchedOrders.map((order) => ({
        ...order,
        deliveryLocation: '', // Add missing required field
      }));
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <TradeContext.Provider
      value={{
        assets,
        setAssets,
        fetchAssets,
        isLoading,
        getAssetById,
        placeOrder,
        orders,
        loadOrders,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
}

export function useTrade() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrade must be used within TradeProvider');
  }
  return context;
}
