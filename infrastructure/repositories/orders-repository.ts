import {
  type IOrderRepository,
  Order,
  OrderStatus,
} from '@/domain/orders/order';
import { Ausys__factory, type Ausys } from '@/lib/contracts';
import {
  type BrowserProvider,
  type Signer,
  ethers,
  type BytesLike,
  Provider,
} from 'ethers';
import { handleContractError } from '@/utils/error-handler';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
import { Journey, JourneyStatus, ParcelData, Location } from '@/domain/shared';
import { graphqlRequest } from './shared/graph';
import {
  GET_UNIFIED_ORDER_BY_BUYER,
  GET_UNIFIED_ORDER_BY_SELLER,
  GET_LOGISTICS_ORDER_CREATED_EVENTS,
  GET_JOURNEY_STATUS_BY_JOURNEY,
  GET_ALL_UNIFIED_ORDER_EVENTS,
  GET_JOURNEY_STATUS_UPDATED_EVENTS,
} from '../shared/graph-queries';
import {
  aggregateUnifiedOrders,
  aggregateJourneys,
} from '../shared/event-aggregators';
import {
  AggregatedUnifiedOrder,
  AggregatedJourney,
  UnifiedOrderCreatedEvent,
  LogisticsOrderCreatedEvent,
  JourneyStatusUpdatedEvent,
} from '../shared/indexer-types';
import { NEXT_PUBLIC_AUSYS_SUBGRAPH_URL } from '@/chain-constants';

interface GraphQLResponse<T> {
  items: T[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

interface JourneyEventsResponse {
  diamondJourneyStatusUpdatedEventss: GraphQLResponse<JourneyStatusUpdatedEvent>;
}

interface LogisticsEventsResponse {
  diamondLogisticsOrderCreatedEventss: GraphQLResponse<LogisticsOrderCreatedEvent>;
}

interface UnifiedOrderEventsResponse {
  diamondUnifiedOrderCreatedEventss: GraphQLResponse<UnifiedOrderCreatedEvent>;
}

function buildLocation(lat?: string, lng?: string): Location | undefined {
  if (!lat || !lng || lat === '' || lng === '') return undefined;
  return { lat, lng };
}

function buildParcelData(
  _journey: AggregatedJourney,
  _logistics?: LogisticsOrderCreatedEvent,
): ParcelData {
  return {
    startLocation: { lat: '', lng: '' },
    endLocation: { lat: '', lng: '' },
    startName: '',
    endName: '',
  };
}

function phaseToJourneyStatus(phase: string | number): JourneyStatus {
  const phaseNum = typeof phase === 'string' ? parseInt(phase, 10) : phase;
  switch (phaseNum) {
    case 0:
      return JourneyStatus.PENDING;
    case 1:
      return JourneyStatus.IN_TRANSIT;
    case 2:
      return JourneyStatus.DELIVERED;
    case 3:
      return JourneyStatus.CANCELLED;
    default:
      return JourneyStatus.PENDING;
  }
}

function aggregatedUnifiedOrderToDomain(
  order: AggregatedUnifiedOrder,
  _logistics?: LogisticsOrderCreatedEvent,
  _journey?: AggregatedJourney,
): Order {
  return {
    id: order.unifiedOrderId,
    token: order.token,
    tokenId: order.tokenId,
    tokenQuantity: order.quantity,
    price: order.price,
    txFee: '0',
    buyer: order.buyer,
    seller: order.seller,
    journeyIds: order.journeyIds,
    nodes: _logistics ? [_logistics.node] : [],
    locationData: undefined,
    currentStatus: mapOrderStatus(order.status),
    contractualAgreement: '',
  };
}

function mapOrderStatus(status: AggregatedUnifiedOrder['status']): OrderStatus {
  switch (status) {
    case 'settled':
      return OrderStatus.SETTLED;
    case 'cancelled':
      return OrderStatus.CANCELLED;
    case 'matched':
    case 'created':
      return OrderStatus.CREATED;
    default:
      return OrderStatus.CREATED;
  }
}

function aggregatedJourneyToDomain(
  journey: AggregatedJourney,
  _logistics?: LogisticsOrderCreatedEvent,
): Journey {
  return {
    journeyId: journey.journeyId,
    currentStatus: phaseToJourneyStatus(journey.phase),
    sender: '',
    receiver: '',
    driver: '',
    bounty: BigInt(journey.bounty || '0'),
    journeyStart: BigInt(journey.createdAt),
    journeyEnd: BigInt(journey.updatedAt),
    ETA: BigInt(journey.updatedAt),
    parcelData: {
      startLocation: { lat: '', lng: '' },
      endLocation: { lat: '', lng: '' },
      startName: '',
      endName: '',
    },
  };
}

/**
 * Infrastructure implementation of the IOrderRepository interface
 * Uses Ponder indexer with raw event tables and aggregation
 */
export class OrderRepository implements IOrderRepository {
  private readContract: Ausys;
  private writeContract: Ausys;
  private userProvider: BrowserProvider;
  private readProvider: Provider;
  private signer: Signer;
  private contractAddress: string;
  private isInitialized = false;
  private graphQLEndpoint = NEXT_PUBLIC_AUSYS_SUBGRAPH_URL;

  constructor(contract: Ausys, userProvider: BrowserProvider, signer: Signer) {
    if (!contract) {
      throw new Error('OrderRepository: Ausys instance is required.');
    }
    this.writeContract = contract;
    this.userProvider = userProvider;
    this.signer = signer;
    this.contractAddress = contract.target as string;

    this.readProvider = userProvider;
    this.readContract = contract;

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

  async getNodeOrders(address: string): Promise<Order[]> {
    try {
      const nodeAddress = address.toLowerCase();

      const [orderResponse, logisticsResponse] = await Promise.all([
        graphqlRequest<UnifiedOrderEventsResponse>(
          this.graphQLEndpoint,
          GET_ALL_UNIFIED_ORDER_EVENTS,
          { limit: 500 },
        ),
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 500 },
        ),
      ]);

      const orders = aggregateUnifiedOrders({
        created: orderResponse.diamondUnifiedOrderCreatedEventss?.items || [],
        logistics:
          logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyUpdates: [],
        settled: [],
      });

      const nodeOrders = orders.filter((order) =>
        order.journeyIds.some((jid) => jid.toLowerCase() === nodeAddress),
      );

      const logisticsByOrder = new Map(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items.map(
          (l) => [l.unified_order_id.toLowerCase(), l],
        ) || [],
      );

      return nodeOrders.map((order) => {
        const logistics = logisticsByOrder.get(
          order.unifiedOrderId.toLowerCase(),
        );
        return aggregatedUnifiedOrderToDomain(order, logistics);
      });
    } catch (error) {
      console.error('[OrderRepository] Error fetching node orders:', error);
      return [];
    }
  }

  async getCustomerJourneys(address?: string): Promise<Journey[]> {
    try {
      if (!address) {
        address = await this.signer.getAddress();
      }
      const senderAddress = address.toLowerCase();

      const [logisticsResponse, journeyResponse] = await Promise.all([
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 500 },
        ),
        graphqlRequest<JourneyEventsResponse>(
          this.graphQLEndpoint,
          GET_JOURNEY_STATUS_UPDATED_EVENTS,
          { limit: 500 },
        ),
      ]);

      const journeys = aggregateJourneys(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyResponse.diamondJourneyStatusUpdatedEventss?.items || [],
      );

      const logisticsByJourney = new Map(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items.map(
          (l) => [l.journey_ids.toLowerCase(), l],
        ) || [],
      );

      return journeys.map((journey) => {
        const logistics = logisticsByJourney.get(
          journey.journeyId.toLowerCase(),
        );
        return aggregatedJourneyToDomain(journey, logistics);
      });
    } catch (error) {
      console.error(
        '[OrderRepository] Error fetching customer journeys:',
        error,
      );
      return [];
    }
  }

  async getReceiverJourneys(address?: string): Promise<Journey[]> {
    try {
      if (!address) {
        address = await this.signer.getAddress();
      }
      const receiverAddress = address.toLowerCase();

      const [logisticsResponse, journeyResponse] = await Promise.all([
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 500 },
        ),
        graphqlRequest<JourneyEventsResponse>(
          this.graphQLEndpoint,
          GET_JOURNEY_STATUS_UPDATED_EVENTS,
          { limit: 500 },
        ),
      ]);

      const journeys = aggregateJourneys(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyResponse.diamondJourneyStatusUpdatedEventss?.items || [],
      );

      const logisticsByJourney = new Map(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items.map(
          (l) => [l.journey_ids.toLowerCase(), l],
        ) || [],
      );

      return journeys.map((journey) => {
        const logistics = logisticsByJourney.get(
          journey.journeyId.toLowerCase(),
        );
        return aggregatedJourneyToDomain(journey, logistics);
      });
    } catch (error) {
      console.error(
        '[OrderRepository] Error fetching receiver journeys:',
        error,
      );
      return [];
    }
  }

  async fetchAllJourneys(): Promise<Journey[]> {
    try {
      const [logisticsResponse, journeyResponse] = await Promise.all([
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 1000 },
        ),
        graphqlRequest<JourneyEventsResponse>(
          this.graphQLEndpoint,
          GET_JOURNEY_STATUS_UPDATED_EVENTS,
          { limit: 1000 },
        ),
      ]);

      const journeys = aggregateJourneys(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyResponse.diamondJourneyStatusUpdatedEventss?.items || [],
      );

      const logisticsByJourney = new Map(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items.map(
          (l) => [l.journey_ids.toLowerCase(), l],
        ) || [],
      );

      return journeys.map((journey) => {
        const logistics = logisticsByJourney.get(
          journey.journeyId.toLowerCase(),
        );
        return aggregatedJourneyToDomain(journey, logistics);
      });
    } catch (error) {
      console.error('[OrderRepository] Error fetching all journeys:', error);
      return [];
    }
  }

  async getJourneyById(journeyId: BytesLike): Promise<Journey> {
    try {
      const journeyIdStr = journeyId.toString();

      const [logisticsResponse, journeyStatusResponse] = await Promise.all([
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          `query GetLogisticsByJourneyId($journeyId: String!) {
            diamondLogisticsOrderCreatedEventss(where: { journeyIds: $journeyId }, limit: 1) {
              items {
                id
                unifiedOrderId
                ausysOrderId
                journeyIds
                bounty
                node
                blockTimestamp
                transactionHash
              }
            }
          }`,
          { journeyId: journeyIdStr },
        ),
        graphqlRequest<JourneyEventsResponse>(
          this.graphQLEndpoint,
          GET_JOURNEY_STATUS_BY_JOURNEY,
          { journeyId: journeyIdStr },
        ),
      ]);

      const logistics =
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items[0];
      const journeyStatus =
        journeyStatusResponse.diamondJourneyStatusUpdatedEventss?.items[0];

      if (!logistics) {
        throw new Error(`Journey ${journeyId} not found`);
      }

      const aggregatedJourney: AggregatedJourney = {
        journeyId: logistics.journeyIds,
        unifiedOrderId: logistics.unifiedOrderId,
        ausysOrderId: logistics.ausysOrderId,
        bounty: logistics.bounty,
        node: logistics.node,
        phase: journeyStatus?.phase || '0',
        createdAt: logistics.blockTimestamp,
        updatedAt: journeyStatus?.blockTimestamp || logistics.blockTimestamp,
      };

      return aggregatedJourneyToDomain(aggregatedJourney, logistics);
    } catch (error) {
      console.error('[OrderRepository] Error fetching journey by ID:', error);
      await this.waitForInitialization();
      const contractJourney = await this.readContract.getjourney(journeyId);

      return {
        parcelData: contractJourney.parcelData,
        journeyId: contractJourney.journeyId,
        currentStatus: phaseToJourneyStatus(contractJourney.currentStatus),
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

  async getOrderIdByJourneyId(journeyId: BytesLike): Promise<BytesLike> {
    try {
      await this.waitForInitialization();
      return await this.readContract.journeyToOrderId(journeyId);
    } catch (error) {
      handleContractError(error, `get order ID for journey ${journeyId}`);
      throw error;
    }
  }

  async getBuyerOrders(address: string): Promise<Order[]> {
    try {
      const buyerAddress = address.toLowerCase();

      const [orderResponse, logisticsResponse] = await Promise.all([
        graphqlRequest<UnifiedOrderEventsResponse>(
          this.graphQLEndpoint,
          GET_UNIFIED_ORDER_BY_BUYER,
          { buyer: buyerAddress, limit: 100 },
        ),
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 500 },
        ),
      ]);

      const orders = aggregateUnifiedOrders({
        created: orderResponse.diamondUnifiedOrderCreatedEventss?.items || [],
        logistics:
          logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyUpdates: [],
        settled: [],
      });

      const logisticsByOrder = new Map(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items.map(
          (l) => [l.unified_order_id.toLowerCase(), l],
        ) || [],
      );

      return orders.map((order) => {
        const logistics = logisticsByOrder.get(
          order.unifiedOrderId.toLowerCase(),
        );
        return aggregatedUnifiedOrderToDomain(order, logistics);
      });
    } catch (error) {
      console.error('[OrderRepository] Error fetching buyer orders:', error);
      return [];
    }
  }

  async getSellerOrders(address: string): Promise<Order[]> {
    try {
      const sellerAddress = address.toLowerCase();

      const [orderResponse, logisticsResponse] = await Promise.all([
        graphqlRequest<UnifiedOrderEventsResponse>(
          this.graphQLEndpoint,
          GET_UNIFIED_ORDER_BY_SELLER,
          { seller: sellerAddress, limit: 100 },
        ),
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 500 },
        ),
      ]);

      const orders = aggregateUnifiedOrders({
        created: orderResponse.diamondUnifiedOrderCreatedEventss?.items || [],
        logistics:
          logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyUpdates: [],
        settled: [],
      });

      const logisticsByOrder = new Map(
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items.map(
          (l) => [l.unified_order_id.toLowerCase(), l],
        ) || [],
      );

      return orders.map((order) => {
        const logistics = logisticsByOrder.get(
          order.unifiedOrderId.toLowerCase(),
        );
        return aggregatedUnifiedOrderToDomain(order, logistics);
      });
    } catch (error) {
      console.error('[OrderRepository] Error fetching seller orders:', error);
      return [];
    }
  }

  async getOrderById(orderId: BytesLike): Promise<Order> {
    try {
      const orderIdStr = orderId.toString();

      const [orderResponse, logisticsResponse] = await Promise.all([
        graphqlRequest<UnifiedOrderEventsResponse>(
          this.graphQLEndpoint,
          `query GetOrderById($orderId: String!) {
            diamondUnifiedOrderCreatedEventss(where: { unifiedOrderId: $orderId }, limit: 1) {
              items {
                id
                unifiedOrderId
                clobOrderId
                buyer
                seller
                token
                tokenId
                quantity
                price
                blockNumber
                blockTimestamp
                transactionHash
              }
            }
          }`,
          { orderId: orderIdStr },
        ),
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          `query GetLogisticsByOrderId($orderId: String!) {
            diamondLogisticsOrderCreatedEventss(where: { unifiedOrderId: $orderId }, limit: 1) {
              items {
                id
                unifiedOrderId
                ausysOrderId
                journeyIds
                bounty
                node
                blockTimestamp
              }
            }
          }`,
          { orderId: orderIdStr },
        ),
      ]);

      const order = orderResponse.diamondUnifiedOrderCreatedEventss?.items[0];
      const logistics =
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items[0];

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      const aggregatedOrders = aggregateUnifiedOrders({
        created: [order],
        logistics: logistics ? [logistics] : [],
        journeyUpdates: [],
        settled: [],
      });

      const aggregatedOrder = aggregatedOrders[0];
      if (!aggregatedOrder) {
        throw new Error(`Failed to aggregate order ${orderId}`);
      }

      return aggregatedUnifiedOrderToDomain(aggregatedOrder, logistics);
    } catch (error) {
      console.error('[OrderRepository] Error fetching order by ID:', error);
      await this.waitForInitialization();
      const contractOrder = await this.readContract.getOrder(orderId);

      return {
        id: contractOrder.id,
        token: contractOrder.token,
        tokenId: String(contractOrder.tokenId),
        tokenQuantity: String(contractOrder.tokenQuantity),
        price: ethers.formatUnits(contractOrder.price, 6),
        txFee: ethers.formatUnits(contractOrder.txFee, 6),
        buyer: contractOrder.buyer,
        seller: contractOrder.seller,
        journeyIds: contractOrder.journeyIds,
        nodes: contractOrder.nodes,
        locationData: contractOrder.locationData,
        currentStatus: mapOrderStatus(
          contractOrder.currentStatus === 3n
            ? 'cancelled'
            : contractOrder.currentStatus === 2n
              ? 'settled'
              : 'created',
        ),
        contractualAgreement: '',
      };
    }
  }

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

  async getCustomerOrders(address: string): Promise<Order[]> {
    console.warn('getCustomerOrders is deprecated, use getBuyerOrders instead');
    return this.getBuyerOrders(address);
  }
}
