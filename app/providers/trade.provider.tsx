'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { useNode } from '@/app/providers/node.provider';
import {
  customerMakeOrder,
  getOrders,
} from '@/dapp-connectors/ausys-controller';
import { LocationContract } from '@/typechain-types';
import { ethers } from 'ethers';
import { getWalletAddress } from '@/dapp-connectors/base-controller';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';

export interface TokenizedAsset {
  id: string;
  nodeId: string;
  nodeLocation: {
    addressName: string;
    location: {
      lat: string;
      lng: string;
    };
  };
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
  placeOrder: (orderData: LocationContract.OrderStruct) => Promise<boolean>;
  orders: LocationContract.OrderStruct[];
  loadOrders: () => Promise<void>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
  const [orders, setOrders] = useState<LocationContract.OrderStruct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAllNodeAssets } = useNode();

  const fetchAssets = useCallback(async () => {
    console.log('fetchAssets called');
    setIsLoading(true);
    setError(null);

    try {
      const nodeAssets = await getAllNodeAssets();
      console.log(`Retrieved ${nodeAssets.length} assets`);

      if (nodeAssets.length === 0) {
        console.log('No assets available for trading');
        setAssets([]);
        return;
      }

      // Process assets to include price information
      const processedAssets = nodeAssets.map((asset) => {
        // Use nullish coalescing to ensure we have a string before parsing
        const priceInDollars = parseFloat(asset.price ?? '0');

        return {
          id: asset.id.toString(),
          quantity: parseInt(asset.amount ?? '0'),
          pricePerUnit: priceInDollars,
          totalValue: priceInDollars * parseInt(asset.amount ?? '0'),
          nodeId: asset.nodeAddress ?? '',
          nodeLocation: asset.nodeLocation,
          assetClass: asset.name ?? 'Unknown Asset',
        };
      });

      setAssets(processedAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
      setError('No assets available for trading. Please try again later.');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAllNodeAssets]);

  // Call fetchAssets on mount
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const getAssetById = useCallback(
    (nodeId: string) => {
      return assets.find((asset) => asset.nodeId === nodeId);
    },
    [assets],
  );

  const placeOrder = useCallback(async (orderData: any): Promise<boolean> => {
    try {
      // Ensure wallet is connected
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        console.error('Wallet not connected');
        return false;
      }

      // Log more details for debugging
      console.log('Wallet address:', walletAddress);
      console.log('Token address:', NEXT_PUBLIC_AURA_GOAT_ADDRESS);
      console.log('Order data:', orderData);

      // Generate a proper BytesLike ID (32 bytes)
      // Use ethers.js to properly format the ID as bytes32
      const randomId = Math.floor(Math.random() * 1000000).toString(16);
      const paddedId = randomId.padStart(64, '0'); // Pad to 32 bytes (64 hex chars)
      const bytesLikeId = '0x' + paddedId;

      // Map UI order to blockchain OrderStruct
      const blockchainOrder: LocationContract.OrderStruct = {
        id: bytesLikeId, // Properly formatted bytes32 value
        token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        tokenId: BigInt(orderData.id),
        tokenQuantity: BigInt(orderData.quantity),
        requestedTokenQuantity: BigInt(orderData.quantity),
        price: BigInt(Math.floor(orderData.pricePerUnit * orderData.quantity)),
        txFee: BigInt(0),
        customer: walletAddress,
        journeyIds: [],
        nodes: [ethers.getAddress(orderData.nodeId)], // Ensure nodeId is a valid Ethereum address
        locationData: {
          startLocation: orderData.nodeLocation,
          endLocation: orderData.deliveryCoordinates || {
            lat: '40.7128',
            lng: '-74.0060',
          },
          startName: 'Los Angeles, CA',
          endName: orderData.deliveryLocation || 'New York',
        },
        currentStatus: BigInt(0),
        contracatualAgreement: '0x' + '1'.padStart(64, '0'), // Also properly formatted
      };

      console.log('Placing order with data:', blockchainOrder);

      // Check if provider is properly configured
      try {
        // Attempt to make the order using direct import
        await customerMakeOrder(blockchainOrder);
        console.log('Order placed successfully');
        return true;
      } catch (contractError: any) {
        console.error('Contract interaction error:', contractError);

        // Check for specific error types
        if (contractError.code === 'UNCONFIGURED_NAME') {
          console.error(
            'Network configuration error. Please check your wallet connection.',
          );
        } else if (contractError.code === 'INVALID_ARGUMENT') {
          console.error(
            'Invalid argument format. Check the data types being passed to the contract.',
          );
        }

        throw new Error(
          `Failed to make customer order: ${contractError.message}`,
        );
      }
    } catch (error) {
      console.error('Error placing order:', error);
      return false;
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use direct import
      const fetchedOrders = await getOrders();
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
  if (context === undefined) {
    throw new Error('useTrade must be used within a TradeProvider');
  }
  return context;
}
