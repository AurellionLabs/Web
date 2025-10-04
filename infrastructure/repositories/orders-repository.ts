import { type IOrderRepository, Order } from '@/domain/orders/order';
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
  convertGraphJourneyToDomain,
  convertGraphOrderToDomain,
  JourneyGraphResponse,
  OrderGraphResponse,
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
   */
  async getNodeOrders(address: string): Promise<Order[]> {
    try {
      const response = await graphqlRequest<{ orders: OrderGraphResponse[] }>(
        this.graphQLEndpoint,
        GET_ORDERS_BY_NODE,
        { nodeAddress: address.toLowerCase() },
      );

      // Add null checks to prevent TypeError
      if (!response) {
        console.warn('GraphQL response is null/undefined for getNodeOrders');
        return [];
      }

      if (!response.orders) {
        console.warn(
          'GraphQL response.orders is null/undefined for getNodeOrders',
        );
        return [];
      }

      return response.orders.map((order: OrderGraphResponse) =>
        convertGraphOrderToDomain(order),
      );
    } catch (error) {
      console.error('Error fetching node orders from Graph:', error);
      // Fallback to empty array instead of on-chain iteration
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query instead of on-chain iteration
   */
  async getCustomerJourneys(address?: string): Promise<Journey[]> {
    try {
      if (!address) {
        address = await this.signer.getAddress();
      }

      const response = await graphqlRequest<{
        journeys: JourneyGraphResponse[];
      }>(this.graphQLEndpoint, GET_JOURNEYS_BY_SENDER, {
        senderAddress: address.toLowerCase(),
      });

      return response.journeys.map((journey: JourneyGraphResponse) =>
        convertGraphJourneyToDomain(journey),
      );
    } catch (error) {
      console.error('Error fetching customer journeys from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query instead of on-chain iteration
   */
  async getReceiverJourneys(address?: string): Promise<Journey[]> {
    try {
      if (!address) {
        address = await this.signer.getAddress();
      }

      const response = await graphqlRequest<{
        journeys: JourneyGraphResponse[];
      }>(this.graphQLEndpoint, GET_JOURNEYS_BY_RECEIVER, {
        receiverAddress: address.toLowerCase(),
      });

      return response.journeys.map((journey: JourneyGraphResponse) =>
        convertGraphJourneyToDomain(journey),
      );
    } catch (error) {
      console.error('Error fetching receiver journeys from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query with pagination
   */
  async fetchAllJourneys(): Promise<Journey[]> {
    try {
      const response = await graphqlRequest<{
        journeys: JourneyGraphResponse[];
      }>(
        this.graphQLEndpoint,
        GET_ALL_JOURNEYS,
        { first: 1000, skip: 0 }, // Can be made configurable
      );

      return response.journeys.map((journey: JourneyGraphResponse) =>
        convertGraphJourneyToDomain(journey),
      );
    } catch (error) {
      console.error('Error fetching all journeys from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query for single journey lookup
   */
  async getJourneyById(journeyId: BytesLike): Promise<Journey> {
    try {
      const response = await graphqlRequest<{
        journey: JourneyGraphResponse | null;
      }>(this.graphQLEndpoint, GET_JOURNEY_BY_ID, {
        journeyId: journeyId.toString(),
      });

      if (!response.journey) {
        throw new Error(`Journey ${journeyId} not found`);
      }

      return convertGraphJourneyToDomain(response.journey);
    } catch (error) {
      console.error('Error fetching journey by ID from Graph:', error);
      // Fallback to on-chain call for critical path
      await this.waitForInitialization();
      const contractJourney = await this.readContract.getjourney(journeyId);

      return {
        parcelData: contractJourney.parcelData,
        journeyId: contractJourney.journeyId,
        currentStatus: contractJourney.currentStatus,
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
   */
  async getBuyerOrders(address: string): Promise<Order[]> {
    try {
      const response = await graphqlRequest<{ orders: OrderGraphResponse[] }>(
        this.graphQLEndpoint,
        GET_ORDERS_BY_BUYER,
        { buyerAddress: address.toLowerCase() },
      );

      // Add null checks to prevent TypeError
      if (!response) {
        console.warn('GraphQL response is null/undefined for getBuyerOrders');
        return [];
      }

      if (!response.orders) {
        console.warn(
          'GraphQL response.orders is null/undefined for getBuyerOrders',
        );
        return [];
      }

      return response.orders.map((order: OrderGraphResponse) =>
        convertGraphOrderToDomain(order),
      );
    } catch (error) {
      console.error('Error fetching buyer orders from Graph:', error);
      return [];
    }
  }

  /**
   * NEW: Uses GraphQL query for seller orders
   */
  async getSellerOrders(address: string): Promise<Order[]> {
    try {
      const response = await graphqlRequest<{ orders: OrderGraphResponse[] }>(
        this.graphQLEndpoint,
        GET_ORDERS_BY_SELLER,
        { sellerAddress: address.toLowerCase() },
      );

      // Add null checks to prevent TypeError
      if (!response) {
        console.warn('GraphQL response is null/undefined for getSellerOrders');
        return [];
      }

      if (!response.orders) {
        console.warn(
          'GraphQL response.orders is null/undefined for getSellerOrders',
        );
        return [];
      }

      return response.orders.map((order: OrderGraphResponse) =>
        convertGraphOrderToDomain(order),
      );
    } catch (error) {
      console.error('Error fetching seller orders from Graph:', error);
      return [];
    }
  }

  /**
   * REFACTORED: Uses GraphQL query for single order lookup
   */
  async getOrderById(orderId: BytesLike): Promise<Order> {
    try {
      const response = await graphqlRequest<{
        order: OrderGraphResponse | null;
      }>(this.graphQLEndpoint, GET_ORDER_BY_ID, {
        orderId: orderId.toString(),
      });

      if (!response.order) {
        throw new Error(`Order ${orderId} not found`);
      }

      return convertGraphOrderToDomain(response.order);
    } catch (error) {
      console.error('Error fetching order by ID from Graph:', error);
      // Fallback to on-chain call for critical path
      await this.waitForInitialization();
      const contractOrder = await this.readContract.getOrder(orderId);

      return {
        id: contractOrder.id,
        token: contractOrder.token,
        tokenId: String(contractOrder.tokenId),
        tokenQuantity: String(contractOrder.tokenQuantity),
        price: String(contractOrder.price),
        txFee: String(contractOrder.txFee),
        buyer: contractOrder.buyer,
        seller: contractOrder.seller,
        journeyIds: contractOrder.journeyIds,
        nodes: contractOrder.nodes,
        locationData: contractOrder.locationData,
        currentStatus: String(contractOrder.currentStatus),
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
