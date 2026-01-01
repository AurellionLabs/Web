/**
 * Integrated CLOB + Logistics Schema
 *
 * Flow:
 * 1. Nodes list inventory → Creates CLOB sell orders
 * 2. Buyers place buy orders → CLOB matches
 * 3. Match triggers → Ausys Order created
 * 4. Order created → Journey assigned to driver
 * 5. Delivery confirmed → Settlement + token transfer
 */

import { onchainTable, index, relations } from 'ponder';

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * Node: Physical locations that hold and sell tokenized assets
 */
export const nodes = onchainTable(
  'nodes',
  (t) => ({
    id: t.hex().primaryKey(), // Node address
    owner: t.hex().notNull(),
    addressName: t.text().notNull(),
    lat: t.text().notNull(),
    lng: t.text().notNull(),
    validNode: t.boolean().notNull(),
    status: t.text().notNull(), // Active/Inactive

    // Aggregated stats
    totalListings: t.bigint().notNull().default(0n),
    totalSales: t.bigint().notNull().default(0n),
    totalVolume: t.bigint().notNull().default(0n),
    averageRating: t.bigint().notNull().default(0n),

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
 * NodeInventory: What a node has available to sell
 * This becomes the source of CLOB sell-side liquidity
 */
export const nodeInventory = onchainTable(
  'node_inventory',
  (t) => ({
    id: t.text().primaryKey(), // node-token-tokenId
    nodeId: t.hex().notNull(),
    token: t.hex().notNull(), // AuraAsset contract
    tokenId: t.bigint().notNull(),

    // Inventory management
    totalCapacity: t.bigint().notNull(), // Max they can hold
    availableQuantity: t.bigint().notNull(), // Currently available
    reservedQuantity: t.bigint().notNull(), // Locked in pending orders

    // Pricing
    basePrice: t.bigint().notNull(), // Node's asking price

    // Auto-listing settings
    autoList: t.boolean().notNull().default(true),
    minOrderSize: t.bigint().notNull().default(1n),
    maxOrderSize: t.bigint(), // null = no limit

    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    nodeIdx: index().on(table.nodeId),
    tokenIdx: index().on(table.token, table.tokenId),
  }),
);

// =============================================================================
// CLOB - ORDER BOOK
// =============================================================================

/**
 * OrderBook: Aggregated view of a trading pair
 */
export const orderBooks = onchainTable(
  'order_books',
  (t) => ({
    id: t.text().primaryKey(), // token-tokenId-quoteToken
    baseToken: t.hex().notNull(), // AuraAsset contract
    baseTokenId: t.bigint().notNull(), // Which asset
    quoteToken: t.hex().notNull(), // Payment token (USDC, etc.)

    // Order book stats
    bestBid: t.bigint(), // Highest buy price
    bestAsk: t.bigint(), // Lowest sell price
    spread: t.bigint(), // bestAsk - bestBid

    totalBuyOrders: t.bigint().notNull().default(0n),
    totalSellOrders: t.bigint().notNull().default(0n),
    totalBuyVolume: t.bigint().notNull().default(0n),
    totalSellVolume: t.bigint().notNull().default(0n),

    // 24h stats
    volume24h: t.bigint().notNull().default(0n),
    trades24h: t.bigint().notNull().default(0n),
    high24h: t.bigint(),
    low24h: t.bigint(),
    lastPrice: t.bigint(),

    isActive: t.boolean().notNull().default(true),
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    pairIdx: index().on(table.baseToken, table.baseTokenId, table.quoteToken),
  }),
);

/**
 * MarketOrder: Buy/Sell orders on the CLOB
 */
export const marketOrders = onchainTable(
  'market_orders',
  (t) => ({
    id: t.hex().primaryKey(), // Order ID from contract
    orderBookId: t.text().notNull(),

    // Order details
    maker: t.hex().notNull(), // Who placed the order
    nodeId: t.hex(), // If sell order from a node

    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(),

    // Order parameters
    side: t.text().notNull(), // 'buy' | 'sell'
    orderType: t.text().notNull(), // 'limit' | 'market'
    price: t.bigint().notNull(), // Price per unit
    quantity: t.bigint().notNull(), // Total quantity
    filledQuantity: t.bigint().notNull().default(0n),
    remainingQuantity: t.bigint().notNull(),

    // Status
    status: t.text().notNull(), // 'open' | 'partial' | 'filled' | 'cancelled'

    // Timing
    expiresAt: t.bigint(), // Optional expiration
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderBookIdx: index().on(table.orderBookId),
    makerIdx: index().on(table.maker),
    nodeIdx: index().on(table.nodeId),
    statusIdx: index().on(table.status),
    priceIdx: index().on(table.side, table.price),
  }),
);

/**
 * Trade: Executed match between orders
 * This triggers the logistics flow
 */
export const trades = onchainTable(
  'trades',
  (t) => ({
    id: t.hex().primaryKey(), // Trade ID
    orderBookId: t.text().notNull(),

    // Matched orders
    buyOrderId: t.hex().notNull(),
    sellOrderId: t.hex().notNull(),

    // Parties
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(), // Could be a node
    sellerNodeId: t.hex(), // If seller is a node

    // Trade details
    baseToken: t.hex().notNull(),
    baseTokenId: t.bigint().notNull(),
    quoteToken: t.hex().notNull(),
    price: t.bigint().notNull(),
    quantity: t.bigint().notNull(),
    quoteAmount: t.bigint().notNull(), // price * quantity

    // Fees
    protocolFee: t.bigint().notNull(),
    nodeFee: t.bigint().notNull(),

    // Linked logistics order (created after match)
    logisticsOrderId: t.hex(),

    // Settlement status
    settlementStatus: t.text().notNull(), // 'pending' | 'in_transit' | 'delivered' | 'settled' | 'disputed'

    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderBookIdx: index().on(table.orderBookId),
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    nodeIdx: index().on(table.sellerNodeId),
    logisticsIdx: index().on(table.logisticsOrderId),
    settlementIdx: index().on(table.settlementStatus),
  }),
);

// =============================================================================
// LOGISTICS - ORDER FULFILLMENT
// =============================================================================

/**
 * LogisticsOrder: Physical fulfillment order created from trade match
 */
export const logisticsOrders = onchainTable(
  'logistics_orders',
  (t) => ({
    id: t.hex().primaryKey(), // Order ID

    // Link to trade
    tradeId: t.hex().notNull(),

    // Parties
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    sellerNodeId: t.hex().notNull(), // Fulfilling node

    // Asset details
    token: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    quantity: t.bigint().notNull(),

    // Financials
    totalPrice: t.bigint().notNull(),
    escrowedAmount: t.bigint().notNull(),
    txFee: t.bigint().notNull(),
    nodeFee: t.bigint().notNull(),
    driverBounty: t.bigint().notNull(),

    // Locations
    pickupLat: t.text().notNull(),
    pickupLng: t.text().notNull(),
    pickupName: t.text().notNull(),
    deliveryLat: t.text().notNull(),
    deliveryLng: t.text().notNull(),
    deliveryName: t.text().notNull(),

    // Status
    status: t.text().notNull(), // 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'settled' | 'cancelled' | 'disputed'

    // Timestamps
    createdAt: t.bigint().notNull(),
    assignedAt: t.bigint(),
    pickedUpAt: t.bigint(),
    deliveredAt: t.bigint(),
    settledAt: t.bigint(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    tradeIdx: index().on(table.tradeId),
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    nodeIdx: index().on(table.sellerNodeId),
    statusIdx: index().on(table.status),
  }),
);

/**
 * Driver: Delivery drivers in the network
 */
export const drivers = onchainTable(
  'drivers',
  (t) => ({
    id: t.hex().primaryKey(), // Driver address

    // Status
    isActive: t.boolean().notNull().default(true),
    isAvailable: t.boolean().notNull().default(true),

    // Current location (for matching)
    currentLat: t.text(),
    currentLng: t.text(),

    // Stats
    totalDeliveries: t.bigint().notNull().default(0n),
    completedDeliveries: t.bigint().notNull().default(0n),
    cancelledDeliveries: t.bigint().notNull().default(0n),
    totalEarnings: t.bigint().notNull().default(0n),
    averageRating: t.bigint().notNull().default(0n), // Scaled by 100 (e.g., 450 = 4.50)

    // Current assignment
    currentOrderId: t.hex(),

    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    availableIdx: index().on(table.isActive, table.isAvailable),
  }),
);

/**
 * DriverAssignment: Links drivers to logistics orders
 */
export const driverAssignments = onchainTable(
  'driver_assignments',
  (t) => ({
    id: t.text().primaryKey(), // order-driver
    orderId: t.hex().notNull(),
    driverId: t.hex().notNull(),

    // Assignment details
    estimatedPickupTime: t.bigint(),
    estimatedDeliveryTime: t.bigint(),
    actualPickupTime: t.bigint(),
    actualDeliveryTime: t.bigint(),

    // Bounty
    bountyAmount: t.bigint().notNull(),
    bonusAmount: t.bigint().notNull().default(0n),

    // Status
    status: t.text().notNull(), // 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'

    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    driverIdx: index().on(table.driverId),
    statusIdx: index().on(table.status),
  }),
);

/**
 * DriverNotification: Notifications sent to drivers for available orders
 */
export const driverNotifications = onchainTable(
  'driver_notifications',
  (t) => ({
    id: t.text().primaryKey(), // order-driver-timestamp
    orderId: t.hex().notNull(),
    driverId: t.hex().notNull(),

    // Notification details
    notificationType: t.text().notNull(), // 'new_order' | 'order_cancelled' | 'bonus_available'
    message: t.text().notNull(),

    // Order preview
    pickupLocation: t.text().notNull(),
    deliveryLocation: t.text().notNull(),
    estimatedDistance: t.bigint(), // meters
    bountyAmount: t.bigint().notNull(),

    // Response
    status: t.text().notNull(), // 'pending' | 'viewed' | 'accepted' | 'declined' | 'expired'
    respondedAt: t.bigint(),

    expiresAt: t.bigint().notNull(),
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    driverIdx: index().on(table.driverId),
    statusIdx: index().on(table.status),
  }),
);

// =============================================================================
// SIGNATURES & VERIFICATION
// =============================================================================

/**
 * DeliverySignature: Proof of pickup/delivery
 */
export const deliverySignatures = onchainTable(
  'delivery_signatures',
  (t) => ({
    id: t.text().primaryKey(), // order-signer-type
    orderId: t.hex().notNull(),

    signer: t.hex().notNull(),
    signerRole: t.text().notNull(), // 'seller' | 'driver' | 'buyer'
    signatureType: t.text().notNull(), // 'pickup_confirm' | 'delivery_confirm' | 'receipt_confirm'

    // Verification
    signatureHash: t.hex().notNull(),

    // Location at signing
    lat: t.text(),
    lng: t.text(),

    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    signerIdx: index().on(table.signer),
  }),
);

// =============================================================================
// SETTLEMENT & PAYMENTS
// =============================================================================

/**
 * Escrow: Funds held during order fulfillment
 */
export const escrows = onchainTable(
  'escrows',
  (t) => ({
    id: t.hex().primaryKey(), // Order ID
    orderId: t.hex().notNull(),

    // Amounts
    totalAmount: t.bigint().notNull(),
    sellerAmount: t.bigint().notNull(),
    nodeFeeAmount: t.bigint().notNull(),
    driverBountyAmount: t.bigint().notNull(),
    protocolFeeAmount: t.bigint().notNull(),

    // Token
    token: t.hex().notNull(), // Payment token

    // Status
    status: t.text().notNull(), // 'held' | 'releasing' | 'released' | 'refunded' | 'disputed'

    // Release tracking
    sellerPaid: t.boolean().notNull().default(false),
    nodePaid: t.boolean().notNull().default(false),
    driverPaid: t.boolean().notNull().default(false),

    createdAt: t.bigint().notNull(),
    releasedAt: t.bigint(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    statusIdx: index().on(table.status),
  }),
);

/**
 * Payment: Individual payment records
 */
export const payments = onchainTable(
  'payments',
  (t) => ({
    id: t.text().primaryKey(), // order-recipient-type
    orderId: t.hex().notNull(),

    recipient: t.hex().notNull(),
    recipientRole: t.text().notNull(), // 'seller' | 'node' | 'driver' | 'protocol'

    token: t.hex().notNull(),
    amount: t.bigint().notNull(),

    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    recipientIdx: index().on(table.recipient),
  }),
);

// =============================================================================
// EVENTS LOG
// =============================================================================

/**
 * OrderBookEvent: All order book activity for historical tracking
 */
export const orderBookEvents = onchainTable(
  'order_book_events',
  (t) => ({
    id: t.text().primaryKey(),
    orderBookId: t.text().notNull(),

    eventType: t.text().notNull(), // 'order_placed' | 'order_matched' | 'order_cancelled' | 'trade_executed'

    // Related entities
    orderId: t.hex(),
    tradeId: t.hex(),

    // Event data (JSON)
    eventData: t.text().notNull(),

    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderBookIdx: index().on(table.orderBookId),
    eventTypeIdx: index().on(table.eventType),
    timeIdx: index().on(table.createdAt),
  }),
);

/**
 * LogisticsEvent: All logistics activity for tracking
 */
export const logisticsEvents = onchainTable(
  'logistics_events',
  (t) => ({
    id: t.text().primaryKey(),
    orderId: t.hex().notNull(),

    eventType: t.text().notNull(), // 'created' | 'driver_notified' | 'driver_assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'settled' | 'cancelled' | 'disputed'

    // Actor
    actor: t.hex().notNull(),
    actorRole: t.text().notNull(), // 'system' | 'buyer' | 'seller' | 'node' | 'driver'

    // Location (if applicable)
    lat: t.text(),
    lng: t.text(),

    // Event data (JSON)
    eventData: t.text().notNull(),

    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdx: index().on(table.orderId),
    eventTypeIdx: index().on(table.eventType),
    actorIdx: index().on(table.actor),
  }),
);

// =============================================================================
// RELATIONS
// =============================================================================

export const nodesRelations = relations(nodes, ({ many }) => ({
  inventory: many(nodeInventory),
  sellOrders: many(marketOrders),
  trades: many(trades),
  logisticsOrders: many(logisticsOrders),
}));

export const nodeInventoryRelations = relations(nodeInventory, ({ one }) => ({
  node: one(nodes, { fields: [nodeInventory.nodeId], references: [nodes.id] }),
}));

export const marketOrdersRelations = relations(marketOrders, ({ one }) => ({
  orderBook: one(orderBooks, {
    fields: [marketOrders.orderBookId],
    references: [orderBooks.id],
  }),
  node: one(nodes, { fields: [marketOrders.nodeId], references: [nodes.id] }),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  orderBook: one(orderBooks, {
    fields: [trades.orderBookId],
    references: [orderBooks.id],
  }),
  buyOrder: one(marketOrders, {
    fields: [trades.buyOrderId],
    references: [marketOrders.id],
  }),
  sellOrder: one(marketOrders, {
    fields: [trades.sellOrderId],
    references: [marketOrders.id],
  }),
  sellerNode: one(nodes, {
    fields: [trades.sellerNodeId],
    references: [nodes.id],
  }),
  logisticsOrder: one(logisticsOrders, {
    fields: [trades.logisticsOrderId],
    references: [logisticsOrders.id],
  }),
}));

export const logisticsOrdersRelations = relations(
  logisticsOrders,
  ({ one, many }) => ({
    trade: one(trades, {
      fields: [logisticsOrders.tradeId],
      references: [trades.id],
    }),
    sellerNode: one(nodes, {
      fields: [logisticsOrders.sellerNodeId],
      references: [nodes.id],
    }),
    escrow: one(escrows, {
      fields: [logisticsOrders.id],
      references: [escrows.orderId],
    }),
    assignments: many(driverAssignments),
    signatures: many(deliverySignatures),
    payments: many(payments),
    events: many(logisticsEvents),
  }),
);

export const driversRelations = relations(drivers, ({ many, one }) => ({
  assignments: many(driverAssignments),
  notifications: many(driverNotifications),
  currentOrder: one(logisticsOrders, {
    fields: [drivers.currentOrderId],
    references: [logisticsOrders.id],
  }),
}));
