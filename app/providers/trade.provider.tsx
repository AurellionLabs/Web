'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import {
  customerMakeOrder,
  getOrders,
} from '@/dapp-connectors/ausys-controller';
import { LocationContract } from '@/typechain-types';
import { loadAvailableAssets } from '@/dapp-connectors/aurum-controller';

export interface TokenizedAsset {
  id: string;
  nodeId: string;
  nodeName: string;
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

export interface TradeContextType {
  assets: TokenizedAsset[];
  setAssets: (assets: TokenizedAsset[]) => void;
  fetchAssets: () => Promise<void>;
  isLoading: boolean;
  getAssetById: (id: string) => TokenizedAsset | undefined;
  placeOrder: (order: LocationContract.OrderStructOutput) => Promise<boolean>;
  orders: LocationContract.OrderStructOutput[];
  loadOrders: () => Promise<void>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
  const [orders, setOrders] = useState<LocationContract.OrderStructOutput[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    console.log('fetchAssets called');
    setIsLoading(true);
    try {
      // Use getAllNodeAssets instead of loadAvailableAssets
      const nodeAssets = await getAllNodeAssets();

      // Transform the node assets to TokenizedAsset format
      const transformedAssets = nodeAssets.map((asset) => ({
        id: asset.id.toString(),
        nodeId: asset.nodeAddress || '',
        nodeName: asset.nodeName || 'Unknown Node',
        assetClass: asset.name,
        quantity: Number(asset.amount),
        pricePerUnit: Number(asset.price || 0),
        totalValue: Number(asset.amount) * Number(asset.price || 0),
      }));

      console.log('Setting transformed assets:', transformedAssets);
      setAssets(transformedAssets);
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

  const placeOrder = useCallback(
    async (order: LocationContract.OrderStructOutput): Promise<boolean> => {
      try {
        // TODO: Replace with actual blockchain transaction
        await customerMakeOrder(order);
        console.log('Placing order:', order);
        return true;
      } catch (error) {
        console.error('Error placing order:', error);
        return false;
      }
    },
    [],
  );

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedOrders = await getOrders();
      // Map to match local Order type
      setOrders(fetchedOrders);
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
