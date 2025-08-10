'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { LocationContract } from '@/typechain-types';
import { ethers } from 'ethers';
import { NEXT_PUBLIC_AURA_GOAT_ADDRESS } from '@/chain-constants';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { ServiceContext } from '@/infrastructure/contexts/service-context';
import { handleContractError } from '@/utils/error-handler';
import { TokenizedAsset } from '@/domain/node';

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
  assetClass: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

export interface TradeContextType {
  assets: TokenizedAssetUI[];
  setAssets: (assets: TokenizedAssetUI[]) => void;
  fetchAssets: () => Promise<void>;
  isLoading: boolean;
  getAssetById: (id: string) => TokenizedAssetUI | undefined;
  placeOrder: (orderData: any) => Promise<boolean>;
  orders: LocationContract.OrderStructOutput[];
  loadOrders: () => Promise<void>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<TokenizedAssetUI[]>([]);
  const [orders, setOrders] = useState<LocationContract.OrderStructOutput[]>(
    [],
  );
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
            assetClass: asset.name ?? 'Unknown Asset',
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
    (nodeId: string) => {
      return assets.find((asset) => asset.nodeId === nodeId);
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
    async (orderData: any): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const signer = repositoryContext.getSigner();
        const walletAddress = await signer.getAddress();
        if (!walletAddress) {
          throw new Error('Wallet not connected or address unavailable.');
        }

        console.log('[TradeProvider] Wallet address:', walletAddress);
        console.log(
          '[TradeProvider] Token address:',
          NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        );
        console.log('[TradeProvider] Raw Order data from UI:', orderData);

        const randomBytes = ethers.randomBytes(32);
        const bytesLikeId = ethers.hexlify(randomBytes);

        const assetId = orderData.id;
        const quantity = orderData.quantity;
        const pricePerUnit = orderData.pricePerUnit;
        const nodeId = orderData.nodeId;
        const nodeLocation = orderData.nodeLocation?.location;
        const deliveryCoordinates = orderData.deliveryCoordinates || {
          lat: '0',
          lng: '0',
        };
        const deliveryLocationName =
          orderData.deliveryLocation || 'Default Delivery Location';

        if (
          !assetId ||
          !quantity ||
          pricePerUnit === undefined ||
          !nodeId ||
          !nodeLocation
        ) {
          console.error('[TradeProvider] Missing fields:', {
            assetId,
            quantity,
            pricePerUnit,
            nodeId,
            nodeLocation,
          });
          throw new Error(
            'Missing required order data fields (assetId, quantity, price, nodeId, nodeLocation).',
          );
        }

        const blockchainOrder: LocationContract.OrderStruct = {
          id: bytesLikeId,
          token: NEXT_PUBLIC_AURA_GOAT_ADDRESS,
          tokenId: BigInt(assetId),
          tokenQuantity: BigInt(quantity),
          requestedTokenQuantity: BigInt(quantity),
          price:
            ethers.parseUnits(pricePerUnit.toFixed(18), 18) * BigInt(quantity),
          txFee: BigInt(0),
          customer: walletAddress,
          journeyIds: [],
          nodes: [ethers.getAddress(nodeId)],
          locationData: {
            startLocation: {
              lat: nodeLocation.lat,
              lng: nodeLocation.lng,
            },
            endLocation: {
              lat: deliveryCoordinates.lat,
              lng: deliveryCoordinates.lng,
            },
            startName: orderData.nodeLocation?.addressName ?? 'Origin Node',
            endName: deliveryLocationName,
          },
          currentStatus: BigInt(0),
          contracatualAgreement: ethers.ZeroHash,
        };

        console.log(
          '[TradeProvider] Constructed blockchainOrder:',
          JSON.stringify(blockchainOrder, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        );
        console.log(
          `[TradeProvider] blockchainOrder.id used for creation: ${blockchainOrder.id}`,
        );

        console.log(
          '[TradeProvider] Placing order with data:',
          JSON.stringify(blockchainOrder, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        );

        const actualOrderId = await orderService.createOrder(blockchainOrder);
        console.log(
          `[TradeProvider] Actual Order ID from service: ${actualOrderId}`,
        );

        console.log(
          `[TradeProvider] Calling createOrderJourney with orderId: ${actualOrderId}, nodeId: ${nodeId}, assetId: ${assetId}`,
        );

        const receipt2 = await orderService.createOrderJourney(
          actualOrderId,
          nodeId,
          walletAddress,
          blockchainOrder.locationData,
          BigInt(0),
          BigInt(10000000000000),
          BigInt(quantity),
          assetId,
        );
        console.log(
          '[TradeProvider] Order placed successfully, tx receipt:',
          receipt2,
        );
        await loadOrders();
        setIsLoading(false);
        return true;
      } catch (err) {
        console.error('[TradeProvider] Error placing order:', err);
        setError('Failed to place order.');
        handleContractError(err, 'place order');
        setIsLoading(false);
        return false;
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
