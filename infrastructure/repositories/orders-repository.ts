import {
  type IOrderRepository,
  Order,
  OrderStatus,
} from '@/domain/orders/order';
import { Ausys } from '@/typechain-types/contracts/AuSys.sol/Ausys';
import { Ausys__factory } from '@/typechain-types/factories/contracts/AuSys.sol/Ausys__factory';
import {
  type BrowserProvider,
  type Signer,
  ethers,
  type BytesLike,
  Provider,
} from 'ethers';
import { handleContractError } from '@/utils/error-handler';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { Journey } from '@/domain/shared';
import { graphqlRequest } from './shared/graph';
import {
  GET_JOURNEYS_BY_SENDER,
  GET_JOURNEYS_BY_RECEIVER,
  GET_JOURNEY_BY_ID,
  GET_ALL_JOURNEYS,
  GET_ORDERS_BY_BUYER,
  GET_ORDERS_BY_SELLER,
  GET_ORDER_BY_ID,
  GET_ORDERS_BY_NODE,
  GET_JOURNEYS_BY_ORDER_ID,
  convertGraphJourneyToDomain,
  convertGraphOrderToDomain,
  convertNumericToOrderStatus,
  convertNumericToJourneyStatus,
  JourneyGraphResponse,
  OrderGraphResponse,
  extractPonderItems,
} from '../shared/graph-queries';

/**
 * Infrastructure implementation of the IOrderRepository interface - REFACTORED
 * Uses The Graph for all read operations instead of on-chain iteration
 */
export class OrderRepository implements IOrderRepository {
  private readContract: Ausys;
  private writeContract: Ausys;
  private userProvider: BrowserProvider;
  private readProvider: Provider;
  private signer: Signer;
  private contractAddress: string;
  private isInitialized = false;
  private graphQLEndpoint =
    'https://api.studio.thegraph.com/query/112596/ausys-base-sepolia/version/latest';

  constructor(contract: Ausys, userProvider: BrowserProvider, signer: Signer) {
    if (!contract) {
      throw new Error('OrderRepository: Ausys instance is required.');
    }
    this.writeContract = contract;
    this.userProvider = userProvider;
    this.signer = signer;
    this.contractAddress = contract.target as string;

    // Initialize with user provider as fallback
    this.readProvider = userProvider;
    this.readContract = contract;

    // Asynchronously initialize read provider using dedicated RPC
    this.initializeReadProvider();
  }

  private async initializeReadProvider(): Promise<void> {
    try {
      const chainId = await RpcProviderFactory.getChainId(
        this.userProvider as any,
      );
      const rpcProvider = RpcProviderFactory.getReadOnlyProvider(chainId);
      this.readProvider = rpcProvider;
      this.readContract = Ausys__factory.connect(
        this.contractAddress,
        rpcProvider,
      );
      this.isInitialized = true;
      console.log('[OrderRepository] Initialized with dedicated RPC provider');
    } catch (error) {
      console.warn(
        '[OrderRepository] Failed to initialize dedicated RPC provider, using user provider:',
        error,
      );
      this.isInitialized = true;
    }
  }

  private async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * REFACTORED: Uses GraphQL query instead of on-chain iteration
   * Updated for Ponder's response format
   */
  async getNodeOrders(address: string): Promise<Order[]> {
    try {
      // Ponder returns { orderss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        orderss: { items: OrderGraphResponse[] };
      }>(this.graphQLEndpoint, GET_ORDERS_BY_NODE, {
        nodeAddress: address.toLowerCase(),
      });

      // Add null checks to prevent TypeError
      if (!response) {
        console.warn('GraphQL response is null/undefined for getNodeOrders');
        return [];
      }

      const orders = extractPonderItems(response.orderss || { items: [] });
      if (orders.length === 0) {
        return [];
      }

      // Also fetch journey ids per order (subgraph exposes journeys by order relation)
      const results = await Promise.all(
        orders.map(async (order: OrderGraphResponse) => {
          try {
            console.log(
              '[OrderRepository] Fetching journeys for orderId:',
              order.id,
            );
            // Ponder returns { journeyss: { items: [...] } }
            const jRes = await graphqlRequest<{
              journeyss: { items: { id: string }[] };
            }>(this.graphQLEndpoint, GET_JOURNEYS_BY_ORDER_ID, {
              orderId: order.id,
            });
            console.log('[OrderRepository] Journeys response:', jRes);
            const mapped = convertGraphOrderToDomain(order);
            const journeyItems = extractPonderItems(
              jRes?.journeyss || { items: [] },
            );
            mapped.journeyIds = journeyItems.map((j) => j.id);
            console.log(
              '[OrderRepository] Mapped journeyIds:',
              mapped.journeyIds,
            );
            return mapped;
          } catch (e) {
            console.error(
              '[OrderRepository] Error fetching journeys for order:',
              order.id,
              e,
            );
            const mapped = convertGraphOrderToDomain(order);
            mapped.journeyIds = [];
            return mapped;
          }
        }),
      );
      return results;
    } catch (error) {
      console.error('Error fetching node orders from Graph:', error);
      // Fallback to empty array instead of on-chain iteration
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query instead of on-chain iteration
   * Updated for Ponder's response format
   */
  async getCustomerJourneys(address?: string): Promise<Journey[]> {
    try {
      if (!address) {
        address = await this.signer.getAddress();
      }

      // Ponder returns { journeyss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        journeyss: { items: JourneyGraphResponse[] };
      }>(this.graphQLEndpoint, GET_JOURNEYS_BY_SENDER, {
        senderAddress: address.toLowerCase(),
      });

      const journeys = extractPonderItems(response.journeyss || { items: [] });
      return journeys.map((journey: JourneyGraphResponse) =>
        convertGraphJourneyToDomain(journey),
      );
    } catch (error) {
      console.error('Error fetching customer journeys from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query instead of on-chain iteration
   * Updated for Ponder's response format
   */
  async getReceiverJourneys(address?: string): Promise<Journey[]> {
    try {
      if (!address) {
        address = await this.signer.getAddress();
      }

      // Ponder returns { journeyss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        journeyss: { items: JourneyGraphResponse[] };
      }>(this.graphQLEndpoint, GET_JOURNEYS_BY_RECEIVER, {
        receiverAddress: address.toLowerCase(),
      });

      const journeys = extractPonderItems(response.journeyss || { items: [] });
      return journeys.map((journey: JourneyGraphResponse) =>
        convertGraphJourneyToDomain(journey),
      );
    } catch (error) {
      console.error('Error fetching receiver journeys from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query with pagination
   * Updated for Ponder's response format
   */
  async fetchAllJourneys(): Promise<Journey[]> {
    try {
      // Ponder returns { journeyss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        journeyss: { items: JourneyGraphResponse[] };
      }>(
        this.graphQLEndpoint,
        GET_ALL_JOURNEYS,
        { first: 1000, skip: 0 }, // Can be made configurable
      );

      const journeys = extractPonderItems(response.journeyss || { items: [] });
      return journeys.map((journey: JourneyGraphResponse) =>
        convertGraphJourneyToDomain(journey),
      );
    } catch (error) {
      console.error('Error fetching all journeys from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query for single journey lookup
   * Updated for Ponder's response format (single entity returns directly)
   */
  async getJourneyById(journeyId: BytesLike): Promise<Journey> {
    try {
      // Ponder returns single entity directly for singular queries
      const response = await graphqlRequest<{
        journeys: JourneyGraphResponse | null;
      }>(this.graphQLEndpoint, GET_JOURNEY_BY_ID, {
        journeyId: journeyId.toString(),
      });

      if (!response.journeys) {
        throw new Error(`Journey ${journeyId} not found`);
      }

      return convertGraphJourneyToDomain(response.journeys);
    } catch (error) {
      console.error('Error fetching journey by ID from Graph:', error);
      // Fallback to on-chain call for critical path
      await this.waitForInitialization();
      const contractJourney = await this.readContract.getjourney(journeyId);

      return {
        parcelData: contractJourney.parcelData,
        journeyId: contractJourney.journeyId,
        currentStatus: convertNumericToJourneyStatus(
          contractJourney.currentStatus,
        ),
        sender: contractJourney.sender,
        receiver: contractJourney.receiver,
        driver: contractJourney.driver,
        journeyStart: contractJourney.journeyStart,
        journeyEnd: contractJourney.journeyEnd,
        bounty: contractJourney.bounty,
        ETA: contractJourney.ETA,
      };
    }
  }

  /**
   * Uses direct contract call (mapping lookup is efficient)
   */
  async getOrderIdByJourneyId(journeyId: BytesLike): Promise<BytesLike> {
    try {
      await this.waitForInitialization();
      return await this.readContract.journeyToOrderId(journeyId);
    } catch (error) {
      handleContractError(error, `get order ID for journey ${journeyId}`);
      throw error;
    }
  }

  /**
   * REFACTORED: Uses GraphQL query (renamed from getCustomerOrders to getBuyerOrders)
   * Updated for Ponder's response format
   */
  async getBuyerOrders(address: string): Promise<Order[]> {
    try {
      // Ponder returns { orderss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        orderss: { items: OrderGraphResponse[] };
      }>(this.graphQLEndpoint, GET_ORDERS_BY_BUYER, {
        buyerAddress: address.toLowerCase(),
      });

      // Add null checks to prevent TypeError
      if (!response) {
        console.warn('GraphQL response is null/undefined for getBuyerOrders');
        return [];
      }

      const orders = extractPonderItems(response.orderss || { items: [] });
      if (orders.length === 0) {
        return [];
      }

      // Also fetch journey ids per order (same as getNodeOrders)
      const results = await Promise.all(
        orders.map(async (order: OrderGraphResponse) => {
          try {
            console.log(
              '[OrderRepository] Fetching journeys for buyer orderId:',
              order.id,
            );
            // Ponder returns { journeyss: { items: [...] } }
            const jRes = await graphqlRequest<{
              journeyss: { items: { id: string }[] };
            }>(this.graphQLEndpoint, GET_JOURNEYS_BY_ORDER_ID, {
              orderId: order.id,
            });
            console.log('[OrderRepository] Journeys response:', jRes);
            const mapped = convertGraphOrderToDomain(order);
            const journeyItems = extractPonderItems(
              jRes?.journeyss || { items: [] },
            );
            mapped.journeyIds = journeyItems.map((j) => j.id);
            console.log(
              '[OrderRepository] Mapped journeyIds:',
              mapped.journeyIds,
            );
            return mapped;
          } catch (e) {
            console.error(
              '[OrderRepository] Error fetching journeys for buyer order:',
              order.id,
              e,
            );
            const mapped = convertGraphOrderToDomain(order);
            mapped.journeyIds = [];
            return mapped;
          }
        }),
      );
      return results;
    } catch (error) {
      console.error('Error fetching buyer orders from Graph:', error);
      return [];
    }
  }

  /**
   * NEW: Uses GraphQL query for seller orders
   * Updated for Ponder's response format
   */
  async getSellerOrders(address: string): Promise<Order[]> {
    try {
      // Ponder returns { orderss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        orderss: { items: OrderGraphResponse[] };
      }>(this.graphQLEndpoint, GET_ORDERS_BY_SELLER, {
        sellerAddress: address.toLowerCase(),
      });

      // Add null checks to prevent TypeError
      if (!response) {
        console.warn('GraphQL response is null/undefined for getSellerOrders');
        return [];
      }

      const orders = extractPonderItems(response.orderss || { items: [] });
      return orders.map((order: OrderGraphResponse) =>
        convertGraphOrderToDomain(order),
      );
    } catch (error) {
      console.error('Error fetching seller orders from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query for single order lookup
   * Updated for Ponder's response format (single entity returns directly)
   */
  async getOrderById(orderId: BytesLike): Promise<Order> {
    try {
      // Ponder returns single entity directly for singular queries
      const response = await graphqlRequest<{
        orders: OrderGraphResponse | null;
      }>(this.graphQLEndpoint, GET_ORDER_BY_ID, {
        orderId: orderId.toString(),
      });

      if (!response.orders) {
        throw new Error(`Order ${orderId} not found`);
      }

      return convertGraphOrderToDomain(response.orders);
    } catch (error) {
      console.error('Error fetching order by ID from Graph:', error);
      // Fallback to on-chain call for critical path
      await this.waitForInitialization();
      const contractOrder = await this.readContract.getOrder(orderId);

      return {
        id: contractOrder.id,
        token: contractOrder.token,
        tokenId: String(contractOrder.tokenId),
        tokenQuantity: String(contractOrder.tokenQuantity), // This is a count, not a USDT value
        price: ethers.formatUnits(contractOrder.price, 6), // USDT has 6 decimals
        txFee: ethers.formatUnits(contractOrder.txFee, 6), // USDT has 6 decimals
        buyer: contractOrder.buyer,
        seller: contractOrder.seller,
        journeyIds: contractOrder.journeyIds,
        nodes: contractOrder.nodes,
        locationData: contractOrder.locationData,
        currentStatus: convertNumericToOrderStatus(contractOrder.currentStatus),
        contractualAgreement: '', // Default empty string for now
      };
    }
  }

  /**
   * Placeholder for asset attributes (not stored in LocationContract)
   */
  async getAssetAttributes(
    assetName: string,
  ): Promise<{ assetName: string; attributes: any[] }> {
    console.warn(
      'getAssetAttributes: LocationContract does not store asset attribute data',
    );
    return {
      assetName,
      attributes: [],
    };
  }

  // =====================
  // LEGACY COMPATIBILITY METHODS
  // =====================

  /**
   * Legacy method - redirects to getBuyerOrders
   * @deprecated Use getBuyerOrders instead
   */
  async getCustomerOrders(address: string): Promise<Order[]> {
    console.warn('getCustomerOrders is deprecated, use getBuyerOrders instead');
    return this.getBuyerOrders(address);
  }
}
