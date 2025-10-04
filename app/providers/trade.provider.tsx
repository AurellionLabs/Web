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
    console.log('[TradeProvider] loadOrders called');
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrders = await orderRepository.getBuyerOrders(
        address as string,
      );
      console.log(`[TradeProvider] Fetched ${fetchedOrders.length} orders`);
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

        console.log('[TradeProvider] Placing order:', orderWithBuyer);

        // Create the order using the centralized service
        const actualOrderId = await orderService.createOrder(orderWithBuyer);
        console.log(`[TradeProvider] Order created with ID: ${actualOrderId}`);

        // Create the initial journey for the order
        if (orderWithBuyer.nodes && orderWithBuyer.nodes.length > 0) {
          const firstNodeAddress = String(orderWithBuyer.nodes[0]);

          // Formula: bounty = (price * quantity * 0.05)
          const bountyPercentage = 2;
          const totalOrderValue = BigInt(orderWithBuyer.price);
          const bounty =
            (totalOrderValue * BigInt(bountyPercentage)) / BigInt(100);

          // TODO: For the first journey, the receiver should be the next node in the chain
          // If there's only one node, we'll need to handle this differently
          // For now, let's use the same node as receiver (this might need adjustment based on business logic)
          const receiverNodeAddress =
            orderWithBuyer.nodes.length > 1
              ? orderWithBuyer.nodes[1]
              : firstNodeAddress; // Use same node if only one node in chain

          await orderService.createOrderJourney(
            actualOrderId,
            firstNodeAddress,
            receiverNodeAddress,
            orderWithBuyer.locationData,
            bounty,
            BigInt(Date.now() + 24 * 60 * 60 * 1000), // ETA (24 hours from now)
            BigInt(orderWithBuyer.tokenQuantity),
            BigInt(orderWithBuyer.tokenId),
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
