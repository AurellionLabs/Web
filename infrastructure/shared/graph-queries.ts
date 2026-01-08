import { gql } from 'graphql-request';
import { OrderStatus, JourneyStatus } from '@/domain/orders/order';

// =====================
// NODE QUERIES (Ponder schema)
// =====================

// Single node by ID
export const GET_NODE_BY_ADDRESS = gql`
  query GetNodeByAddress($nodeAddress: String!) {
    nodes(id: $nodeAddress) {
      id
      owner
      addressName
      lat
      lng
      validNode
      status
      createdAt
      updatedAt
    }
  }
`;

// Multiple nodes by owner (use nodess for list queries with filters)
export const GET_NODES_BY_OWNER = gql`
  query GetNodesByOwner($ownerAddress: String!) {
    nodess(where: { owner: $ownerAddress }) {
      items {
        id
        owner
        addressName
        lat
        lng
        validNode
        status
        createdAt
        updatedAt
      }
    }
  }
`;

// All active nodes with locations (for route calculation)
export const GET_ALL_ACTIVE_NODES = gql`
  query GetAllActiveNodes($limit: Int = 500) {
    nodess(where: { validNode: true }, limit: $limit) {
      items {
        id
        owner
        addressName
        lat
        lng
        validNode
        status
      }
    }
  }
`;

// Response type for GET_ALL_ACTIVE_NODES
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

// All node assets
export const GET_ALL_NODE_ASSETS = gql`
  query GetAllNodeAssets($limit: Int = 1000) {
    nodeAssetss(limit: $limit) {
      items {
        id
        node
        token
        tokenId
        price
        capacity
      }
    }
  }
`;

// Node assets for Aurum (used in TradeProvider)
// Note: Ponder uses cursor-based pagination with limit/after
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

// =====================
// JOURNEY QUERIES (Ponder schema)
// =====================

export const GET_JOURNEYS_BY_SENDER = gql`
  query GetJourneysBySender($senderAddress: String!) {
    journeyss(where: { sender: $senderAddress }) {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

export const GET_JOURNEYS_BY_RECEIVER = gql`
  query GetJourneysByReceiver($receiverAddress: String!) {
    journeyss(where: { receiver: $receiverAddress }) {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

export const GET_JOURNEYS_BY_DRIVER = gql`
  query GetJourneysByDriver($driverAddress: String!) {
    journeyss(where: { driver: $driverAddress }) {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

// Journeys available to accept: no driver assigned and status Pending (0)
// Note: Ponder uses integer comparison for status
export const GET_AVAILABLE_JOURNEYS = gql`
  query GetAvailableJourneys($limit: Int = 100) {
    journeyss(
      limit: $limit
      where: { currentStatus: 0 }
      orderBy: "createdAt"
      orderDirection: "desc"
    ) {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

export const GET_JOURNEY_BY_ID = gql`
  query GetJourneyById($journeyId: String!) {
    journeys(id: $journeyId) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      startLocationLat
      startLocationLng
      endLocationLat
      endLocationLng
      startName
      endName
      orderId
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_JOURNEYS = gql`
  query GetAllJourneys($limit: Int = 100) {
    journeyss(limit: $limit, orderBy: "createdAt", orderDirection: "desc") {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

// =====================
// ORDER QUERIES (Ponder schema)
// =====================

export const GET_ORDERS_BY_BUYER = gql`
  query GetOrdersByBuyer($buyerAddress: String!) {
    orderss(where: { buyer: $buyerAddress }) {
      items {
        id
        buyer
        seller
        token
        tokenId
        tokenQuantity
        requestedTokenQuantity
        price
        txFee
        currentStatus
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        nodes
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_ORDERS_BY_SELLER = gql`
  query GetOrdersBySeller($sellerAddress: String!) {
    orderss(where: { seller: $sellerAddress }) {
      items {
        id
        buyer
        seller
        token
        tokenId
        tokenQuantity
        requestedTokenQuantity
        price
        txFee
        currentStatus
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        nodes
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_ORDER_BY_ID = gql`
  query GetOrderById($orderId: String!) {
    orders(id: $orderId) {
      id
      buyer
      seller
      token
      tokenId
      tokenQuantity
      requestedTokenQuantity
      price
      txFee
      currentStatus
      startLocationLat
      startLocationLng
      endLocationLat
      endLocationLng
      startName
      endName
      nodes
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORDERS_BY_NODE = gql`
  query GetOrdersByNode($nodeAddress: String!) {
    orderss(where: { nodes_contains: $nodeAddress }) {
      items {
        id
        buyer
        seller
        token
        tokenId
        tokenQuantity
        requestedTokenQuantity
        price
        txFee
        currentStatus
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        nodes
        createdAt
        updatedAt
      }
    }
  }
`;

// Fetch journeys associated to an order by order ID
export const GET_JOURNEYS_BY_ORDER_ID = gql`
  query GetJourneysByOrderId($orderId: String!) {
    journeyss(where: { orderId: $orderId }) {
      items {
        id
      }
    }
  }
`;

// =====================
// ASSET QUERIES (Ponder schema)
// =====================

export const GET_NODE_TOKENIDS = gql`
  query GetNodeTokenIds($nodeAddress: String!) {
    nodeAssetss(where: { node: $nodeAddress }) {
      items {
        tokenId
      }
    }
  }
`;

export const GET_NODE_MINTED_ASSETS = gql`
  query GetNodeMintedAssets($nodeAddress: String!) {
    nodeAssetss(where: { node: $nodeAddress }) {
      items {
        id
        tokenId
        token
        capacity
        price
      }
    }
  }
`;

export const GET_NODE_ASSETS_COMPLETE = gql`
  query GetNodeAssetsComplete($nodeAddress: String!) {
    nodeAssetss(where: { node: $nodeAddress }) {
      items {
        id
        node
        token
        tokenId
        capacity
        price
        createdAt
        updatedAt
      }
    }
  }
`;

// =====================
// ASSET METADATA QUERIES (for assets table)
// Updated for Ponder schema: uses hash, assetClass, className, account, amount
// =====================

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

export const GET_ASSET_BY_TOKEN_ID = gql`
  query GetAssetByTokenId($tokenId: BigInt!) {
    assetss(where: { tokenId: $tokenId }, limit: 1) {
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

// =====================
// AGGREGATION QUERIES (Ponder schema)
// =====================

export const GET_ASSET_CAPACITY_AGGREGATION = gql`
  query GetAssetCapacityAggregation {
    assetCapacitys(limit: 1000) {
      items {
        id
        token
        tokenId
        totalCapacity
      }
    }
  }
`;

export const GET_DRIVER_STATISTICS = gql`
  query GetDriverStatistics($driverAddress: String!) {
    driverStats(id: $driverAddress) {
      id
      totalJourneys
      completedJourneys
      totalEarnings
    }
  }
`;

// =====================
// CLOB / TRADING QUERIES (Ponder schema)
// =====================

// Get open orders for a specific market (baseToken + baseTokenId)
export const GET_CLOB_OPEN_ORDERS = gql`
  query GetCLOBOpenOrders(
    $baseToken: String!
    $baseTokenId: BigInt!
    $limit: Int = 50
  ) {
    clobOrderss(
      where: {
        baseToken: $baseToken
        baseTokenId: $baseTokenId
        status_in: [0, 1]
      }
      limit: $limit
      orderBy: "price"
      orderDirection: "asc"
    ) {
      items {
        id
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        filledAmount
        remainingAmount
        isBuy
        orderType
        status
        createdAt
      }
    }
  }
`;

// Get recent trades for a market
export const GET_CLOB_TRADES = gql`
  query GetCLOBTrades(
    $baseToken: String!
    $baseTokenId: BigInt!
    $limit: Int = 50
  ) {
    clobTradess(
      where: { baseToken: $baseToken, baseTokenId: $baseTokenId }
      limit: $limit
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
  }
`;

// Get order history for a user
export const GET_CLOB_USER_ORDERS = gql`
  query GetCLOBUserOrders($maker: String!, $limit: Int = 50) {
    clobOrderss(
      where: { maker: $maker }
      limit: $limit
      orderBy: "createdAt"
      orderDirection: "desc"
    ) {
      items {
        id
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        filledAmount
        remainingAmount
        isBuy
        orderType
        status
        createdAt
      }
    }
  }
`;

// Get user's trade history
export const GET_CLOB_USER_TRADES = gql`
  query GetCLOBUserTrades($user: String!, $limit: Int = 50) {
    clobTradess(
      where: { OR: [{ taker: $user }, { maker: $user }] }
      limit: $limit
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        takerOrderId
        makerOrderId
        taker
        maker
        baseToken
        baseTokenId
        quoteToken
        price
        amount
        quoteAmount
        timestamp
        transactionHash
      }
    }
  }
`;

// Get best bid and ask for a market
export const GET_CLOB_BEST_PRICES = gql`
  query GetCLOBBestPrices($baseToken: String!, $baseTokenId: BigInt!) {
    # Best bid (highest buy price)
    bestBids: clobOrderss(
      where: {
        baseToken: $baseToken
        baseTokenId: $baseTokenId
        isBuy: true
        status: 0
      }
      limit: 1
      orderBy: "price"
      orderDirection: "desc"
    ) {
      items {
        price
        amount
        remainingAmount
      }
    }
    # Best ask (lowest sell price)
    bestAsks: clobOrderss(
      where: {
        baseToken: $baseToken
        baseTokenId: $baseTokenId
        isBuy: false
        status: 0
      }
      limit: 1
      orderBy: "price"
      orderDirection: "asc"
    ) {
      items {
        price
        amount
        remainingAmount
      }
    }
  }
`;

// CLOB response types
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
  isBuy: boolean;
  orderType: string;
  status: string;
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
    items: { price: string; amount: string; remainingAmount: string }[];
  };
  bestAsks: {
    items: { price: string; amount: string; remainingAmount: string }[];
  };
}

// =====================
// RESPONSE TYPES (Updated for Ponder's flat structure)
// =====================

// Ponder returns flat structure, no nested location object
export interface NodeGraphResponse {
  id: string;
  owner: string;
  addressName: string;
  lat: string;
  lng: string;
  validNode: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// Ponder returns flat structure, no nested parcelData object
export interface JourneyGraphResponse {
  id: string;
  sender: string;
  receiver: string;
  driver: string;
  currentStatus: string;
  bounty: string;
  journeyStart: string;
  journeyEnd: string;
  eta: string;
  startLocationLat: string;
  startLocationLng: string;
  endLocationLat: string;
  endLocationLng: string;
  startName: string;
  endName: string;
  orderId: string;
  createdAt: string;
  updatedAt?: string;
}

// Ponder returns flat structure, no nested locationData object
export interface OrderGraphResponse {
  id: string;
  buyer: string;
  seller: string;
  token: string;
  tokenId: string;
  tokenQuantity: string;
  requestedTokenQuantity: string;
  price: string;
  txFee: string;
  currentStatus: string;
  startLocationLat: string;
  startLocationLng: string;
  endLocationLat: string;
  endLocationLng: string;
  startName: string;
  endName: string;
  nodes: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface NodeAssetGraphResponse {
  id: string;
  node: string;
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssetGraphResponse {
  id: string;
  tokenId: string;
  name: string;
  class: string;
  unit: string;
  description: string;
  imageUri: string;
  totalSupply: string;
  createdAt: string;
  updatedAt?: string;
}

// Legacy types for compatibility (deprecated)
export interface NodeAssetsGraphResponse {
  nodeAssets: {
    tokenId: string;
    name: string;
    class: string;
    fileHash: string;
    mintEvents: {
      amount: string;
      blockTimestamp: string;
    }[];
    transferEvents: {
      from: string;
      to: string;
      amount: string;
      blockTimestamp: string;
    }[];
  }[];
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Calculate current balances from mint/transfer events (legacy, kept for compatibility)
 */
export function calculateCurrentBalances(
  nodeAssets: NodeAssetsGraphResponse['nodeAssets'],
) {
  const balances: { [tokenId: string]: number } = {};

  nodeAssets.forEach((asset) => {
    let balance = 0;

    // Add minted amounts
    asset.mintEvents.forEach((mint) => {
      balance += parseInt(mint.amount);
    });

    // Subtract transferred amounts (outgoing)
    asset.transferEvents.forEach((transfer) => {
      if (transfer.from !== '0x0000000000000000000000000000000000000000') {
        balance -= parseInt(transfer.amount);
      }
      if (transfer.to !== '0x0000000000000000000000000000000000000000') {
        balance += parseInt(transfer.amount);
      }
    });

    balances[asset.tokenId] = balance;
  });

  return balances;
}

/**
 * Helper: Convert contract/graph numeric status to JourneyStatus enum
 * Exported for use in repositories
 */
export function convertNumericToJourneyStatus(
  status: string | number | bigint,
): JourneyStatus {
  const statusNum = Number(status);
  switch (statusNum) {
    case 0:
      return JourneyStatus.PENDING;
    case 1:
      return JourneyStatus.IN_TRANSIT;
    case 2:
      return JourneyStatus.DELIVERED;
    case 3:
      return JourneyStatus.CANCELLED;
    default:
      console.warn(`Unknown journey status: ${status}`);
      return JourneyStatus.PENDING;
  }
}

/**
 * Convert Graph response to domain Journey (updated for Ponder's flat structure)
 */
export function convertGraphJourneyToDomain(
  graphJourney: JourneyGraphResponse,
) {
  return {
    parcelData: {
      startLocation: {
        lat: graphJourney.startLocationLat,
        lng: graphJourney.startLocationLng,
      },
      endLocation: {
        lat: graphJourney.endLocationLat,
        lng: graphJourney.endLocationLng,
      },
      startName: graphJourney.startName,
      endName: graphJourney.endName,
    },
    journeyId: graphJourney.id,
    currentStatus: convertNumericToJourneyStatus(graphJourney.currentStatus),
    sender: graphJourney.sender,
    receiver: graphJourney.receiver,
    driver: graphJourney.driver,
    journeyStart: BigInt(graphJourney.journeyStart || '0'),
    journeyEnd: BigInt(graphJourney.journeyEnd || '0'),
    bounty: BigInt(graphJourney.bounty || '0'),
    ETA: BigInt(graphJourney.eta || '0'),
  };
}

/**
 * Helper: Convert contract/graph numeric status to OrderStatus enum
 * Exported for use in repositories
 */
export function convertNumericToOrderStatus(
  status: string | number | bigint,
): OrderStatus {
  const statusNum = Number(status);
  switch (statusNum) {
    case 0:
      return OrderStatus.CREATED;
    case 1:
      return OrderStatus.PROCESSING;
    case 2:
      return OrderStatus.SETTLED;
    case 3:
      return OrderStatus.CANCELLED;
    default:
      console.warn(`Unknown order status: ${status}`);
      return OrderStatus.CREATED;
  }
}

/**
 * Convert Graph response to domain Order (updated for Ponder's flat structure)
 */
export function convertGraphOrderToDomain(graphOrder: OrderGraphResponse) {
  const domainOrder: any = {
    id: graphOrder.id,
    token: graphOrder.token,
    tokenId: graphOrder.tokenId,
    tokenQuantity: graphOrder.tokenQuantity,
    requestedTokenQuantity: graphOrder.requestedTokenQuantity,
    price: graphOrder.price,
    txFee: graphOrder.txFee,
    buyer: graphOrder.buyer,
    seller: graphOrder.seller,
    journeyIds: [],
    nodes: graphOrder.nodes || [],
    locationData: {
      startLocation: {
        lat: graphOrder.startLocationLat,
        lng: graphOrder.startLocationLng,
      },
      endLocation: {
        lat: graphOrder.endLocationLat,
        lng: graphOrder.endLocationLng,
      },
      startName: graphOrder.startName,
      endName: graphOrder.endName,
    },
    currentStatus: convertNumericToOrderStatus(graphOrder.currentStatus),
    contractualAgreement: '',
  };
  return domainOrder;
}

/**
 * Convert Graph response to domain Node (updated for Ponder's flat structure)
 */
export function convertGraphNodeToDomain(node: NodeGraphResponse) {
  return {
    address: node.id,
    location: {
      addressName: node.addressName,
      location: { lat: node.lat, lng: node.lng },
    },
    validNode: Boolean(node.validNode),
    owner: node.owner,
    assets: [],
    status: ((s: string) => {
      const x = (s || '').toLowerCase();
      if (x === 'active' || x === '1' || x === 'true' || x === '0x01')
        return 'Active';
      return 'Inactive';
    })(node.status),
  } as any;
}

/**
 * Extract items from Ponder's paginated response
 * Ponder returns { items: [...] } for list queries
 */
export function extractPonderItems<T>(response: { items?: T[] } | T[]): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  return response?.items || [];
}
