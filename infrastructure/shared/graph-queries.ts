/**
 * GraphQL Queries for Raw Event Tables
 *
 * These queries fetch raw events from the Ponder indexer.
 * Aggregation is performed in the repository layer using event-aggregators.ts.
 *
 * Table naming convention: diamond_{event_name}_events (snake_case in DB)
 * GraphQL naming: camelCase (Ponder auto-converts)
 *
 * Query naming convention: diamondXxxEventss (note double 's' for list queries)
 */

import { gql } from 'graphql-request';
import {
  NodeRegisteredEvent,
  NodeDeactivatedEvent,
  UpdateLocationEvent,
  UpdateStatusEvent,
  SupportedAssetAddedEvent,
  OrderPlacedWithTokensEvent,
  CLOBOrderFilledEvent,
  CLOBOrderCancelledEvent,
  OrderExpiredEvent,
  UnifiedOrderCreatedEvent,
  LogisticsOrderCreatedEvent,
  JourneyStatusUpdatedEvent,
  OrderSettledEvent,
  RouterOrderPlacedEvent,
  CLOBTradeExecutedEvent,
  EventsGraphQLResponse,
} from './indexer-types';

// ============================================================================
// NODE EVENT QUERIES
// ============================================================================

export const GET_NODE_REGISTERED_EVENTS = gql`
  query GetNodeRegisteredEvents($limit: Int = 1000, $after: String) {
    diamondNodeRegisteredEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_NODE_REGISTERED_BY_OWNER = gql`
  query GetNodeRegisteredByOwner($owner: String!, $limit: Int = 100) {
    diamondNodeRegisteredEventss(
      where: { owner: $owner }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_NODE_DEACTIVATED_EVENTS = gql`
  query GetNodeDeactivatedEvents($limit: Int = 1000) {
    diamondNodeDeactivatedEventss(limit: $limit) {
      items {
        id
        node_hash
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_UPDATE_LOCATION_EVENTS = gql`
  query GetUpdateLocationEvents($limit: Int = 1000, $after: String) {
    diamondUpdateLocationEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        address_name
        lat
        lng
        node
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_UPDATE_LOCATION_BY_NODE = gql`
  query GetUpdateLocationByNode($node: String!, $limit: Int = 100) {
    diamondUpdateLocationEventss(
      where: { node: $node }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        address_name
        lat
        lng
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_UPDATE_STATUS_EVENTS = gql`
  query GetUpdateStatusEvents($limit: Int = 1000) {
    diamondUpdateStatusEventss(limit: $limit) {
      items {
        id
        status
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_SUPPORTED_ASSET_ADDED_EVENTS = gql`
  query GetSupportedAssetAddedEvents($limit: Int = 1000, $after: String) {
    diamondSupportedAssetAddedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        token
        token_id
        price
        capacity
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ============================================================================
// Asset Class Events (from AssetsFacet)
// ============================================================================

export const GET_SUPPORTED_CLASS_ADDED_EVENTS = gql`
  query GetSupportedClassAddedEvents($limit: Int = 100) {
    diamondSupportedClassAddedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        class_name_hash
        class_name
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_SUPPORTED_CLASS_REMOVED_EVENTS = gql`
  query GetSupportedClassRemovedEvents($limit: Int = 100) {
    diamondSupportedClassRemovedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        class_name_hash
        class_name
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_SUPPORTED_ASSETS_BY_NODE = gql`
  query GetSupportedAssetsByNode($nodeHash: String!, $limit: Int = 100) {
    diamondSupportedAssetAddedEventss(
      where: { node_hash: $nodeHash }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        token
        token_id
        price
        capacity
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// ORDER PLACEMENT EVENT QUERIES
// ============================================================================

export const GET_ORDER_PLACED_WITH_TOKENS_EVENTS = gql`
  query GetOrderPlacedWithTokensEvents($limit: Int = 500, $after: String) {
    diamondOrderPlacedWithTokensEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_ORDER_PLACED_BY_MAKER = gql`
  query GetOrderPlacedByMaker($maker: String!, $limit: Int = 100) {
    diamondOrderPlacedWithTokensEventss(
      where: { maker: $maker }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_ROUTER_ORDER_PLACED_EVENTS = gql`
  query GetRouterOrderPlacedEvents($limit: Int = 500, $after: String) {
    diamondRouterOrderPlacedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ============================================================================
// ORDER FILL/CANCEL EVENT QUERIES
// ============================================================================

export const GET_CLOB_ORDER_FILLED_EVENTS = gql`
  query GetCLOBOrderFilledEvents($limit: Int = 500, $after: String) {
    diamondCLOBOrderFilledEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        trade_id
        fill_amount
        fill_price
        remaining_amount
        cumulative_filled
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_CLOB_ORDER_FILLED_BY_ORDER = gql`
  query GetCLOBOrderFilledByOrder($orderId: String!, $limit: Int = 100) {
    diamondCLOBOrderFilledEventss(
      where: { order_id: $orderId }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        order_id
        trade_id
        fill_amount
        fill_price
        remaining_amount
        cumulative_filled
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_CLOB_ORDER_CANCELLED_EVENTS = gql`
  query GetCLOBOrderCancelledEvents($limit: Int = 500) {
    diamondCLOBOrderCancelledEventss(limit: $limit) {
      items {
        id
        order_id
        maker
        remaining_amount
        reason
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_ORDER_EXPIRED_EVENTS = gql`
  query GetOrderExpiredEvents($limit: Int = 500) {
    diamondOrderExpiredEventss(limit: $limit) {
      items {
        id
        order_id
        expired_at
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// TRADE EVENT QUERIES
// ============================================================================

export const GET_CLOB_TRADE_EXECUTED_EVENTS = gql`
  query GetCLOBTradeExecutedEvents($limit: Int = 500, $after: String) {
    diamondCLOBTradeExecutedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_fee
        maker_fee
        timestamp
        taker_is_buy
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_TRADES_BY_USER = gql`
  query GetTradesByUser($user: String!, $limit: Int = 100) {
    takerTrades: diamondCLOBTradeExecutedEventss(
      where: { taker: $user }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_is_buy
        block_number
        block_timestamp
        transaction_hash
      }
    }
    makerTrades: diamondCLOBTradeExecutedEventss(
      where: { maker: $user }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        trade_id
        taker_order_id
        maker_order_id
        taker
        maker
        market_id
        price
        amount
        quote_amount
        taker_is_buy
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// UNIFIED ORDER / LOGISTICS EVENT QUERIES
// ============================================================================

export const GET_UNIFIED_ORDER_CREATED_EVENTS = gql`
  query GetUnifiedOrderCreatedEvents($limit: Int = 500, $after: String) {
    diamondUnifiedOrderCreatedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_UNIFIED_ORDER_BY_BUYER = gql`
  query GetUnifiedOrderByBuyer($buyer: String!, $limit: Int = 100) {
    diamondUnifiedOrderCreatedEventss(
      where: { buyer: $buyer }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_UNIFIED_ORDER_BY_SELLER = gql`
  query GetUnifiedOrderBySeller($seller: String!, $limit: Int = 100) {
    diamondUnifiedOrderCreatedEventss(
      where: { seller: $seller }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_LOGISTICS_ORDER_CREATED_EVENTS = gql`
  query GetLogisticsOrderCreatedEvents($limit: Int = 500, $after: String) {
    diamondLogisticsOrderCreatedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        ausys_order_id
        journey_ids
        bounty
        node
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_JOURNEY_STATUS_UPDATED_EVENTS = gql`
  query GetJourneyStatusUpdatedEvents($limit: Int = 500, $after: String) {
    diamondJourneyStatusUpdatedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        journey_id
        phase
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_JOURNEY_STATUS_BY_JOURNEY = gql`
  query GetJourneyStatusByJourney($journeyId: String!, $limit: Int = 100) {
    diamondJourneyStatusUpdatedEventss(
      where: { journey_id: $journeyId }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        unified_order_id
        journey_id
        phase
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_ORDER_SETTLED_EVENTS = gql`
  query GetOrderSettledEvents($limit: Int = 500) {
    diamondOrderSettledEventss(limit: $limit) {
      items {
        id
        unified_order_id
        seller
        seller_amount
        driver
        driver_amount
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// MARKET EVENT QUERIES
// ============================================================================

export const GET_MARKET_CREATED_EVENTS = gql`
  query GetMarketCreatedEvents($limit: Int = 100) {
    diamondMarketCreatedEventss(limit: $limit) {
      items {
        id
        market_id
        base_token
        base_token_id
        quote_token
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// BATCH QUERIES FOR AGGREGATION
// ============================================================================

/**
 * Fetch all events needed to aggregate nodes
 */
export const GET_ALL_NODE_EVENTS = gql`
  query GetAllNodeEvents($limit: Int = 1000) {
    registered: diamondNodeRegisteredEventss(limit: $limit) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
    deactivated: diamondNodeDeactivatedEventss(limit: $limit) {
      items {
        id
        node_hash
        block_number
        block_timestamp
        transaction_hash
      }
    }
    locations: diamondUpdateLocationEventss(limit: $limit) {
      items {
        id
        address_name
        lat
        lng
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    statuses: diamondUpdateStatusEventss(limit: $limit) {
      items {
        id
        status
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    assets: diamondSupportedAssetAddedEventss(limit: $limit) {
      items {
        id
        node_hash
        token
        token_id
        price
        capacity
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Fetch all events needed to aggregate orders
 */
export const GET_ALL_ORDER_EVENTS = gql`
  query GetAllOrderEvents($limit: Int = 500) {
    placed: diamondOrderPlacedWithTokensEventss(limit: $limit) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
    routerPlaced: diamondRouterOrderPlacedEventss(limit: $limit) {
      items {
        id
        order_id
        maker
        base_token
        base_token_id
        quote_token
        price
        amount
        is_buy
        order_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
    filled: diamondCLOBOrderFilledEventss(limit: $limit) {
      items {
        id
        order_id
        trade_id
        fill_amount
        fill_price
        remaining_amount
        cumulative_filled
        block_number
        block_timestamp
        transaction_hash
      }
    }
    cancelled: diamondCLOBOrderCancelledEventss(limit: $limit) {
      items {
        id
        order_id
        maker
        remaining_amount
        reason
        block_number
        block_timestamp
        transaction_hash
      }
    }
    expired: diamondOrderExpiredEventss(limit: $limit) {
      items {
        id
        order_id
        expired_at
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Fetch all events needed to aggregate unified orders/journeys
 */
export const GET_ALL_UNIFIED_ORDER_EVENTS = gql`
  query GetAllUnifiedOrderEvents($limit: Int = 500) {
    created: diamondUnifiedOrderCreatedEventss(limit: $limit) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
    logistics: diamondLogisticsOrderCreatedEventss(limit: $limit) {
      items {
        id
        unified_order_id
        ausys_order_id
        journey_ids
        bounty
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    journeyUpdates: diamondJourneyStatusUpdatedEventss(limit: $limit) {
      items {
        id
        unified_order_id
        journey_id
        phase
        block_number
        block_timestamp
        transaction_hash
      }
    }
    settled: diamondOrderSettledEventss(limit: $limit) {
      items {
        id
        unified_order_id
        seller
        seller_amount
        driver
        driver_amount
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface NodeEventsResponse {
  registered: EventsGraphQLResponse<NodeRegisteredEvent>;
  deactivated: EventsGraphQLResponse<NodeDeactivatedEvent>;
  locations: EventsGraphQLResponse<UpdateLocationEvent>;
  statuses: EventsGraphQLResponse<UpdateStatusEvent>;
  assets: EventsGraphQLResponse<SupportedAssetAddedEvent>;
}

export interface OrderEventsResponse {
  placed: EventsGraphQLResponse<OrderPlacedWithTokensEvent>;
  routerPlaced: EventsGraphQLResponse<RouterOrderPlacedEvent>;
  filled: EventsGraphQLResponse<CLOBOrderFilledEvent>;
  cancelled: EventsGraphQLResponse<CLOBOrderCancelledEvent>;
  expired: EventsGraphQLResponse<OrderExpiredEvent>;
}

export interface UnifiedOrderEventsResponse {
  created: EventsGraphQLResponse<UnifiedOrderCreatedEvent>;
  logistics: EventsGraphQLResponse<LogisticsOrderCreatedEvent>;
  journeyUpdates: EventsGraphQLResponse<JourneyStatusUpdatedEvent>;
  settled: EventsGraphQLResponse<OrderSettledEvent>;
}

export interface TradesByUserResponse {
  takerTrades: EventsGraphQLResponse<CLOBTradeExecutedEvent>;
  makerTrades: EventsGraphQLResponse<CLOBTradeExecutedEvent>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract items from Ponder's paginated response
 */
export function extractPonderItems<T>(response: { items?: T[] } | T[]): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  return response?.items || [];
}

/**
 * Convert NodeEventsResponse to aggregator input format
 */
export function convertNodeEventsResponse(response: NodeEventsResponse) {
  return {
    registered: extractPonderItems(response.registered),
    deactivated: extractPonderItems(response.deactivated),
    locationUpdates: extractPonderItems(response.locations),
    statusUpdates: extractPonderItems(response.statuses),
    assetsAdded: extractPonderItems(response.assets),
  };
}

/**
 * Convert OrderEventsResponse to aggregator input format
 */
export function convertOrderEventsResponse(response: OrderEventsResponse) {
  return {
    placed: extractPonderItems(response.placed),
    routerPlaced: extractPonderItems(response.routerPlaced),
    filled: extractPonderItems(response.filled),
    cancelled: extractPonderItems(response.cancelled),
    expired: extractPonderItems(response.expired),
  };
}

/**
 * Convert UnifiedOrderEventsResponse to aggregator input format
 */
export function convertUnifiedOrderEventsResponse(
  response: UnifiedOrderEventsResponse,
) {
  return {
    created: extractPonderItems(response.created),
    logistics: extractPonderItems(response.logistics),
    journeyUpdates: extractPonderItems(response.journeyUpdates),
    settled: extractPonderItems(response.settled),
  };
}

// ============================================================================
// LEGACY QUERIES - For backward compatibility during migration
// These query aggregate tables (nodes, orders, journeys) which may not exist
// in the pure dumb indexer. Use raw event queries above for new code.
// ============================================================================

export const GET_NODE_BY_ADDRESS = gql`
  query GetNodeByAddress($nodeAddress: String!) {
    registered: diamondNodeRegisteredEventss(
      where: { node_hash: $nodeAddress }
      limit: 1
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
    deactivated: diamondNodeDeactivatedEventss(
      where: { node_hash: $nodeAddress }
      limit: 1
    ) {
      items {
        id
        node_hash
        block_number
        block_timestamp
        transaction_hash
      }
    }
    locations: diamondUpdateLocationEventss(
      where: { node: $nodeAddress }
      limit: 1
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        address_name
        lat
        lng
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    statuses: diamondUpdateStatusEventss(
      where: { node: $nodeAddress }
      limit: 1
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        status
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    assets: diamondSupportedAssetAddedEventss(
      where: { node_hash: $nodeAddress }
      limit: 100
    ) {
      items {
        id
        node_hash
        token
        token_id
        price
        capacity
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_ALL_ACTIVE_NODES = gql`
  query GetAllActiveNodes($limit: Int = 500) {
    registered: diamondNodeRegisteredEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
    deactivated: diamondNodeDeactivatedEventss(limit: $limit) {
      items {
        id
        node_hash
        block_number
        block_timestamp
        transaction_hash
      }
    }
    locations: diamondUpdateLocationEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        address_name
        lat
        lng
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    statuses: diamondUpdateStatusEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        status
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export interface ActiveNodeResponse {
  id: string;
  owner: string;
  addressName: string;
  lat: string;
  lng: string;
  validNode: boolean;
  status: string;
}

export interface GetAllActiveNodesResponse {
  nodess: {
    items: ActiveNodeResponse[];
  };
}

// ============================================================================
// STAKING/POOL QUERIES (Diamond-based)
// ============================================================================

export const GET_COMMODITY_STAKED_EVENTS = gql`
  query GetCommodityStakedEvents($limit: Int = 100, $after: String) {
    diamondCommodityStakedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        opportunity_id
        staker
        amount
        total_staked
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_COMMODITY_STAKED_BY_STAKER = gql`
  query GetCommodityStakedByStaker($staker: String!, $limit: Int = 100) {
    diamondCommodityStakedEventss(
      where: { staker: $staker }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        opportunity_id
        staker
        amount
        total_staked
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_OPPORTUNITY_CREATED_EVENTS = gql`
  query GetOpportunityCreatedEvents($limit: Int = 100, $after: String) {
    diamondOpportunityCreatedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        event_id
        operator
        input_token
        input_token_id
        target_amount
        promised_yield_bps
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_OPPORTUNITY_FUNDED_EVENTS = gql`
  query GetOpportunityFundedEvents($opportunityId: String!, $limit: Int = 100) {
    diamondOpportunityFundedEventss(
      where: { event_id: $opportunityId }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        event_id
        total_staked
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_PROFIT_DISTRIBUTED_EVENTS = gql`
  query GetProfitDistributedEvents($limit: Int = 100, $after: String) {
    diamondProfitDistributedEventss(
      limit: $limit
      after: $after
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        opportunity_id
        staker
        staked_amount
        profit_share
        block_number
        block_timestamp
        transaction_hash
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_PROFIT_BY_STAKER = gql`
  query GetProfitByStaker($staker: String!, $limit: Int = 100) {
    diamondProfitDistributedEventss(
      where: { staker: $staker }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        opportunity_id
        staker
        staked_amount
        profit_share
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export interface CommodityStakedEventResponse {
  id: string;
  opportunity_id: string;
  staker: string;
  amount: string;
  total_staked: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface CommodityStakedEventsResponse {
  diamondCommodityStakedEventss: {
    items: CommodityStakedEventResponse[];
    pageInfo?: { hasNextPage: boolean; endCursor?: string };
  };
}

export interface OpportunityCreatedEventResponse {
  id: string;
  event_id: string;
  operator: string;
  input_token: string;
  input_token_id: string;
  target_amount: string;
  promised_yield_bps: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface OpportunityCreatedEventsResponse {
  diamondOpportunityCreatedEventss: {
    items: OpportunityCreatedEventResponse[];
    pageInfo?: { hasNextPage: boolean; endCursor?: string };
  };
}

export interface ProfitDistributedEventResponse {
  id: string;
  opportunity_id: string;
  staker: string;
  staked_amount: string;
  profit_share: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface ProfitDistributedEventsResponse {
  diamondProfitDistributedEventss: {
    items: ProfitDistributedEventResponse[];
    pageInfo?: { hasNextPage: boolean; endCursor?: string };
  };
}

// =============================================================================
// P2P ORDER QUERIES
// =============================================================================

/**
 * Get P2P offers created by a specific user.
 * Returns full offer details from P2POfferCreated events.
 */
export const GET_P2P_OFFERS_BY_CREATOR = gql`
  query GetP2POffersByCreator($creator: String!, $limit: Int = 100) {
    diamondP2POfferCreatedEventss(
      where: { creator: $creator }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        creator
        is_seller_initiated
        token
        token_id
        token_quantity
        price
        target_counterparty
        expires_at
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get P2P offers accepted by a specific user.
 * Returns the accepted event linking acceptor to order_id.
 */
export const GET_P2P_OFFERS_ACCEPTED_BY_USER = gql`
  query GetP2POffersAcceptedByUser($acceptor: String!, $limit: Int = 100) {
    diamondP2POfferAcceptedEventss(
      where: { acceptor: $acceptor }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        acceptor
        is_seller_initiated
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get all P2P offer created events (for enriching accepted events with details).
 */
export const GET_P2P_OFFER_DETAILS_BY_ORDER_IDS = gql`
  query GetP2POfferDetailsByOrderIds($limit: Int = 500) {
    diamondP2POfferCreatedEventss(limit: $limit) {
      items {
        id
        order_id
        creator
        is_seller_initiated
        token
        token_id
        token_quantity
        price
        target_counterparty
        expires_at
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get AuSys order status updates (to determine current status of P2P orders).
 */
export const GET_AUSYS_ORDER_STATUS_UPDATES = gql`
  query GetAuSysOrderStatusUpdates($limit: Int = 500) {
    diamondAuSysOrderStatusUpdatedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        order_id
        new_status
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// =============================================================================
// P2P RAW EVENT RESPONSE TYPES
// =============================================================================

export interface P2POfferCreatedRawEvent {
  id: string;
  order_id: string;
  creator: string;
  is_seller_initiated: boolean;
  token: string;
  token_id: string;
  token_quantity: string;
  price: string;
  target_counterparty: string;
  expires_at: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface P2POfferAcceptedRawEvent {
  id: string;
  order_id: string;
  acceptor: string;
  is_seller_initiated: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface AuSysOrderStatusUpdatedRawEvent {
  id: string;
  order_id: string;
  new_status: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface P2POffersByCreatorResponse {
  diamondP2POfferCreatedEventss: { items: P2POfferCreatedRawEvent[] };
}

export interface P2POffersAcceptedByUserResponse {
  diamondP2POfferAcceptedEventss: { items: P2POfferAcceptedRawEvent[] };
}

export interface P2POfferDetailsResponse {
  diamondP2POfferCreatedEventss: { items: P2POfferCreatedRawEvent[] };
}

export interface AuSysOrderStatusUpdatesResponse {
  diamondAuSysOrderStatusUpdatedEventss: {
    items: AuSysOrderStatusUpdatedRawEvent[];
  };
}

// =============================================================================
// P2P JOURNEY QUERIES (for enriching P2P orders with journey data)
// =============================================================================

/**
 * Get journeys linked to AuSys orders.
 * The `order_id` field links journeys to their parent order.
 */
export const GET_JOURNEYS_BY_ORDER = gql`
  query GetJourneysByOrder($limit: Int = 500) {
    diamondJourneyCreatedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        journey_id
        sender
        receiver
        driver
        bounty
        e_t_a
        order_id
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get journey status updates to determine current journey phase.
 */
export const GET_JOURNEY_STATUS_UPDATES_ALL = gql`
  query GetJourneyStatusUpdatesAll($limit: Int = 500) {
    diamondAuSysJourneyStatusUpdatedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        journey_id
        new_status
        sender
        receiver
        driver
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get journeys where a specific address is the sender (for node dashboard).
 */
export const GET_JOURNEYS_BY_SENDER_ADDRESS = gql`
  query GetJourneysBySenderAddress($sender: String!, $limit: Int = 500) {
    diamondJourneyCreatedEventss(
      where: { sender: $sender }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        journey_id
        sender
        receiver
        driver
        bounty
        e_t_a
        order_id
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export interface JourneysBySenderResponse {
  diamondJourneyCreatedEventss: { items: JourneyCreatedForOrderRawEvent[] };
}

// P2P Journey Raw Event Types

export interface JourneyCreatedForOrderRawEvent {
  id: string;
  journey_id: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  order_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface JourneyStatusUpdateRawEvent {
  id: string;
  journey_id: string;
  new_status: string;
  sender: string;
  receiver: string;
  driver: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface JourneysByOrderResponse {
  diamondJourneyCreatedEventss: { items: JourneyCreatedForOrderRawEvent[] };
}

export interface JourneyStatusUpdatesAllResponse {
  diamondAuSysJourneyStatusUpdatedEventss: {
    items: JourneyStatusUpdateRawEvent[];
  };
}

// ---------------------------------------------------------------------------
// EmitSig (package signing) events

// =============================================================================
// MINTED ASSET QUERIES (tokenId -> assetClass lookup)
// =============================================================================

export const GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS = gql`
  query GetMintedAssetClassByTokenIds(
    $tokenIds: [BigInt!]!
    $limit: Int = 500
  ) {
    diamondMintedAssetEventss(
      where: { token_id_in: $tokenIds }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        token_id
        asset_class
        name
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export const GET_ALL_MINTED_ASSET_CLASSES = gql`
  query GetAllMintedAssetClasses($limit: Int = 1000) {
    diamondMintedAssetEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        token_id
        asset_class
        name
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export interface MintedAssetRawEvent {
  id: string;
  token_id: string;
  asset_class: string;
  name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface MintedAssetEventsResponse {
  diamondMintedAssetEventss: { items: MintedAssetRawEvent[] };
}

// ---------------------------------------------------------------------------

export const GET_EMIT_SIG_EVENTS_BY_JOURNEY = gql`
  query GetEmitSigEventsByJourney($journeyId: String!, $limit: Int = 50) {
    diamondEmitSigEventss(
      where: { event_id: $journeyId }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        user
        event_id
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export interface EmitSigRawEvent {
  id: string;
  user: string;
  event_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface EmitSigEventsByJourneyResponse {
  diamondEmitSigEventss: { items: EmitSigRawEvent[] };
}
