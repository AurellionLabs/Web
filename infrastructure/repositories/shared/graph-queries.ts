import { gql } from 'graphql-request';

// =============================================================================
// CLOB V2 QUERIES - Event-sourced from raw events
// =============================================================================

/**
 * Query to get order book by aggregating from orderPlacedEvents
 * Excludes cancelled/filled orders based on orderCancelledEvents and tradeExecutedEvents
 */
export const GET_ORDER_BOOK_EVENTS = gql`
  query GetOrderBookEvents($marketId: String!, $limit: Int!) {
    # Get all placed orders for this market
    placedOrders: orderPlacedEventss(
      where: { baseTokenId: $marketId }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: 500
    ) {
      items {
        id
        orderId
        maker
        price
        amount
        isBuy
        orderType
        blockTimestamp
      }
    }

    # Get cancelled order IDs
    cancelledOrders: orderCancelledEventss(
      where: { orderId_isNull: false }
      limit: 1000
    ) {
      items {
        orderId
        blockTimestamp
      }
    }

    # Get filled amounts from trade events
    filledOrders: tradeExecutedEventss(
      where: { makerOrderId_isNull: false }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: 1000
    ) {
      items {
        makerOrderId
        amount
        price
        blockTimestamp
      }
    }
  }
`;

/**
 * Query to get a single order by aggregating its history from events
 */
export const GET_ORDER_BY_ID_EVENTS = gql`
  query GetOrderByIdEvents($orderId: String!) {
    # Get the original order placement
    orderPlacement: orderPlacedEvents(where: { orderId: $orderId }) {
      id
      orderId
      maker
      baseToken
      baseTokenId
      quoteToken
      price
      amount
      isBuy
      orderType
      blockTimestamp
      transactionHash
    }

    # Get cancellation if any
    cancellation: orderCancelledEvents(where: { orderId: $orderId }) {
      id
      orderId
      remainingAmount
      blockTimestamp
    }

    # Get all fills for this order
    fills: orderMatchedEventss(
      where: { makerOrderId: $orderId }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
    ) {
      items {
        id
        takerOrderId
        fillAmount
        fillPrice
        blockTimestamp
      }
    }
  }
`;

/**
 * Query to get user orders by aggregating from events
 */
export const GET_USER_ORDER_EVENTS = gql`
  query GetUserOrderEvents($maker: String!, $limit: Int!) {
    # Get all orders placed by this user
    placedOrders: orderPlacedEventss(
      where: { maker: $maker }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        orderId
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        isBuy
        orderType
        blockTimestamp
      }
    }

    # Get cancellations
    cancellations: orderCancelledEventss(
      where: { maker: $maker }
      limit: $limit
    ) {
      items {
        orderId
        blockTimestamp
      }
    }
  }
`;

/**
 * Query to get trades from tradeExecutedEvents
 */
export const GET_TRADES_EVENTS = gql`
  query GetTradesEvents($marketId: String!, $limit: Int!) {
    trades: tradeExecutedEventss(
      where: { baseTokenId: $marketId }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tradeId
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        price
        amount
        quoteAmount
        timestamp
        blockTimestamp
        transactionHash
      }
    }
  }
`;

/**
 * Query to get user trades
 */
export const GET_USER_TRADES_EVENTS = gql`
  query GetUserTradesEvents($user: String!, $limit: Int!) {
    takerTrades: tradeExecutedEventss(
      where: { taker: $user }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tradeId
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
    makerTrades: tradeExecutedEventss(
      where: { maker: $user }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        tradeId
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
  }
`;

// =============================================================================
// AURUM/AURA ASSET QUERIES
// =============================================================================

/**
 * Query to get all tokenIds owned by a specific node address
 * Uses TransferSingle events to track current ownership
 */
export const GET_NODE_TOKENIDS = gql`
  query GetNodeTokenIds($nodeAddress: Bytes!) {
    # Get all transfers TO the node address
    transfersIn: transferEventss(
      where: { to: $nodeAddress }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        tokenId
        value
        from
        to
        blockTimestamp
        transactionHash
      }
    }

    # Get all transfers FROM the node address
    transfersOut: transferEventss(
      where: { from: $nodeAddress }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        tokenId
        value
        from
        to
        blockTimestamp
        transactionHash
      }
    }
  }
`;

/**
 * Alternative query using MintedAsset events if you want to get
 * assets that were originally minted to this node
 */
export const GET_NODE_MINTED_ASSETS = gql`
  query GetNodeMintedAssets($nodeAddress: Bytes!) {
    mintedAssetEventss(
      where: { account: $nodeAddress }
      orderBy: "blockTimestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        tokenId
        hash
        assetName
        assetClass
        className
        blockTimestamp
        transactionHash
      }
    }
  }
`;

/**
 * Query Ponder indexer for node assets (pricing and capacity)
 */
export const GET_NODE_ASSETS_AURUM = gql`
  query GetNodeAssetsAurum($nodeAddress: String!) {
    nodeAssetss(where: { node: $nodeAddress }) {
      items {
        id
        node
        token
        tokenId
        price
        capacity
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Query Ponder indexer for ALL node assets (pricing and capacity)
 * Note: Ponder uses cursor-based pagination with before/after, not skip
 */
export const GET_ALL_NODE_ASSETS_AURUM = gql`
  query GetAllNodeAssetsAurum($limit: Int!, $after: String) {
    nodeAssetss(
      limit: $limit
      after: $after
      orderBy: "createdAt"
      orderDirection: "desc"
    ) {
      items {
        id
        node
        token
        tokenId
        price
        capacity
        createdAt
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for user balances and asset metadata
 * Updated for Ponder API - uses plural table names and limit instead of first/skip
 */
export const GET_USER_BALANCES_AURA = gql`
  query GetUserBalancesAura($userAddress: String!) {
    userBalancess(where: { user: $userAddress }, limit: 100) {
      items {
        id
        user
        tokenId
        balance
        asset
        firstReceived
        lastUpdated
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for asset metadata by hashes
 */
export const GET_ASSETS_BY_HASHES = gql`
  query GetAssetsByHashes($hashes: [String!]!) {
    assetss(where: { hash_in: $hashes }, limit: 100) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for asset metadata by tokenIds
 * Note: Ponder requires BigInt type for tokenId_in filter, not String
 */
export const GET_ASSETS_BY_TOKEN_IDS = gql`
  query GetAssetsByTokenIds($tokenIds: [BigInt!]!) {
    assetss(where: { tokenId_in: $tokenIds }, limit: 100) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
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

export interface GraphTransferEvent {
  id: string;
  tokenId: string;
  value: string;
  from: string;
  to: string;
  blockTimestamp: string;
}

export interface GraphMintedAsset {
  id: string;
  tokenId: string;
  hash: string;
  assetName: string;
  assetClass: string;
  className: string;
  blockTimestamp: string;
}

// Response interfaces for new queries
export interface NodeAssetAurum {
  id: string;
  node: string;
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserBalanceAura {
  id: string;
  user: string;
  tokenId: string;
  balance: string;
  asset: string; // hash reference
  firstReceived: string;
  lastUpdated: string;
}

export interface AssetAura {
  id: string;
  hash: string;
  tokenId: string;
  name: string;
  assetClass: string;
  className: string;
  account: string;
  amount: string;
  attributes: {
    items: Array<{
      name: string;
      values: string;
      description: string;
    }>;
  };
}

// Ponder returns { nodeAssetss: { items: [...] } } for list queries
export interface NodeAssetsAurumResponse {
  nodeAssets: NodeAssetAurum[]; // Legacy format for compatibility
}

// Helper to extract items from Ponder's paginated response
export function extractPonderNodeAssets(response: {
  nodeAssetss?: { items: NodeAssetAurum[] };
}): NodeAssetAurum[] {
  return response?.nodeAssetss?.items || [];
}

export interface UserBalancesAuraResponse {
  userBalancess: { items: UserBalanceAura[] };
}

export interface AssetsAuraResponse {
  assetss: { items: AssetAura[] };
}

// Paginated list of all assets from AuraAsset subgraph
export const GET_ALL_ASSETS = gql`
  query GetAllAssets($limit: Int!, $after: String) {
    assetss(
      limit: $limit
      after: $after
      orderBy: "tokenId"
      orderDirection: "asc"
    ) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// =============================================================================
// SUPPORTED CLASSES QUERIES (LEGACY - Deprecated in Pure Dumb Indexer)
// =============================================================================

/**
 * Query for all supported asset classes
 * NOTE: In the pure dumb indexer, this table doesn't exist.
 * Asset classes are derived from IPFS metadata instead.
 * This query is kept for backward compatibility but will fail.
 */
export const GET_SUPPORTED_CLASSES = gql`
  query GetSupportedClasses {
    # In pure dumb indexer, we would need to add a SupportedAssetClassAddedEvent
    # and aggregate from raw events. For now, this query will fail.
    # Use getSupportedAssetClassesFromIPFS() instead.
    supportedClassess(where: { isActive: true }, limit: 100) {
      items {
        id
        name
        index
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Response interface for supported classes query
 */
export interface SupportedClassResponse {
  id: string;
  name: string;
  index: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportedClassesResponse {
  supportedClassess: { items: SupportedClassResponse[] };
}

/**
 * Helper to extract supported classes from Ponder response
 */
export function extractPonderSupportedClasses(
  response: SupportedClassesResponse | null | undefined,
): string[] {
  if (!response?.supportedClassess?.items) return [];
  return response.supportedClassess.items
    .filter((item) => item.isActive && item.name)
    .map((item) => item.name);
}

// =============================================================================
// ASSETS BY CLASS QUERY
// =============================================================================

/**
 * Query for assets filtered by asset class
 */
export const GET_ASSETS_BY_CLASS = gql`
  query GetAssetsByClass($assetClass: String!, $limit: Int!, $after: String) {
    assetss(
      where: { assetClass: $assetClass }
      limit: $limit
      after: $after
      orderBy: "tokenId"
      orderDirection: "asc"
    ) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// =============================================================================
// CLOB LEGACY QUERIES (for backward compatibility during migration)
// =============================================================================

/**
 * Legacy query for open orders - kept for compatibility
 */
export const GET_CLOB_OPEN_ORDERS = gql`
  query GetOpenOrders(
    $baseToken: String!
    $baseTokenId: String!
    $limit: Int!
  ) {
    clobOrderss(
      where: {
        baseToken: $baseToken
        baseTokenId: $baseTokenId
        status_in: [0, 1]
      }
      orderBy: "price"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        maker
        price
        amount
        filledAmount
        remainingAmount
        status
        isBuy
        createdAt
      }
    }
  }
`;

export const GET_CLOB_TRADES = gql`
  query GetTrades($baseToken: String!, $baseTokenId: String!, $limit: Int!) {
    clobTradess(
      where: { baseToken: $baseToken, baseTokenId: $baseTokenId }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
  }
`;

export const GET_CLOB_USER_ORDERS = gql`
  query GetUserOrders($maker: String!, $limit: Int!) {
    clobOrderss(
      where: { maker: $maker }
      orderBy: "createdAt"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        maker
        price
        amount
        filledAmount
        remainingAmount
        status
        isBuy
        createdAt
      }
    }
  }
`;

export const GET_CLOB_USER_TRADES = gql`
  query GetUserTrades($user: String!, $limit: Int!) {
    clobTradess(
      where: { taker: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
  }
`;

export const GET_CLOB_BEST_PRICES = gql`
  query GetBestPrices($baseToken: String!, $baseTokenId: String!) {
    bestBids: clobOrderss(
      where: {
        baseToken: $baseToken
        baseTokenId: $baseTokenId
        isBuy: true
        status_in: [0, 1]
      }
      orderBy: "price"
      orderDirection: "desc"
      limit: 1
    ) {
      items {
        price
        amount
        remainingAmount
      }
    }
    bestAsks: clobOrderss(
      where: {
        baseToken: $baseToken
        baseTokenId: $baseTokenId
        isBuy: false
        status_in: [0, 1]
      }
      orderBy: "price"
      orderDirection: "asc"
      limit: 1
    ) {
      items {
        price
        amount
        remainingAmount
      }
    }
  }
`;

// Legacy response interfaces
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
  takerOrderId: string;
  makerOrderId: string;
  taker: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: string;
  amount: string;
  quoteAmount: string;
  timestamp: string;
  transactionHash: string;
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
