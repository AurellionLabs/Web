import { onchainTable, relations, index } from '@ponder/core';

// =============================================================================
// AUSYS TABLES - Orders, Journeys, Signatures, Settlements
// =============================================================================

/**
 * Journey entity - tracks physical delivery progress
 * JourneyStatus: 0=Pending, 1=InTransit, 2=Delivered, 3=Canceled
 */
export const journeys = onchainTable(
  'journeys',
  (t) => ({
    id: t.hex().primaryKey(), // journeyId (bytes32)
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    driver: t.hex(), // Can be null initially
    currentStatus: t.integer().notNull().default(0), // JourneyStatus enum
    bounty: t.bigint().notNull().default(0n),
    journeyStart: t.bigint().notNull().default(0n),
    journeyEnd: t.bigint().notNull().default(0n),
    eta: t.bigint().notNull().default(0n),
    // Parcel data inline
    startLocationLat: t.text().notNull().default(''),
    startLocationLng: t.text().notNull().default(''),
    endLocationLat: t.text().notNull().default(''),
    endLocationLng: t.text().notNull().default(''),
    startName: t.text().notNull().default(''),
    endName: t.text().notNull().default(''),
    // Order reference
    orderId: t.hex(), // Related order (can be null for standalone journeys)
    // Metadata
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    senderIdx: index().on(table.sender),
    receiverIdx: index().on(table.receiver),
    driverIdx: index().on(table.driver),
    orderIdx: index().on(table.orderId),
    statusIdx: index().on(table.currentStatus),
  }),
);

/**
 * Order entity - tracks overall order and payment status
 * OrderStatus: 0=Created, 1=Processing, 2=Settled, 3=Canceled
 */
export const orders = onchainTable(
  'orders',
  (t) => ({
    id: t.hex().primaryKey(), // orderId (bytes32)
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    token: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    tokenQuantity: t.bigint().notNull(),
    requestedTokenQuantity: t.bigint().notNull(),
    price: t.bigint().notNull(), // wei
    txFee: t.bigint().notNull(), // wei
    currentStatus: t.integer().notNull().default(0), // OrderStatus enum
    // Location data inline
    startLocationLat: t.text().notNull().default(''),
    startLocationLng: t.text().notNull().default(''),
    endLocationLat: t.text().notNull().default(''),
    endLocationLng: t.text().notNull().default(''),
    startName: t.text().notNull().default(''),
    endName: t.text().notNull().default(''),
    // Nodes involved (stored as JSON array)
    nodes: t.text().notNull().default('[]'), // JSON array of addresses
    // Metadata
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    statusIdx: index().on(table.currentStatus),
    tokenIdx: index().on(table.token, table.tokenId),
  }),
);

/**
 * Package signature events - tracks who signed for packages
 */
export const packageSignatures = onchainTable(
  'package_signatures',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    journeyId: t.hex().notNull(),
    signer: t.hex().notNull(),
    signatureType: t.text().notNull(), // "sender", "receiver", "driver_pickup", "driver_delivery"
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    journeyIdx: index().on(table.journeyId),
    signerIdx: index().on(table.signer),
  }),
);

/**
 * Driver assignment events
 */
export const driverAssignments = onchainTable(
  'driver_assignments',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    driver: t.hex().notNull(),
    journeyId: t.hex().notNull(),
    assignedBy: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    driverIdx: index().on(table.driver),
    journeyIdx: index().on(table.journeyId),
  }),
);

/**
 * Journey status update events (immutable)
 */
export const journeyStatusUpdates = onchainTable(
  'journey_status_updates',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    journeyId: t.hex().notNull(),
    oldStatus: t.integer().notNull(),
    newStatus: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Order status update events (immutable)
 */
export const orderStatusUpdates = onchainTable('order_status_updates', (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  orderId: t.hex().notNull(),
  oldStatus: t.integer().notNull(),
  newStatus: t.integer().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

/**
 * Order created events (immutable)
 */
export const orderCreatedEvents = onchainTable('order_created_events', (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  orderId: t.hex().notNull(),
  buyer: t.hex().notNull(),
  seller: t.hex().notNull(),
  price: t.bigint().notNull(),
  tokenQuantity: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

/**
 * Journey created events (immutable)
 */
export const journeyCreatedEvents = onchainTable(
  'journey_created_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    journeyId: t.hex().notNull(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    bounty: t.bigint().notNull(),
    eta: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Order settled events (immutable)
 */
export const orderSettledEvents = onchainTable('order_settled_events', (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  orderId: t.hex().notNull(),
  totalPrice: t.bigint().notNull(),
  totalFee: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

/**
 * Funds escrowed events (immutable)
 */
export const fundsEscrowedEvents = onchainTable(
  'funds_escrowed_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    from: t.hex().notNull(),
    amount: t.bigint().notNull(),
    purpose: t.text().notNull().default('escrow'),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Seller paid events (immutable)
 */
export const sellerPaidEvents = onchainTable('seller_paid_events', (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  seller: t.hex().notNull(),
  amount: t.bigint().notNull(),
  orderId: t.hex(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

/**
 * Node fee distributed events (immutable)
 */
export const nodeFeeDistributedEvents = onchainTable(
  'node_fee_distributed_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    node: t.hex().notNull(),
    amount: t.bigint().notNull(),
    orderId: t.hex(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Driver statistics (aggregated)
 */
export const driverStats = onchainTable(
  'driver_stats',
  (t) => ({
    id: t.hex().primaryKey(), // driver address
    driver: t.hex().notNull(),
    totalJourneys: t.bigint().notNull().default(0n),
    completedJourneys: t.bigint().notNull().default(0n),
    canceledJourneys: t.bigint().notNull().default(0n),
    totalEarnings: t.bigint().notNull().default(0n),
    averageRating: t.bigint().notNull().default(0n), // scaled by 1000
    lastActiveAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    driverIdx: index().on(table.driver),
  }),
);

/**
 * Node statistics for AuSys (aggregated)
 */
export const nodeStats = onchainTable(
  'node_stats',
  (t) => ({
    id: t.hex().primaryKey(), // node address
    node: t.hex().notNull(),
    totalOrders: t.bigint().notNull().default(0n),
    completedOrders: t.bigint().notNull().default(0n),
    totalRevenue: t.bigint().notNull().default(0n),
    totalFeesEarned: t.bigint().notNull().default(0n),
    lastActiveAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    nodeIdx: index().on(table.node),
  }),
);

// =============================================================================
// AURUM TABLES - Nodes, NodeAssets, Capacity
// =============================================================================

/**
 * Node entity - represents a physical node in the network
 */
export const nodes = onchainTable(
  'nodes',
  (t) => ({
    id: t.hex().primaryKey(), // node address
    owner: t.hex().notNull(),
    // Location data
    addressName: t.text().notNull().default(''),
    lat: t.text().notNull().default('0'),
    lng: t.text().notNull().default('0'),
    validNode: t.boolean().notNull().default(true),
    status: t.text().notNull().default('Active'), // "Active" or "Inactive"
    // Metadata
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    ownerIdx: index().on(table.owner),
    statusIdx: index().on(table.status),
  }),
);

/**
 * Node asset entity - assets supported by a node with pricing/capacity
 */
export const nodeAssets = onchainTable(
  'node_assets',
  (t) => ({
    id: t.text().primaryKey(), // node-token-tokenId
    node: t.hex().notNull(),
    token: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    price: t.bigint().notNull(), // wei
    capacity: t.bigint().notNull(),
    // Metadata
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    nodeIdx: index().on(table.node),
    tokenIdx: index().on(table.token, table.tokenId),
  }),
);

/**
 * Node registered events (immutable)
 */
export const nodeRegisteredEvents = onchainTable(
  'node_registered_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    nodeAddress: t.hex().notNull(),
    owner: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Node ownership transferred events (immutable)
 */
export const nodeOwnershipTransferredEvents = onchainTable(
  'node_ownership_transferred_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    nodeAddress: t.hex().notNull(),
    oldOwner: t.hex().notNull(),
    newOwner: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Node status updated events (immutable)
 */
export const nodeStatusUpdatedEvents = onchainTable(
  'node_status_updated_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    nodeAddress: t.hex().notNull(),
    status: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Supported asset added events (immutable)
 */
export const supportedAssetAddedEvents = onchainTable(
  'supported_asset_added_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    nodeAddress: t.hex().notNull(),
    token: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    price: t.bigint().notNull(),
    capacity: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Asset capacity aggregation
 */
export const assetCapacity = onchainTable(
  'asset_capacity',
  (t) => ({
    id: t.text().primaryKey(), // token-tokenId
    token: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    totalCapacity: t.bigint().notNull().default(0n),
    totalAllocated: t.bigint().notNull().default(0n),
    availableCapacity: t.bigint().notNull().default(0n),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.token, table.tokenId),
  }),
);

// =============================================================================
// AURA ASSET TABLES - ERC1155 Assets, Transfers, Balances
// =============================================================================

/**
 * Asset entity - ERC1155 asset metadata
 */
export const assets = onchainTable(
  'assets',
  (t) => ({
    id: t.text().primaryKey(), // hash as string
    hash: t.hex().notNull(), // bytes32
    tokenId: t.bigint().notNull(),
    name: t.text().notNull(),
    assetClass: t.text().notNull(),
    className: t.text().notNull(),
    account: t.hex().notNull(), // owner/minter
    amount: t.bigint().notNull(), // minted amount
    // Metadata
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdIdx: index().on(table.tokenId),
    hashIdx: index().on(table.hash),
    accountIdx: index().on(table.account),
  }),
);

/**
 * Asset attribute entity
 */
export const assetAttributes = onchainTable(
  'asset_attributes',
  (t) => ({
    id: t.text().primaryKey(), // hash-attributeIndex
    assetId: t.text().notNull(), // reference to Asset entity
    name: t.text().notNull(),
    values: t.text().notNull().default('[]'), // JSON array
    description: t.text().notNull().default(''),
  }),
  (table) => ({
    assetIdx: index().on(table.assetId),
  }),
);

/**
 * Supported asset entity (for AuraAsset)
 */
export const supportedAssets = onchainTable(
  'supported_assets',
  (t) => ({
    id: t.text().primaryKey(), // name
    name: t.text().notNull(),
    index: t.bigint().notNull(),
    asset: t.text().notNull(), // reference to Asset by hash
    isActive: t.boolean().notNull().default(true),
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    nameIdx: index().on(table.name),
  }),
);

/**
 * Supported class entity
 */
export const supportedClasses = onchainTable('supported_classes', (t) => ({
  id: t.text().primaryKey(), // className
  name: t.text().notNull(),
  index: t.bigint().notNull(),
  isActive: t.boolean().notNull().default(true),
  createdAt: t.bigint().notNull(),
  updatedAt: t.bigint().notNull(),
}));

/**
 * Minted asset events (immutable)
 */
export const mintedAssetEvents = onchainTable(
  'minted_asset_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    account: t.hex().notNull(),
    hash: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    assetName: t.text().notNull(),
    assetClass: t.text().notNull(),
    className: t.text().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    accountIdx: index().on(table.account),
    tokenIdIdx: index().on(table.tokenId),
  }),
);

/**
 * Transfer events (ERC1155 TransferSingle - immutable)
 */
export const transferEvents = onchainTable(
  'transfer_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    operator: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
    tokenIdIdx: index().on(table.tokenId),
  }),
);

/**
 * Transfer batch events (ERC1155 TransferBatch - immutable)
 */
export const transferBatchEvents = onchainTable(
  'transfer_batch_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    operator: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenIds: t.text().notNull(), // JSON array
    amounts: t.text().notNull(), // JSON array
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Token statistics (aggregated)
 */
export const tokenStats = onchainTable(
  'token_stats',
  (t) => ({
    id: t.text().primaryKey(), // tokenId as string
    tokenId: t.bigint().notNull(),
    totalSupply: t.bigint().notNull().default(0n),
    holders: t.bigint().notNull().default(0n),
    transfers: t.bigint().notNull().default(0n),
    asset: t.text().notNull(), // reference to Asset by hash
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    tokenIdIdx: index().on(table.tokenId),
  }),
);

/**
 * User balance entity (aggregated)
 */
export const userBalances = onchainTable(
  'user_balances',
  (t) => ({
    id: t.text().primaryKey(), // userAddress-tokenId
    user: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    balance: t.bigint().notNull().default(0n),
    asset: t.text().notNull(), // reference to Asset by hash
    firstReceived: t.bigint().notNull(),
    lastUpdated: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    tokenIdIdx: index().on(table.tokenId),
  }),
);

// =============================================================================
// AUSTAKE TABLES - Staking Operations
// =============================================================================

/**
 * Operation entity - staking operations
 * OperationStatus: 0=INACTIVE, 1=ACTIVE, 2=COMPLETE, 3=PAID
 */
export const operations = onchainTable(
  'operations',
  (t) => ({
    id: t.hex().primaryKey(), // operationId (bytes32)
    name: t.text().notNull(),
    description: t.text().notNull().default(''),
    token: t.hex().notNull(),
    provider: t.hex().notNull(),
    deadline: t.bigint().notNull(), // days
    startDate: t.bigint().notNull(), // timestamp
    rwaName: t.text().notNull().default(''),
    reward: t.bigint().notNull(), // basis points
    tokenTvl: t.bigint().notNull().default(0n), // wei
    operationStatus: t.text().notNull().default('INACTIVE'), // INACTIVE/ACTIVE/COMPLETE/PAID
    fundingGoal: t.bigint().notNull(), // wei
    assetPrice: t.bigint().notNull(), // wei
    // Metadata
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.token),
    providerIdx: index().on(table.provider),
    statusIdx: index().on(table.operationStatus),
  }),
);

/**
 * Stake entity - individual stakes
 */
export const stakes = onchainTable(
  'stakes',
  (t) => ({
    id: t.text().primaryKey(), // operationId-userAddress
    operationId: t.hex().notNull(),
    user: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(), // wei
    timestamp: t.bigint().notNull(),
    isActive: t.boolean().notNull().default(true),
    // Metadata
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    operationIdx: index().on(table.operationId),
    userIdx: index().on(table.user),
    tokenIdx: index().on(table.token),
  }),
);

/**
 * Operation created events (immutable)
 */
export const operationCreatedEvents = onchainTable(
  'operation_created_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    operationId: t.hex().notNull(),
    name: t.text().notNull(),
    token: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Staked events (immutable)
 */
export const stakedEvents = onchainTable(
  'staked_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    token: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    operationId: t.hex().notNull(),
    eType: t.text().notNull(),
    time: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    operationIdx: index().on(table.operationId),
  }),
);

/**
 * Unstaked events (immutable)
 */
export const unstakedEvents = onchainTable(
  'unstaked_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    token: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    operationId: t.hex().notNull(),
    eType: t.text().notNull(),
    time: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    operationIdx: index().on(table.operationId),
  }),
);

/**
 * Reward paid events (immutable)
 */
export const rewardPaidEvents = onchainTable(
  'reward_paid_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    operationId: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    operationIdx: index().on(table.operationId),
  }),
);

/**
 * Admin status changed events (immutable)
 */
export const adminStatusChangedEvents = onchainTable(
  'admin_status_changed_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    admin: t.hex().notNull(),
    status: t.boolean().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * User statistics for staking (aggregated)
 */
export const userStakeStats = onchainTable(
  'user_stake_stats',
  (t) => ({
    id: t.hex().primaryKey(), // user address
    user: t.hex().notNull(),
    totalStaked: t.bigint().notNull().default(0n),
    totalRewarded: t.bigint().notNull().default(0n),
    activeStakes: t.bigint().notNull().default(0n),
    operationsCount: t.bigint().notNull().default(0n),
    firstStakeAt: t.bigint().notNull(),
    lastActiveAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
  }),
);

/**
 * Token statistics for staking (aggregated)
 */
export const tokenStakeStats = onchainTable(
  'token_stake_stats',
  (t) => ({
    id: t.hex().primaryKey(), // token address
    token: t.hex().notNull(),
    totalTvl: t.bigint().notNull().default(0n),
    totalStakers: t.bigint().notNull().default(0n),
    totalOperations: t.bigint().notNull().default(0n),
    averageReward: t.bigint().notNull().default(0n),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    tokenIdx: index().on(table.token),
  }),
);

// =============================================================================
// CLOB TABLES - Central Limit Order Book
// =============================================================================

/**
 * Order status: 0=Open, 1=PartialFill, 2=Filled, 3=Cancelled
 * Order type: 0=Limit, 1=Market
 */
export const clobOrders = onchainTable(
  'clob_orders',
  (t) => ({
    id: t.hex().primaryKey(), // orderId (bytes32)
    maker: t.hex().notNull(),
    baseToken: t.hex().notNull(), // ERC1155 address
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(), // ERC20 address
    price: t.bigint().notNull(), // wei per unit
    amount: t.bigint().notNull(), // original order amount
    filledAmount: t.bigint().notNull().default(0n),
    remainingAmount: t.bigint().notNull(), // computed: amount - filledAmount
    isBuy: t.boolean().notNull(),
    orderType: t.integer().notNull(), // 0=Limit, 1=Market
    status: t.integer().notNull().default(0), // 0=Open, 1=PartialFill, 2=Filled, 3=Cancelled
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    makerIdx: index().on(table.maker),
    baseTokenIdx: index().on(table.baseToken, table.baseTokenId),
    quoteTokenIdx: index().on(table.quoteToken),
    statusIdx: index().on(table.status),
    priceIdx: index().on(table.price),
  }),
);

/**
 * Trade execution records
 */
export const clobTrades = onchainTable(
  'clob_trades',
  (t) => ({
    id: t.hex().primaryKey(), // tradeId (bytes32)
    takerOrderId: t.hex().notNull(),
    makerOrderId: t.hex().notNull(),
    taker: t.hex().notNull(),
    maker: t.hex().notNull(),
    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    quoteAmount: t.bigint().notNull(), // price * amount
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    takerIdx: index().on(table.taker),
    makerIdx: index().on(table.maker),
    baseTokenIdx: index().on(table.baseToken, table.baseTokenId),
    timestampIdx: index().on(table.timestamp),
  }),
);

/**
 * Liquidity pools for AMM integration
 */
export const clobPools = onchainTable(
  'clob_pools',
  (t) => ({
    id: t.hex().primaryKey(), // poolId (bytes32)
    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(),
    baseReserve: t.bigint().notNull().default(0n),
    quoteReserve: t.bigint().notNull().default(0n),
    totalLpTokens: t.bigint().notNull().default(0n),
    isActive: t.boolean().notNull().default(true),
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    baseTokenIdx: index().on(table.baseToken, table.baseTokenId),
    quoteTokenIdx: index().on(table.quoteToken),
  }),
);

/**
 * Liquidity positions for LP tracking
 */
export const clobLiquidityPositions = onchainTable(
  'clob_liquidity_positions',
  (t) => ({
    id: t.text().primaryKey(), // poolId-provider
    poolId: t.hex().notNull(),
    provider: t.hex().notNull(),
    lpTokens: t.bigint().notNull().default(0n),
    depositedAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.poolId),
    providerIdx: index().on(table.provider),
  }),
);

/**
 * Order placed events (immutable)
 */
export const orderPlacedEvents = onchainTable(
  'order_placed_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    orderId: t.hex().notNull(),
    maker: t.hex().notNull(),
    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    isBuy: t.boolean().notNull(),
    orderType: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    makerIdx: index().on(table.maker),
  }),
);

/**
 * Order matched events (immutable)
 */
export const orderMatchedEvents = onchainTable(
  'order_matched_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    takerOrderId: t.hex().notNull(),
    makerOrderId: t.hex().notNull(),
    tradeId: t.hex().notNull(),
    fillAmount: t.bigint().notNull(),
    fillPrice: t.bigint().notNull(),
    quoteAmount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    takerOrderIdx: index().on(table.takerOrderId),
    makerOrderIdx: index().on(table.makerOrderId),
    tradeIdx: index().on(table.tradeId),
  }),
);

/**
 * Order cancelled events (immutable)
 */
export const orderCancelledEvents = onchainTable(
  'order_cancelled_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    orderId: t.hex().notNull(),
    maker: t.hex().notNull(),
    remainingAmount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
);

/**
 * Trade executed events (immutable)
 */
export const tradeExecutedEvents = onchainTable(
  'trade_executed_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    tradeId: t.hex().notNull(),
    taker: t.hex().notNull(),
    maker: t.hex().notNull(),
    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    quoteAmount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    tradeIdx: index().on(table.tradeId),
    takerIdx: index().on(table.taker),
    makerIdx: index().on(table.maker),
  }),
);

/**
 * Liquidity added events (immutable)
 */
export const liquidityAddedEvents = onchainTable(
  'liquidity_added_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    poolId: t.hex().notNull(),
    provider: t.hex().notNull(),
    baseAmount: t.bigint().notNull(),
    quoteAmount: t.bigint().notNull(),
    lpTokensMinted: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.poolId),
    providerIdx: index().on(table.provider),
  }),
);

/**
 * Liquidity removed events (immutable)
 */
export const liquidityRemovedEvents = onchainTable(
  'liquidity_removed_events',
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    poolId: t.hex().notNull(),
    provider: t.hex().notNull(),
    baseAmount: t.bigint().notNull(),
    quoteAmount: t.bigint().notNull(),
    lpTokensBurned: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.poolId),
    providerIdx: index().on(table.provider),
  }),
);

/**
 * Pool created events (immutable)
 */
export const poolCreatedEvents = onchainTable('pool_created_events', (t) => ({
  id: t.text().primaryKey(), // txHash-logIndex
  poolId: t.hex().notNull(),
  baseToken: t.hex().notNull(),
  baseTokenId: t.bigint().notNull(),
  quoteToken: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

/**
 * Market aggregation - best bid/ask for each market
 */
export const marketData = onchainTable(
  'market_data',
  (t) => ({
    id: t.text().primaryKey(), // baseToken-baseTokenId-quoteToken
    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(),
    bestBidPrice: t.bigint().notNull().default(0n),
    bestBidAmount: t.bigint().notNull().default(0n),
    bestAskPrice: t.bigint().notNull().default(0n),
    bestAskAmount: t.bigint().notNull().default(0n),
    lastTradePrice: t.bigint().notNull().default(0n),
    volume24h: t.bigint().notNull().default(0n),
    tradeCount24h: t.bigint().notNull().default(0n),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    baseTokenIdx: index().on(table.baseToken, table.baseTokenId),
    quoteTokenIdx: index().on(table.quoteToken),
  }),
);

/**
 * User trading statistics
 */
export const userTradingStats = onchainTable(
  'user_trading_stats',
  (t) => ({
    id: t.hex().primaryKey(), // user address
    user: t.hex().notNull(),
    totalOrdersPlaced: t.bigint().notNull().default(0n),
    totalOrdersFilled: t.bigint().notNull().default(0n),
    totalOrdersCancelled: t.bigint().notNull().default(0n),
    totalTradesAsMaker: t.bigint().notNull().default(0n),
    totalTradesAsTaker: t.bigint().notNull().default(0n),
    totalVolumeQuote: t.bigint().notNull().default(0n), // Total quote token volume
    totalFeesPaid: t.bigint().notNull().default(0n),
    firstTradeAt: t.bigint().notNull(),
    lastTradeAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
  }),
);
