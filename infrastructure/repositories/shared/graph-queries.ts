import { gql } from 'graphql-request';

// =============================================================================
// AURUM/AURA ASSET QUERIES
// =============================================================================
// Table names follow pattern: diamond{EventName}Eventss (note double 's' from Ponder pluralization)
// Field names use snake_case as stored in Ponder

/**
 * Query to get all tokenIds owned by a specific node address
 * Uses TransferSingle events to track current ownership
 */
export const GET_NODE_TOKENIDS = gql`
  query GetNodeTokenIds($nodeAddress: String!) {
    # Get all transfers TO the node address
    transfersIn: diamondTransferSingleEventss(
      where: { to: $nodeAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        operator
        from
        to
        event_id
        value
        block_timestamp
        transaction_hash
      }
    }

    # Get all transfers FROM the node address
    transfersOut: diamondTransferSingleEventss(
      where: { from: $nodeAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        operator
        from
        to
        event_id
        value
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Alternative query using MintedAsset events if you want to get
 * assets that were originally minted to this node
 */
export const GET_NODE_MINTED_ASSETS = gql`
  query GetNodeMintedAssets($nodeAddress: String!) {
    diamondMintedAssetEventss(
      where: { account: $nodeAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        account
        hash
        token_id
        name
        asset_class
        class_name
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query Ponder indexer for node supported assets (pricing and capacity)
 * Uses SupportedAssetAdded events from the indexer
 */
export const GET_NODE_ASSETS_AURUM = gql`
  query GetNodeAssetsAurum($nodeAddress: String!) {
    diamondSupportedAssetAddedEventss(
      where: { node_hash: $nodeAddress }
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
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query Ponder indexer for ALL node supported assets (pricing and capacity)
 * Uses SupportedAssetAdded events from the indexer
 */
export const GET_ALL_NODE_ASSETS_AURUM = gql`
  query GetAllNodeAssetsAurum($limit: Int!, $after: String) {
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

/**
 * Query for user token transfers to calculate balances
 * Uses TransferSingle events - must aggregate in client to get balances
 * Note: For actual balances, prefer on-chain balanceOf calls
 */
export const GET_USER_BALANCES_AURA = gql`
  query GetUserBalancesAura($userAddress: String!) {
    # Get all transfers TO the user
    transfersIn: diamondTransferSingleEventss(
      where: { to: $userAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 1000
    ) {
      items {
        id
        operator
        from
        to
        event_id
        value
        block_timestamp
        transaction_hash
      }
    }
    # Get all transfers FROM the user
    transfersOut: diamondTransferSingleEventss(
      where: { from: $userAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 1000
    ) {
      items {
        id
        operator
        from
        to
        event_id
        value
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for asset metadata by hashes using MintedAsset events
 */
export const GET_ASSETS_BY_HASHES = gql`
  query GetAssetsByHashes($hashes: [String!]!) {
    diamondMintedAssetEventss(where: { hash_in: $hashes }, limit: 100) {
      items {
        id
        account
        hash
        token_id
        name
        asset_class
        class_name
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for asset metadata by tokenIds using MintedAsset events
 */
export const GET_ASSETS_BY_TOKEN_IDS = gql`
  query GetAssetsByTokenIds($tokenIds: [BigInt!]!) {
    diamondMintedAssetEventss(where: { token_id_in: $tokenIds }, limit: 100) {
      items {
        id
        account
        hash
        token_id
        name
        asset_class
        class_name
        block_timestamp
        transaction_hash
      }
    }
  }
`;

export interface NodeTokenBalance {
  tokenId: string;
  balance: string;
  name?: string;
  assetClass?: string;
  hash?: string;
}

// Updated interfaces for snake_case field names from Ponder
export interface GraphTransferEvent {
  id: string;
  operator: string;
  from: string;
  to: string;
  event_id: string; // token ID
  value: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface GraphMintedAsset {
  id: string;
  account: string;
  hash: string;
  token_id: string;
  name: string;
  asset_class: string;
  class_name: string;
  block_timestamp: string;
  transaction_hash: string;
}

// Response interfaces for node asset events
export interface NodeAssetAurum {
  id: string;
  node_hash: string;
  token: string;
  token_id: string;
  price: string;
  capacity: string;
  block_timestamp: string;
  transaction_hash: string;
}

// User balance is computed from transfer events
export interface UserBalanceAura {
  tokenId: string;
  balance: string;
}

// Updated AssetAura interface for snake_case from Ponder
export interface AssetAura {
  id: string;
  account: string;
  hash: string;
  token_id: string;
  name: string;
  asset_class: string;
  class_name: string;
  block_timestamp: string;
  transaction_hash: string;
}

// Response types for event-based queries
export interface NodeAssetsAurumResponse {
  diamondSupportedAssetAddedEventss: { items: NodeAssetAurum[] };
}

// Helper to extract items from Ponder's paginated response
export function extractPonderNodeAssets(response: {
  diamondSupportedAssetAddedEventss?: { items: NodeAssetAurum[] };
}): NodeAssetAurum[] {
  return response?.diamondSupportedAssetAddedEventss?.items || [];
}

export interface UserBalancesAuraResponse {
  transfersIn: { items: GraphTransferEvent[] };
  transfersOut: { items: GraphTransferEvent[] };
}

export interface AssetsAuraResponse {
  diamondMintedAssetEventss: { items: AssetAura[] };
}

// Paginated list of all minted assets
export const GET_ALL_ASSETS = gql`
  query GetAllAssets($limit: Int!, $after: String) {
    diamondMintedAssetEventss(
      limit: $limit
      after: $after
      orderBy: "token_id"
      orderDirection: "asc"
    ) {
      items {
        id
        account
        hash
        token_id
        name
        asset_class
        class_name
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

// =============================================================================
// SUPPORTED CLASSES QUERIES (Event-Based)
// =============================================================================

/**
 * Query for supported asset class events
 * Gets all SupportedClassAdded and SupportedClassRemoved events
 * Client must aggregate to determine currently active classes
 */
export const GET_SUPPORTED_CLASSES = gql`
  query GetSupportedClasses {
    added: diamondSupportedClassAddedEventss(
      orderBy: "block_timestamp"
      orderDirection: "asc"
      limit: 1000
    ) {
      items {
        id
        class_name_hash
        class_name
        block_timestamp
        transaction_hash
      }
    }
    removed: diamondSupportedClassRemovedEventss(
      orderBy: "block_timestamp"
      orderDirection: "asc"
      limit: 1000
    ) {
      items {
        id
        class_name_hash
        class_name
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Response interface for supported class events query
 */
export interface SupportedClassEventResponse {
  id: string;
  class_name_hash: string;
  class_name: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface SupportedClassesResponse {
  added: { items: SupportedClassEventResponse[] };
  removed: { items: SupportedClassEventResponse[] };
}

/**
 * Helper to extract currently active supported classes from Ponder response
 * Aggregates add/remove events to determine current state
 */
export function extractPonderSupportedClasses(
  response: SupportedClassesResponse | null | undefined,
): string[] {
  if (!response?.added?.items) return [];

  const added = response.added.items || [];
  const removed = response.removed?.items || [];

  // Build set of removed class hashes
  const removedHashes = new Set(removed.map((r) => r.class_name_hash));

  // Return classes that haven't been removed
  return added
    .filter(
      (item) => !removedHashes.has(item.class_name_hash) && item.class_name,
    )
    .map((item) => item.class_name);
}

// =============================================================================
// ASSETS BY CLASS QUERY (Event-Based)
// =============================================================================

/**
 * Query for minted assets filtered by asset class
 * Uses MintedAsset events from the indexer
 */
export const GET_ASSETS_BY_CLASS = gql`
  query GetAssetsByClass($assetClass: String!, $limit: Int!, $after: String) {
    diamondMintedAssetEventss(
      where: { asset_class: $assetClass }
      limit: $limit
      after: $after
      orderBy: "token_id"
      orderDirection: "asc"
    ) {
      items {
        id
        account
        hash
        token_id
        name
        asset_class
        class_name
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

// =============================================================================
// CLOB EVENT-BASED QUERIES
// =============================================================================
// The indexer stores raw events. To get order/trade state, we fetch events
// and aggregate them in the repository layer using event-aggregators.ts

/**
 * Query for order placement events - used to build order book
 * Fetches OrderPlacedWithTokens events from both direct and router sources
 */
export const GET_ORDER_PLACED_EVENTS = gql`
  query GetOrderPlacedEvents(
    $baseToken: String!
    $baseTokenId: BigInt!
    $limit: Int!
  ) {
    diamondOrderPlacedWithTokensEventss(
      where: { base_token: $baseToken, base_token_id: $baseTokenId }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
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
        block_timestamp
        transaction_hash
      }
    }
    diamondRouterOrderPlacedEventss(
      where: { base_token: $baseToken, base_token_id: $baseTokenId }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
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
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for order fill events - used to calculate remaining amounts
 */
export const GET_ORDER_FILLED_EVENTS = gql`
  query GetOrderFilledEvents($orderIds: [String!]!, $limit: Int!) {
    diamondCLOBOrderFilledEventss(
      where: { order_id_in: $orderIds }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        order_id
        trade_id
        fill_amount
        fill_price
        remaining_amount
        cumulative_filled
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for order cancelled events
 */
export const GET_ORDER_CANCELLED_EVENTS = gql`
  query GetOrderCancelledEvents($orderIds: [String!]!, $limit: Int!) {
    diamondCLOBOrderCancelledEventss(
      where: { order_id_in: $orderIds }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        order_id
        maker
        remaining_amount
        reason
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for order expired events
 */
export const GET_ORDER_EXPIRED_EVENTS = gql`
  query GetOrderExpiredEvents($orderIds: [String!]!, $limit: Int!) {
    diamondOrderExpiredEventss(
      where: { order_id_in: $orderIds }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        order_id
        expired_at
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for trade executed events
 */
export const GET_TRADE_EVENTS = gql`
  query GetTradeEvents($limit: Int!) {
    diamondCLOBTradeExecutedEventss(
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
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
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for user's order placement events
 */
export const GET_USER_ORDER_EVENTS = gql`
  query GetUserOrderEvents($maker: String!, $limit: Int!) {
    diamondOrderPlacedWithTokensEventss(
      where: { maker: $maker }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
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
        block_timestamp
        transaction_hash
      }
    }
    diamondRouterOrderPlacedEventss(
      where: { maker: $maker }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: $limit
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
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query for user's trade events (as taker)
 */
export const GET_USER_TRADE_EVENTS = gql`
  query GetUserTradeEvents($user: String!, $limit: Int!) {
    diamondCLOBTradeExecutedEventss(
      where: { taker: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
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
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// =============================================================================
// LEGACY QUERY ALIASES (for backward compatibility)
// These redirect to the new event-based queries
// =============================================================================

export const GET_CLOB_OPEN_ORDERS = GET_ORDER_PLACED_EVENTS;
export const GET_CLOB_TRADES = GET_TRADE_EVENTS;
export const GET_CLOB_USER_ORDERS = GET_USER_ORDER_EVENTS;
export const GET_CLOB_USER_TRADES = GET_USER_TRADE_EVENTS;

// Best prices query - fetches order events and filters by is_buy
export const GET_CLOB_BEST_PRICES = gql`
  query GetBestPrices($baseToken: String!, $baseTokenId: BigInt!) {
    diamondOrderPlacedWithTokensEventss(
      where: { base_token: $baseToken, base_token_id: $baseTokenId }
      orderBy: "price"
      orderDirection: "desc"
      limit: 100
    ) {
      items {
        id
        order_id
        price
        amount
        is_buy
        block_timestamp
      }
    }
  }
`;

// =============================================================================
// Response Type Interfaces
// =============================================================================

/** Order placement event from GraphQL */
export interface OrderPlacedEventGraphResponse {
  id: string;
  order_id: string;
  maker: string;
  base_token: string;
  base_token_id: string;
  quote_token: string;
  price: string;
  amount: string;
  is_buy: boolean;
  order_type: string;
  block_timestamp: string;
  transaction_hash: string;
}

/** Order filled event from GraphQL */
export interface OrderFilledEventGraphResponse {
  id: string;
  order_id: string;
  trade_id: string;
  fill_amount: string;
  fill_price: string;
  remaining_amount: string;
  cumulative_filled: string;
  block_timestamp: string;
  transaction_hash: string;
}

/** Order cancelled event from GraphQL */
export interface OrderCancelledEventGraphResponse {
  id: string;
  order_id: string;
  maker: string;
  remaining_amount: string;
  reason: string;
  block_timestamp: string;
  transaction_hash: string;
}

/** Order expired event from GraphQL */
export interface OrderExpiredEventGraphResponse {
  id: string;
  order_id: string;
  expired_at: string;
  block_timestamp: string;
  transaction_hash: string;
}

/** Trade executed event from GraphQL */
export interface TradeExecutedEventGraphResponse {
  id: string;
  trade_id: string;
  taker_order_id: string;
  maker_order_id: string;
  taker: string;
  maker: string;
  market_id: string;
  price: string;
  amount: string;
  quote_amount: string;
  taker_fee: string;
  maker_fee: string;
  timestamp: string;
  taker_is_buy: boolean;
  block_timestamp: string;
  transaction_hash: string;
}

/** Response for order placed events query */
export interface OrderPlacedEventsResponse {
  diamondOrderPlacedWithTokensEventss: {
    items: OrderPlacedEventGraphResponse[];
  };
  diamondRouterOrderPlacedEventss: {
    items: OrderPlacedEventGraphResponse[];
  };
}

/** Response for order filled events query */
export interface OrderFilledEventsResponse {
  diamondCLOBOrderFilledEventss: {
    items: OrderFilledEventGraphResponse[];
  };
}

/** Response for order cancelled events query */
export interface OrderCancelledEventsResponse {
  diamondCLOBOrderCancelledEventss: {
    items: OrderCancelledEventGraphResponse[];
  };
}

/** Response for order expired events query */
export interface OrderExpiredEventsResponse {
  diamondOrderExpiredEventss: {
    items: OrderExpiredEventGraphResponse[];
  };
}

/** Response for trade events query */
export interface TradeEventsResponse {
  diamondCLOBTradeExecutedEventss: {
    items: TradeExecutedEventGraphResponse[];
  };
}

/** Response for user order events query */
export interface UserOrderEventsResponse {
  diamondOrderPlacedWithTokensEventss: {
    items: OrderPlacedEventGraphResponse[];
  };
  diamondRouterOrderPlacedEventss: {
    items: OrderPlacedEventGraphResponse[];
  };
}

/** Response for user trade events query */
export interface UserTradeEventsResponse {
  diamondCLOBTradeExecutedEventss: {
    items: TradeExecutedEventGraphResponse[];
  };
}

/** Response for best prices query */
export interface BestPricesEventsResponse {
  diamondOrderPlacedWithTokensEventss: {
    items: Array<{
      id: string;
      order_id: string;
      price: string;
      amount: string;
      is_buy: boolean;
      block_timestamp: string;
    }>;
  };
}

// Legacy interfaces - kept for backward compatibility
export interface CLOBOrderGraphResponse {
  id: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: string;
  amount: string;
  filledAmount: string;
  remainingAmount: string;
  status: string;
  isBuy: boolean;
  orderType: string;
  createdAt: string;
}

export interface CLOBTradeGraphResponse {
  id: string;
  taker_order_id: string;
  maker_order_id: string;
  taker: string;
  maker: string;
  base_token: string;
  base_token_id: string;
  quote_token: string;
  price: string;
  amount: string;
  quote_amount: string;
  timestamp: string;
  transaction_hash: string;
}

export interface CLOBBestPricesResponse {
  bestBids: {
    items: Array<{ price: string; amount: string; remainingAmount: string }>;
  };
  bestAsks: {
    items: Array<{ price: string; amount: string; remainingAmount: string }>;
  };
}

// =============================================================================
// PONDER ITEM EXTRACTION HELPERS
// =============================================================================

/**
 * Generic helper to extract items from Ponder paginated responses
 */
export function extractPonderItems<T>(
  response: { items: T[] } | null | undefined,
): T[] {
  return response?.items || [];
}

// ============================================================================
// DRIVER/JOURNEY QUERIES (Raw Event Tables from AuSysFacet)
// ============================================================================

/**
 * Query all created journeys from JourneyCreated events.
 * Now contains full journey data including locations, bounty, ETA.
 */
export const GET_ALL_JOURNEYS_CREATED = gql`
  query GetAllJourneysCreated($limit: Int = 200) {
    journeys: diamondJourneyCreatedEventss(
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
        start_lat
        start_lng
        end_lat
        end_lng
        start_name
        end_name
        block_number
        block_timestamp
        transaction_hash
      }
    }
    statusUpdates: diamondAuSysJourneyStatusUpdatedEventss(
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
        bounty
        e_t_a
        journey_start
        journey_end
        start_lat
        start_lng
        end_lat
        end_lng
        start_name
        end_name
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query journeys assigned to a specific driver.
 * Uses DriverAssigned events which have full journey context.
 */
export const GET_JOURNEYS_BY_DRIVER = gql`
  query GetJourneysByDriver($driverAddress: String!, $limit: Int = 100) {
    assigned: diamondDriverAssignedEventss(
      where: { driver: $driverAddress }
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        journey_id
        driver
        sender
        receiver
        bounty
        e_t_a
        start_lat
        start_lng
        end_lat
        end_lng
        start_name
        end_name
        block_number
        block_timestamp
        transaction_hash
      }
    }
    statusUpdates: diamondAuSysJourneyStatusUpdatedEventss(
      where: { driver: $driverAddress }
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
        bounty
        e_t_a
        journey_start
        journey_end
        start_lat
        start_lng
        end_lat
        end_lng
        start_name
        end_name
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Query available journeys (status = Pending, no driver assigned).
 * Filters JourneyCreated events where driver is zero address.
 */
export const GET_AVAILABLE_JOURNEYS = gql`
  query GetAvailableJourneys($limit: Int = 200) {
    journeys: diamondJourneyCreatedEventss(
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
        start_lat
        start_lng
        end_lat
        end_lng
        start_name
        end_name
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// Legacy alias
export const GET_JOURNEY_RAW_EVENTS = GET_ALL_JOURNEYS_CREATED;
export const GET_JOURNEYS_BY_DRIVER_RAW = GET_JOURNEYS_BY_DRIVER;

// ============================================================================
// JOURNEY RAW EVENT RESPONSE TYPES (AuSysFacet Events)
// ============================================================================

/**
 * JourneyCreated event from AuSysFacet
 * Table: diamond_journey_created_events
 */
export interface JourneyCreatedRawEvent {
  id: string;
  journey_id: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  order_id: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

/**
 * DriverAssigned event from AuSysFacet
 * Table: diamond_driver_assigned_events
 */
export interface DriverAssignedRawEvent {
  id: string;
  journey_id: string;
  driver: string;
  sender: string;
  receiver: string;
  bounty: string;
  e_t_a: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

/**
 * AuSysJourneyStatusUpdated event from AuSysFacet
 * Table: diamond_au_sys_journey_status_updated_events
 */
export interface AuSysJourneyStatusUpdatedRawEvent {
  id: string;
  journey_id: string;
  new_status: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  journey_start: string;
  journey_end: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

// Response types for queries
export interface AllJourneysCreatedResponse {
  journeys: { items: JourneyCreatedRawEvent[] };
  statusUpdates: { items: AuSysJourneyStatusUpdatedRawEvent[] };
}

export interface JourneysByDriverResponse {
  assigned: { items: DriverAssignedRawEvent[] };
  statusUpdates: { items: AuSysJourneyStatusUpdatedRawEvent[] };
}

export interface AvailableJourneysResponse {
  journeys: { items: JourneyCreatedRawEvent[] };
}

// Legacy types (kept for Bridge events)
export interface LogisticsOrderCreatedRawEvent {
  id: string;
  unified_order_id: string;
  ausys_order_id: string;
  journey_ids: string;
  bounty: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface OrderSettledRawEvent {
  id: string;
  unified_order_id: string;
  seller: string;
  seller_amount: string;
  driver: string;
  driver_amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

// Legacy response types (deprecated - use new types above)
export interface JourneyRawEventsResponse {
  journeys: { items: JourneyCreatedRawEvent[] };
  statusUpdates: { items: AuSysJourneyStatusUpdatedRawEvent[] };
}

export interface JourneysByDriverRawResponse {
  assigned: { items: DriverAssignedRawEvent[] };
  statusUpdates: { items: AuSysJourneyStatusUpdatedRawEvent[] };
}
