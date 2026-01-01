# Integrated CLOB + Logistics System

## Overview

The integrated system combines a Central Limit Order Book (CLOB) for price discovery with physical logistics for RWA delivery. Node inventory serves as sell-side liquidity, and matched trades automatically trigger the fulfillment pipeline.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AURELLION MARKETPLACE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
│  │   AuraAsset    │    │ AurumNodeMgr   │    │    AuraCLOB    │             │
│  │  (Tokenize)    │───▶│  (Inventory)   │───▶│   (Trading)    │             │
│  └────────────────┘    └────────────────┘    └───────┬────────┘             │
│                                                       │                      │
│                              ┌────────────────────────┘                      │
│                              ▼                                               │
│                    ┌────────────────┐                                        │
│                    │   Order Book   │                                        │
│                    │  ┌──────────┐  │                                        │
│                    │  │   BIDS   │  │◀── Buyers place orders                 │
│                    │  ├──────────┤  │                                        │
│                    │  │   ASKS   │  │◀── Nodes list inventory                │
│                    │  └──────────┘  │                                        │
│                    └───────┬────────┘                                        │
│                            │ Match!                                          │
│                            ▼                                                 │
│                    ┌────────────────┐    ┌────────────────┐                 │
│                    │     Trade      │───▶│   Logistics    │                 │
│                    │   Executed     │    │     Order      │                 │
│                    └────────────────┘    └───────┬────────┘                 │
│                                                   │                          │
│         ┌─────────────────────────────────────────┼──────────────────┐       │
│         ▼                                         ▼                  ▼       │
│  ┌────────────┐                          ┌────────────┐      ┌────────────┐ │
│  │   Escrow   │                          │  Notify    │      │   Node     │ │
│  │   Funds    │                          │  Drivers   │      │  Prepares  │ │
│  └────────────┘                          └─────┬──────┘      └────────────┘ │
│                                                 │                            │
│                                                 ▼                            │
│                                         ┌────────────┐                       │
│                                         │   Driver   │                       │
│                                         │  Accepts   │                       │
│                                         └─────┬──────┘                       │
│                                                │                            │
│    ┌───────────────────────────────────────────┼────────────────────────┐   │
│    ▼                                           ▼                        ▼   │
│ ┌────────┐     ┌────────┐     ┌────────┐    ┌────────┐    ┌────────┐       │
│ │ Pickup │────▶│Transit │────▶│Deliver │───▶│ Settle │───▶│  Pay   │       │
│ │  📦    │     │  🚗    │     │  ✅    │    │  💰    │    │  All   │       │
│ └────────┘     └────────┘     └────────┘    └────────┘    └────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Complete Flow

### Phase 1: Inventory Listing

```
Node                    AurumNodeManager              AuraCLOB
 │                           │                           │
 │  addSupportedAsset()      │                           │
 │──────────────────────────▶│                           │
 │                           │                           │
 │                           │  SupportedAssetAdded      │
 │                           │──────────────────────────▶│
 │                           │                           │
 │                           │                           │  Create sell order
 │                           │                           │  at node's price
 │                           │                           │
 │                           │◀──────────────────────────│
 │                           │    OrderPlaced event      │
 │                           │                           │
```

### Phase 2: Order Matching

```
Buyer                   AuraCLOB                     Order Book
 │                         │                            │
 │  placeOrder(BUY)        │                            │
 │────────────────────────▶│                            │
 │                         │                            │
 │                         │  Find matching sell        │
 │                         │────────────────────────────▶
 │                         │                            │
 │                         │◀────────────────────────────
 │                         │  Best ask from Node X      │
 │                         │                            │
 │                         │  Execute trade             │
 │                         │  - Update buyer order      │
 │                         │  - Update seller order     │
 │                         │  - Reserve node inventory  │
 │                         │                            │
 │◀────────────────────────│                            │
 │   OrderMatched event    │                            │
 │                         │                            │
```

### Phase 3: Logistics Order Creation

```
AuraCLOB               Escrow                    LogisticsOrder
 │                        │                           │
 │  Trade matched         │                           │
 │────────────────────────▶                           │
 │                        │                           │
 │  Hold buyer funds      │                           │
 │  (price + fees)        │                           │
 │                        │                           │
 │                        │  Create logistics order   │
 │                        │──────────────────────────▶│
 │                        │                           │
 │                        │  - Link to trade          │
 │                        │  - Set pickup location    │
 │                        │  - Set delivery location  │
 │                        │  - Calculate bounty       │
 │                        │                           │
 │◀───────────────────────│◀──────────────────────────│
 │  LogisticsOrderCreated │                           │
 │                        │                           │
```

### Phase 4: Driver Notification & Assignment

```
LogisticsOrder         DriverMatcher                 Drivers
 │                         │                           │
 │  New order created      │                           │
 │────────────────────────▶│                           │
 │                         │                           │
 │                         │  Find nearby drivers      │
 │                         │  (by GPS location)        │
 │                         │                           │
 │                         │  Notify eligible drivers  │
 │                         │──────────────────────────▶│
 │                         │                           │
 │                         │   DriverNotified event    │ (to each driver)
 │                         │                           │
 │                         │                           │
 │                         │◀──────────────────────────│
 │                         │   Driver A accepts        │
 │                         │                           │
 │◀────────────────────────│                           │
 │   DriverAssigned event  │                           │
 │                         │                           │
 │  Update status:         │                           │
 │  CREATED → ASSIGNED     │                           │
 │                         │                           │
```

### Phase 5: Pickup

```
Driver                   Node                     LogisticsOrder
 │                         │                           │
 │  Arrive at node         │                           │
 │────────────────────────▶│                           │
 │                         │                           │
 │  Verify order details   │                           │
 │◀───────────────────────▶│                           │
 │                         │                           │
 │  Node signs handoff     │                           │
 │◀────────────────────────│                           │
 │                         │                           │
 │  confirmPickup()        │                           │
 │─────────────────────────────────────────────────────▶
 │                         │                           │
 │                         │   PackagePickedUp event   │
 │                         │                           │
 │                         │   Status: PICKED_UP       │
 │                         │                           │
```

### Phase 6: In Transit

```
Driver                  AuraCLOB                  Buyer (App)
 │                         │                           │
 │  updateLocation()       │                           │
 │────────────────────────▶│                           │
 │  (every N minutes)      │                           │
 │                         │  DriverLocationUpdated    │
 │                         │──────────────────────────▶│
 │                         │                           │
 │                         │  (Real-time tracking)     │
 │                         │                           │
```

### Phase 7: Delivery & Settlement

```
Driver                  Buyer                     AuraCLOB
 │                         │                           │
 │  Arrive at destination  │                           │
 │────────────────────────▶│                           │
 │                         │                           │
 │  Request signature      │                           │
 │────────────────────────▶│                           │
 │                         │                           │
 │◀────────────────────────│                           │
 │  Buyer signs receipt    │                           │
 │                         │                           │
 │  confirmDelivery()      │                           │
 │─────────────────────────────────────────────────────▶
 │                         │                           │
 │                         │   PackageDelivered event  │
 │                         │   Status: DELIVERED       │
 │                         │                           │
 │                         │   Auto-trigger settlement │
 │                         │                           │
 │                         │   ┌─────────────────────┐ │
 │                         │   │ Release Escrow:     │ │
 │                         │   │ - Pay seller        │ │
 │                         │   │ - Pay node fee      │ │
 │                         │   │ - Pay driver bounty │ │
 │                         │   │ - Protocol fee      │ │
 │                         │   └─────────────────────┘ │
 │                         │                           │
 │◀────────────────────────│◀──────────────────────────│
 │   DriverPaid event      │   SellerPaid event       │
 │                         │   NodeFeePaid event       │
 │                         │                           │
```

## Data Model

### Core Entities

| Entity           | Description                       |
| ---------------- | --------------------------------- |
| `Node`           | Physical location with inventory  |
| `NodeInventory`  | What a node has available to sell |
| `OrderBook`      | Trading pair aggregates           |
| `MarketOrder`    | Buy/sell orders on CLOB           |
| `Trade`          | Matched order execution           |
| `LogisticsOrder` | Physical delivery order           |
| `Driver`         | Delivery driver                   |
| `Escrow`         | Held funds during delivery        |

### Status Flows

**Market Order:**

```
OPEN → PARTIAL → FILLED
  │
  └──▶ CANCELLED
```

**Logistics Order:**

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED → SETTLED
    │         │                       │
    └─────────┴───────────────────────┴──▶ CANCELLED / DISPUTED
```

**Escrow:**

```
HELD → RELEASING → RELEASED
  │
  └──▶ REFUNDED / DISPUTED
```

## Fee Structure

| Fee Type      | Rate    | Recipient         |
| ------------- | ------- | ----------------- |
| Protocol Fee  | 0.25%   | Protocol treasury |
| Node Fee      | 0.50%   | Selling node      |
| Driver Bounty | Dynamic | Assigned driver   |

## Smart Contract Events

### Order Book Events

- `OrderPlaced` - New order added
- `OrderCancelled` - Order removed
- `OrderMatched` - Trade executed

### Logistics Events

- `LogisticsOrderCreated` - Delivery order created
- `DriverNotified` - Driver received notification
- `DriverAssigned` - Driver accepted assignment
- `PackagePickedUp` - Pickup confirmed
- `DriverLocationUpdated` - Transit tracking
- `PackageDelivered` - Delivery confirmed

### Settlement Events

- `OrderSettled` - Escrow released
- `SellerPaid` - Seller received funds
- `NodeFeePaid` - Node received fee
- `DriverPaid` - Driver received bounty

## Indexer Coverage

The Ponder indexer tracks all events and maintains:

1. **Real-time order book** - Best bid/ask, depth
2. **Trade history** - Price, volume, parties
3. **Logistics tracking** - Status, location, ETAs
4. **Driver metrics** - Ratings, earnings, availability
5. **Node analytics** - Sales volume, inventory levels
6. **Settlement status** - Escrow balances, payments

## API Endpoints

### Order Book

- `GET /orderbook/:pair` - Current order book state
- `GET /trades/:pair` - Recent trades
- `GET /orders/:address` - User's orders

### Logistics

- `GET /deliveries/:orderId` - Delivery status
- `GET /deliveries/driver/:address` - Driver's assignments
- `GET /tracking/:orderId` - Real-time tracking

### Analytics

- `GET /nodes/:address/stats` - Node performance
- `GET /drivers/:address/stats` - Driver performance
- `GET /market/stats` - Market overview
