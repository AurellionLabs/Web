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
import { useWallet } from '@/hooks/useWallet';

export interface TokenizedAssetUI extends TokenizedAsset {
  // Additional UI-specific computed fields
  totalValue: number;
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
  const { address } = useWallet();
  const [assets, setAssets] = useState<TokenizedAssetUI[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repositoryContext = RepositoryContext.getInstance();
  const nodeRepository = repositoryContext.getNodeRepository();
  const orderRepository = repositoryContext.getOrderRepository();
  const orderService = ServiceContext.getInstance().getOrderService();

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const domainAssets = await nodeRepository.getAllNodeAssets();

      if (domainAssets.length === 0) {
        setAssets([]);
        return;
      }

      const processedAssets: TokenizedAssetUI[] = domainAssets.map(
        (asset: TokenizedAsset) => ({
          ...asset,
          // Add computed UI field
          totalValue:
            parseFloat(asset.price ?? '0') * parseInt(asset.capacity ?? '0'),
        }),
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
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrders = await orderRepository.getBuyerOrders(
        address as string,
      );
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('[TradeProvider] Error loading orders:', err);
      setError('Failed to load orders.');
      handleContractError(err, 'load orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderRepository, address]);

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

        // Ensure the buyer address is set to the current wallet
        const orderWithBuyer: Order = {
          ...orderData,
          buyer: walletAddress,
        };

        // Create the CLOB order - trade completes instantly
        // User receives ERC1155 token immediately, seller receives payment
        // Physical delivery is handled separately via the Redemption flow
        const actualOrderId = await orderService.createOrder(orderWithBuyer);

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
