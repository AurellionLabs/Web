---
tags: [architecture, data-flow, flows]
---

# Data Flow

[[🏠 Home]] > [[Architecture/System Overview]] > Data Flow

This page traces the complete journey of data through the Aurellion stack — from a user clicking "Buy" to receiving physical delivery and on-chain settlement.

---

## Flow 1: Asset Tokenisation

A node operator mints a real-world asset as an ERC-1155 token.

```
Node Operator
     │
     │  1. Calls nodeMint(account, asset, amount, className, data)
     ▼
Diamond → AssetsFacet
     │
     │  2. Validates: validNode modifier (ownerNodes[msg.sender] has active node)
     │  3. Validates: class is active (isClassActive[keccak256(className)])
     │  4. Generates: tokenId = uint256(keccak256(abi.encode(asset)))
     │  5. Generates: hash = keccak256(abi.encode(account, asset))
     │  6. Mints ERC-1155 tokens to account address
     │  7. Establishes custody: tokenCustodianAmounts[tokenId][account] += amount
     │  8. Emits: MintedAsset(account, hash, tokenId, name, assetClass, className)
     │             CustodyEstablished(tokenId, account, amount)
     ▼
Ponder Indexer
     │
     │  9. Picks up MintedAsset event
     │  10. Writes to mintedAssetEvents table (raw event)
     │  11. Aggregates to assets table (id, tokenId, account, class, ...)
     ▼
Frontend
     │
     │  12. GraphQL query: assets(where: {account: nodeAddress})
     │  13. Displays asset in Node Dashboard
```

---

## Flow 2: CLOB Order Placement & Matching

A customer places a buy order on the CLOB.

```
Customer
     │
     │  1. Calls OrderRouterFacet.placeOrder(baseToken, baseTokenId, quoteToken,
     │                                        price, amount, isBuy=true, TIF, expiry)
     ▼
Diamond → OrderRouterFacet
     │
     │  2. Validates: price > 0, amount > 0, valid TIF, not expired
     │  3. Gets/creates market: marketId = keccak256(baseToken, baseTokenId, quoteToken)
     │  4. Since isBuy=true: transfers quoteToken from customer to Diamond (escrow)
     │  5. Creates PackedOrder (3 storage slots, gas efficient)
     │  6. Inserts order into bid price level (Red-Black Tree for O(log n))
     │  7. Emits RouterOrderPlaced(orderId, maker, baseToken, ...)
     │
     │  8. Attempts matching via CLOBMatchingFacet
     ▼
Diamond → CLOBMatchingFacet
     │
     │  9. Finds best ask at or below bid price (price-time priority)
     │  10. Calculates fill: min(bidAmount, askAmount)
     │  11. Executes trade:
     │      - Transfers ERC-1155 tokens from Diamond to buyer
     │      - Transfers ERC-20 quote tokens from Diamond to seller
     │      - Charges taker fee (configurable bps) + maker fee
     │  12. Emits TradeExecuted(tradeId, taker, maker, marketId, price, amount, ...)
     │      Emits MatchingOrderFilled(orderId, tradeId, fillAmount, ...)
     ▼
BridgeFacet (if logistics required)
     │
     │  13. BridgeTradeToLogistics creates UnifiedOrder linking CLOB trade to physical delivery
     │  14. Escrows: orderValue + 2% bounty + 0.25% protocol fee
     │  15. Emits UnifiedOrderCreated(unifiedOrderId, clobOrderId, buyer, seller, ...)
```

---

## Flow 3: Physical Delivery (Journey Lifecycle)

Once a trade is matched and bridged, physical delivery begins.

```
Seller / Node
     │
     │  1. Calls BridgeFacet.createLogisticsOrder(unifiedOrderId)
     ▼
Diamond → BridgeFacet
     │
     │  2. Creates Journey record with phase=JOURNEY_PENDING
     │  3. Emits LogisticsOrderCreated(unifiedOrderId, journeyId, bounty, node)
     ▼
Dispatcher / Admin
     │
     │  4. Calls AuSysFacet.assignDriverToJourney(journeyId, driverAddress)
     │     → Validates DISPATCHER_ROLE
     │     → Updates journey.driver
     │     → Emits DriverAssigned(journeyId, driver, ...)
     ▼
Driver (Pickup)
     │
     │  5. Calls AuSysFacet.packageSign(journeyId) as driver
     │     → Sets driverPickupSigned[driver][journeyId] = true
     │     → Emits EmitSig(driver, journeyId)
     ▼
Sender (Node Operator)
     │
     │  6. Calls AuSysFacet.packageSign(journeyId) as sender
     │     → Sets customerHandOff[sender][journeyId] = true
     │     → Journey transitions to IN_TRANSIT once both signed
     │     → Emits AuSysJourneyStatusUpdated(journeyId, status=IN_TRANSIT, ...)
     ▼
Driver (Delivery)
     │
     │  7. Calls AuSysFacet.handOff(journeyId)
     │     → Validates driver has signed
     │     → Transfers driver bounty (IERC20 payToken)
     │     → Updates journey to DELIVERED
     │     → Emits AuSysJourneyStatusUpdated(journeyId, status=DELIVERED, ...)
     ▼
BridgeFacet (Settlement)
     │
     │  8. Automatically settles UnifiedOrder:
     │     - ERC-1155 tokens transfer to buyer
     │     - Seller receives payment (price - protocol fee)
     │     - Protocol fee to feeRecipient
     │  9. Emits OrderSettled(unifiedOrderId, seller, sellerAmount, ...)
     ▼
Ponder Indexer
     │
     │  10. All events indexed in real-time
     │  11. journeys aggregate table updated at each phase transition
     │  12. orders table marked as settled
```

---

## Flow 4: RWY Staking

```
Operator
  │ createOpportunity(name, inputToken, targetAmount, promisedYieldBps)
  ▼
RWYStakingFacet
  │ Creates RWY opportunity with status=OPEN
  │ Emits OpportunityCreated(id, operator, inputToken, targetAmount, yieldBps)
  ▼
Stakers (Node Operators / Customers)
  │ stakeToOpportunity(opportunityId, amount)
  │ → ERC-1155 tokens transferred to Diamond escrow
  │ → Emits CommodityStaked(opportunityId, staker, amount, totalStaked)
  ▼ (when targetAmount reached)
  │ Emits OpportunityFunded(id, totalStaked)
  ▼
Operator
  │ startProcessing(opportunityId)
  │ → status=PROCESSING
  │ confirmProcessingComplete(opportunityId, outputAmount, outputTokenId)
  │ recordSaleProceeds(opportunityId, proceeds)
  ▼
Stakers
  │ claimProfit(opportunityId)
  │ → profit = (userStake / totalStaked) * totalProfit
  │ → principal + profit transferred back
  │ → Emits ProfitDistributed(opportunityId, staker, stakedAmount, profitShare)
```

---

## Indexer Data Pipeline

```
Blockchain Events
     │
     ▼
Ponder Handlers (TypeScript)
  ├── Raw event tables (dumb indexer pattern)
  │   e.g. mintedAssetEvents, unifiedOrderCreatedEvents, ...
  └── Aggregate tables (planned — see PRD.md)
      e.g. assets, orders, journeys
     │
     ▼
GraphQL API (Ponder)
     │
     ▼
Repository Layer (TypeScript)
  ├── Transforms raw events → domain types
  ├── Handles pagination (cursor-based)
  └── Provides typed methods to frontend
     │
     ▼
React Providers / Context
     │
     ▼
UI Components
```

---

## Related Pages

- [[Core Concepts/Order Lifecycle]]
- [[Core Concepts/Journey and Logistics]]
- [[Core Concepts/CLOB Trading]]
- [[Indexer/Ponder Setup]]
