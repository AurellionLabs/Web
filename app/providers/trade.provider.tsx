'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { handleContractError } from '@/utils/error-handler';
import { TokenizedAsset } from '@/domain/node';
import { Order } from '@/domain/orders';

export interface TokenizedAssetUI {
  id: string;
  nodeId: string;
  nodeLocation: {
    addressName: string;
    location: {
      lat: string;
      lng: string;
    };
  };
  assetName: string;
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  fileHash: string;
}

export interface TradeContextType {
  assets: TokenizedAssetUI[];
  setAssets: (assets: TokenizedAssetUI[]) => void;
  fetchAssets: () => Promise<void>;
  isLoading: boolean;
  getAssetById: (id: string) => TokenizedAssetUI | undefined;
  placeOrder: (orderData: Order) => Promise<boolean>;
  orders: Order[];
  loadOrders: () => Promise<void>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<TokenizedAssetUI[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repositoryContext = RepositoryContext.getInstance();
  const serviceContext = ServiceContext.getInstance();
  const nodeRepository = repositoryContext.getNodeRepository();
  const orderRepository = repositoryContext.getOrderRepository();
  const orderService = serviceContext.getOrderService();

  const fetchAssets = useCallback(async () => {
    console.log('[TradeProvider] fetchAssets called');
    setIsLoading(true);
    setError(null);

    try {
      const domainAssets = await nodeRepository.getAllNodeAssets();
      console.log(
        `[TradeProvider] Retrieved ${domainAssets.length} domain assets`,
      );

      if (domainAssets.length === 0) {
        console.log('[TradeProvider] No assets available for trading');
        setAssets([]);
        return;
      }

      const processedAssets: TokenizedAssetUI[] = domainAssets.map(
        (asset: TokenizedAsset) => {
          const pricePerUnit = parseFloat(asset.price ?? '0');
          const quantity = parseInt(asset.amount ?? '0', 10);

          return {
            id: asset.id.toString(),
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            totalValue: pricePerUnit * quantity,
            nodeId: asset.nodeAddress ?? '',
            nodeLocation: {
              addressName:
                asset.nodeLocation?.addressName ?? 'Unknown Location',
              location: {
                lat: asset.nodeLocation?.location?.lat ?? '0',
                lng: asset.nodeLocation?.location?.lng ?? '0',
              },
            },
            assetName: asset.name ?? 'Unknown Asset Name',
            assetClass: asset.class ?? 'Unknown Asset Class',
            fileHash: asset.fileHash ?? '',
          };
        },
      );

      setAssets(processedAssets);
    } catch (err) {
      console.error('[TradeProvider] Error loading assets:', err);
      setError('Failed to load assets. Please try again later.');
      setAssets([]);
      handleContractError(err, 'fetch assets');
    } finally {
      setIsLoading(false);
    }
  }, [nodeRepository]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const getAssetById = useCallback(
    (id: string) => {
      return assets.find((asset) => asset.id === id);
    },
    [assets],
  );

  const loadOrders = useCallback(async () => {
    console.log('[TradeProvider] loadOrders called');
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrders = await orderRepository.getCustomerOrders();
      console.log(`[TradeProvider] Fetched ${fetchedOrders.length} orders`);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('[TradeProvider] Error loading orders:', err);
      setError('Failed to load orders.');
      handleContractError(err, 'load orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderRepository]);

  const placeOrder = useCallback(
    async (orderData: Order): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const signer = repositoryContext.getSigner();
        const walletAddress = await signer.getAddress();

        if (!walletAddress) {
          throw new Error('Wallet not connected or address unavailable.');
        }

        // Ensure the customer address is set to the current wallet
        const orderWithCustomer: Order = {
          ...orderData,
          customer: walletAddress,
        };

        console.log('[TradeProvider] Placing order:', orderWithCustomer);

        // Create the order using the service
        const actualOrderId = await orderService.createOrder(orderWithCustomer);
        console.log(`[TradeProvider] Order created with ID: ${actualOrderId}`);

        // Create the initial journey for the order
        if (orderWithCustomer.nodes && orderWithCustomer.nodes.length > 0) {
          const firstNodeAddress = String(orderWithCustomer.nodes[0]);
          await orderService.createOrderJourney(
            actualOrderId,
            firstNodeAddress,
            walletAddress,
            orderWithCustomer.locationData,
            BigInt(0), // bounty
            BigInt(Date.now() + 24 * 60 * 60 * 1000), // ETA (24 hours from now)
            BigInt(orderWithCustomer.tokenQuantity),
            Number(orderWithCustomer.tokenId),
          );
          console.log('[TradeProvider] Initial journey created for order');
        }

        await loadOrders();
        return true;
      } catch (err) {
        console.error('[TradeProvider] Error placing order:', err);
        setError('Failed to place order.');
        handleContractError(err, 'place order');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [orderService, repositoryContext, loadOrders],
  );

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
