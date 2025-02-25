'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface TokenizedAsset {
  id: string;
  nodeId: string;
  nodeName: string;
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

interface TradeContextType {
  assets: TokenizedAsset[];
  setAssets: (assets: TokenizedAsset[]) => void;
  fetchAssets: () => Promise<void>;
  isLoading: boolean;
}

const TradeContext = createContext<TradeContextType | null>(null);

export function useTradeProvider() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTradeProvider must be used within a TradeProvider');
  }
  return context;
}

export function TradeProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace this with actual blockchain call
      // Example: const assets = await contract.getTokenizedAssets();
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
      setAssets(mockData);
    } catch (error) {
      console.error('Error fetching tokenized assets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <TradeContext.Provider
      value={{ assets, setAssets, fetchAssets, isLoading }}
    >
      {children}
    </TradeContext.Provider>
  );
}
