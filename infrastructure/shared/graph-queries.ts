import { gql } from 'graphql-request';
import { OrderStatus, JourneyStatus } from '@/domain/orders/order';

// =====================
// NODE QUERIES
// =====================

export const GET_NODE_BY_ADDRESS = gql`
  query GetNodeByAddress($nodeAddress: String!) {
    node(id: $nodeAddress) {
      id
      owner
      location {
        addressName
        lat
        lng
      }
      validNode
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_NODES_BY_OWNER = gql`
  query GetNodesByOwner($ownerAddress: String!) {
    nodes(where: { owner: $ownerAddress }) {
      id
      owner
      location {
        addressName
        lat
        lng
      }
      validNode
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_NODE_ASSETS = gql`
  query GetAllNodeAssets {
    nodeAssets(first: 1000) {
      token
      tokenId
      capacity
    }
  }
`;

// =====================
// JOURNEY QUERIES
// =====================

export const GET_JOURNEYS_BY_SENDER = gql`
  query GetJourneysBySender($senderAddress: String!) {
    journeys(where: { sender: $senderAddress }) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      parcelData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      createdAt
    }
  }
`;

export const GET_JOURNEYS_BY_RECEIVER = gql`
  query GetJourneysByReceiver($receiverAddress: String!) {
    journeys(where: { receiver: $receiverAddress }) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      parcelData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      createdAt
    }
  }
`;

export const GET_JOURNEYS_BY_DRIVER = gql`
  query GetJourneysByDriver($driverAddress: String!) {
    journeys(where: { driver: $driverAddress }) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      parcelData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      createdAt
    }
  }
`;

// Journeys available to accept: no driver assigned and status Pending (0)
export const GET_AVAILABLE_JOURNEYS = gql`
  query GetAvailableJourneys($first: Int = 100, $skip: Int = 0) {
    journeys(
      first: $first
      skip: $skip
      where: { driver: null, currentStatus: 0 }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      parcelData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      createdAt
    }
  }
`;

export const GET_JOURNEY_BY_ID = gql`
  query GetJourneyById($journeyId: String!) {
    journey(id: $journeyId) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      parcelData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_JOURNEYS = gql`
  query GetAllJourneys($first: Int = 100, $skip: Int = 0) {
    journeys(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      parcelData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      createdAt
    }
  }
`;

// =====================
// ORDER QUERIES
// =====================

export const GET_ORDERS_BY_BUYER = gql`
  query GetOrdersByBuyer($buyerAddress: String!) {
    orders(where: { buyer: $buyerAddress }) {
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
      locationData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      nodes
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORDERS_BY_SELLER = gql`
  query GetOrdersBySeller($sellerAddress: String!) {
    orders(where: { seller: $sellerAddress }) {
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
      locationData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      nodes
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORDER_BY_ID = gql`
  query GetOrderById($orderId: String!) {
    order(id: $orderId) {
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
      locationData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      nodes
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORDERS_BY_NODE = gql`
  query GetOrdersByNode($nodeAddress: String!) {
    orders(where: { nodes_contains: [$nodeAddress] }) {
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
      locationData {
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
      }
      nodes
      createdAt
      updatedAt
    }
  }
`;

// Fetch journeys associated to an order by order ID
export const GET_JOURNEYS_BY_ORDER_ID = gql`
  query GetJourneysByOrderId($orderId: String!) {
    journeys(where: { order: $orderId }) {
      id
    }
  }
`;

// =====================
// ASSET QUERIES (existing, kept for compatibility)
// =====================

export const GET_NODE_TOKENIDS = gql`
  query GetNodeTokenIds($nodeAddress: String!) {
    nodeAssets(where: { nodeAddress: $nodeAddress }) {
      tokenId
    }
  }
`;

export const GET_NODE_MINTED_ASSETS = gql`
  query GetNodeMintedAssets($nodeAddress: String!) {
    nodeAssets(where: { nodeAddress: $nodeAddress }) {
      tokenId
      name
      class
      fileHash
      mintEvents {
        amount
        blockTimestamp
      }
    }
  }
`;

export const GET_NODE_ASSETS_COMPLETE = gql`
  query GetNodeAssetsComplete($nodeAddress: String!) {
    nodeAssets(where: { nodeAddress: $nodeAddress }) {
      tokenId
      name
      class
      fileHash
      mintEvents {
        amount
        blockTimestamp
      }
      transferEvents {
        from
        to
        amount
        blockTimestamp
      }
    }
  }
`;

// =====================
// AGGREGATION QUERIES
// =====================

export const GET_ASSET_CAPACITY_AGGREGATION = gql`
  query GetAssetCapacityAggregation {
    assetCapacities {
      token
      tokenId
      totalCapacity
      totalAllocated
      availableCapacity
      nodes {
        id
        capacity
      }
    }
  }
`;

export const GET_DRIVER_STATISTICS = gql`
  query GetDriverStatistics($driverAddress: String!) {
    driver(id: $driverAddress) {
      id
      totalJourneys
      completedJourneys
      totalEarnings
      averageRating
      journeys(first: 10, orderBy: createdAt, orderDirection: desc) {
        id
        currentStatus
        bounty
        journeyStart
        journeyEnd
      }
    }
  }
`;

// =====================
// RESPONSE TYPES
// =====================

export interface NodeGraphResponse {
  id: string;
  owner: string;
  location: {
    addressName: string;
    lat: string;
    lng: string;
  };
  validNode: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

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
  parcelData: {
    startLocationLat: string;
    startLocationLng: string;
    endLocationLat: string;
    endLocationLng: string;
    startName: string;
    endName: string;
  };
  createdAt: string;
  updatedAt?: string;
}

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
  locationData: {
    startLocationLat: string;
    startLocationLng: string;
    endLocationLat: string;
    endLocationLng: string;
    startName: string;
    endName: string;
  };
  nodes: string[];
  createdAt: string;
  updatedAt?: string;
}

// Existing types for compatibility
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
 * Calculate current balances from mint/transfer events (existing function, kept for compatibility)
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
 * Convert Graph response to domain Journey
 */
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

export function convertGraphJourneyToDomain(
  graphJourney: JourneyGraphResponse,
) {
  return {
    parcelData: {
      startLocation: {
        lat: graphJourney.parcelData.startLocationLat,
        lng: graphJourney.parcelData.startLocationLng,
      },
      endLocation: {
        lat: graphJourney.parcelData.endLocationLat,
        lng: graphJourney.parcelData.endLocationLng,
      },
      startName: graphJourney.parcelData.startName,
      endName: graphJourney.parcelData.endName,
    },
    journeyId: graphJourney.id,
    currentStatus: convertNumericToJourneyStatus(graphJourney.currentStatus),
    sender: graphJourney.sender,
    receiver: graphJourney.receiver,
    driver: graphJourney.driver,
    journeyStart: BigInt(graphJourney.journeyStart),
    journeyEnd: BigInt(graphJourney.journeyEnd),
    bounty: BigInt(graphJourney.bounty),
    ETA: BigInt(graphJourney.eta),
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
 * Convert Graph response to domain Order
 */
export function convertGraphOrderToDomain(graphOrder: OrderGraphResponse) {
  const domainOrder: any = {
    id: graphOrder.id,
    token: graphOrder.token,
    tokenId: graphOrder.tokenId,
    tokenQuantity: graphOrder.tokenQuantity, // This is a count, not a USDT value
    requestedTokenQuantity: graphOrder.requestedTokenQuantity,
    price: graphOrder.price,
    txFee: graphOrder.txFee,
    buyer: graphOrder.buyer,
    seller: graphOrder.seller,
    journeyIds: [],
    nodes: graphOrder.nodes,
    locationData: {
      startLocation: {
        lat: graphOrder.locationData.startLocationLat,
        lng: graphOrder.locationData.startLocationLng,
      },
      endLocation: {
        lat: graphOrder.locationData.endLocationLat,
        lng: graphOrder.locationData.endLocationLng,
      },
      startName: graphOrder.locationData.startName,
      endName: graphOrder.locationData.endName,
    },
    currentStatus: convertNumericToOrderStatus(graphOrder.currentStatus),
    contractualAgreement: '', // Default empty string for now
  };
  return domainOrder;
}

// Optional: Node converter for convenience
export function convertGraphNodeToDomain(node: NodeGraphResponse) {
  return {
    address: node.id,
    location: {
      addressName: node.location.addressName,
      location: { lat: node.location.lat, lng: node.location.lng },
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
