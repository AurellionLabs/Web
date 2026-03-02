---
tags: [indexer, graphql, schema, queries]
---

# Schema & GraphQL Queries

[[🏠 Home]] > [[Indexer/Ponder Setup]] > Schema and Queries

This page documents the GraphQL API exposed by the Ponder indexer, with example queries for every major data type.

---

## API Endpoints

| Endpoint        | Description                   |
| --------------- | ----------------------------- |
| `GET /graphql`  | GraphQL playground (dev only) |
| `POST /graphql` | GraphQL API                   |
| `GET /health`   | Health check                  |

Default local URL: `http://localhost:42069`

---

## Ponder Query Conventions

Ponder adds an `s` suffix to all table names in queries:

```graphql
# Table: mintedAssetEvents → Query: mintedAssetEventss
query {
  mintedAssetEventss {
    items {
      id
    }
  }
}
```

### Pagination

All list queries support cursor-based pagination:

```graphql
query {
  mintedAssetEventss(limit: 20, after: "cursor_string") {
    items {
      id
      account
      tokenId
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Filtering

Filter with `where` clause using column equality or comparisons:

```graphql
query {
  mintedAssetEventss(where: { account: "0x1234..." }) {
    items {
      id
      tokenId
      name
    }
  }
}
```

### Sorting

```graphql
query {
  tradeExecutedEventss(
    orderBy: "block_timestamp"
    orderDirection: "desc"
    limit: 50
  ) {
    items {
      id
      price
      amount
    }
  }
}
```

---

## Asset Queries

### Get All Minted Assets

```graphql
query GetAssets($limit: Int = 50) {
  mintedAssetEventss(
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      id
      account
      hash
      tokenId
      name
      assetClass
      className
      block_timestamp
      transaction_hash
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Get Assets by Node

```graphql
query GetNodeAssets($nodeAddress: String!) {
  mintedAssetEventss(where: { account: $nodeAddress }) {
    items {
      id
      hash
      tokenId
      name
      assetClass
      className
      block_timestamp
    }
  }
}
```

### Get Assets by Class

```graphql
query GetAssetsByClass($className: String!) {
  mintedAssetEventss(
    where: { className: $className }
    orderBy: "block_timestamp"
  ) {
    items {
      id
      account
      tokenId
      name
      block_timestamp
    }
  }
}
```

---

## Order Queries

### Get All Unified Orders

```graphql
query GetOrders($limit: Int = 50, $after: String) {
  unifiedOrderCreatedEventss(
    limit: $limit
    after: $after
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
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
      block_timestamp
      transaction_hash
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Get Orders for Buyer

```graphql
query GetBuyerOrders($buyer: String!) {
  unifiedOrderCreatedEventss(
    where: { buyer: $buyer }
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      unifiedOrderId
      quantity
      price
      block_timestamp
    }
  }
}
```

### Get Settled Orders

```graphql
query GetSettledOrders {
  orderSettledEventss(
    orderBy: "block_timestamp"
    orderDirection: "desc"
    limit: 100
  ) {
    items {
      unifiedOrderId
      seller
      sellerAmount
      driver
      driverAmount
      block_timestamp
    }
  }
}
```

---

## Journey Queries

### Get Journeys for Driver

```graphql
query GetDriverJourneys($driver: String!) {
  auSysJourneyStatusUpdatedEventss(
    where: { driver: $driver }
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      journeyId
      newStatus
      sender
      receiver
      bounty
      ETA
      startName
      endName
      startLat
      startLng
      endLat
      endLng
      block_timestamp
    }
  }
}
```

### Get Active Journeys (IN_TRANSIT)

```graphql
query GetActiveJourneys {
  auSysJourneyStatusUpdatedEventss(where: { newStatus: 1 }) {
    items {
      journeyId
      driver
      sender
      receiver
      startName
      endName
      bounty
      ETA
    }
  }
}
```

### Get Journeys for Order

```graphql
query GetOrderJourneys($orderId: String!) {
  journeyCreatedEventss(where: { orderId: $orderId }) {
    items {
      journeyId
      sender
      receiver
      driver
      bounty
      ETA
      startName
      endName
    }
  }
}
```

---

## CLOB Queries

### Get Open Orders for Market

```graphql
query GetOpenOrders($marketId: String!) {
  routerOrderPlacedEventss(where: { marketId: $marketId }) {
    items {
      orderId
      maker
      price
      amount
      isBuy
      orderType
      block_timestamp
    }
  }
}
```

### Get Trade History

```graphql
query GetTrades($limit: Int = 100) {
  tradeExecutedEventss(
    limit: $limit
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      tradeId
      taker
      maker
      marketId
      price
      amount
      quoteAmount
      takerFee
      makerFee
      takerIsBuy
      block_timestamp
      transaction_hash
    }
  }
}
```

### Get Pool Activity

```graphql
query GetPoolActivity($poolId: String!) {
  liquidityAddedEventss(where: { poolId: $poolId }) {
    items {
      provider
      baseAmount
      quoteAmount
      lpTokensMinted
      block_timestamp
    }
  }
  liquidityRemovedEventss(where: { poolId: $poolId }) {
    items {
      provider
      baseAmount
      quoteAmount
      lpTokensBurned
      block_timestamp
    }
  }
}
```

---

## Node Queries

### Get All Nodes

```graphql
query GetNodes {
  nodeRegisteredEventss(orderBy: "block_timestamp") {
    items {
      nodeHash
      owner
      nodeType
      block_timestamp
    }
  }
}
```

### Get Node Assets

```graphql
query GetNodeSupportedAssets($nodeHash: String!) {
  supportedAssetAddedEventss(where: { nodeHash: $nodeHash }) {
    items {
      token
      tokenId
      price
      capacity
      block_timestamp
    }
  }
}
```

---

## RWY Queries

### Get All Opportunities

```graphql
query GetOpportunities($limit: Int = 100, $after: String) {
  opportunityCreatedEventss(
    limit: $limit
    after: $after
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      id
      opportunityId
      operator
      inputToken
      inputTokenId
      targetAmount
      promisedYieldBps
      block_timestamp
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Get Stakes for Opportunity

```graphql
query GetOpportunityStakes($opportunityId: String!) {
  commodityStakedEventss(where: { opportunityId: $opportunityId }) {
    items {
      staker
      amount
      totalStaked
      block_timestamp
    }
  }
}
```

### Get User's Stakes

```graphql
query GetUserStakes($staker: String!) {
  commodityStakedEventss(where: { staker: $staker }) {
    items {
      opportunityId
      amount
      totalStaked
      block_timestamp
    }
  }
}
```

---

## Staking Queries (AuStake legacy)

```graphql
query GetStakedEvents($operationId: String!) {
  stakedEventss(where: { stakedOperationId: $operationId }, limit: 100) {
    items {
      id
      user
      amount
      stakedOperationId
      token
      time
      block_timestamp
      transaction_hash
    }
  }
}

query GetOperations($limit: Int = 100, $after: String) {
  operationCreatedEventss(
    limit: $limit
    after: $after
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      id
      opCreatedOperationId
      name
      token
      block_timestamp
      transaction_hash
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

---

## P2P Queries

### Get Open P2P Offers

```graphql
query GetOpenP2POffers {
  p2POfferCreatedEventss(orderBy: "block_timestamp", orderDirection: "desc") {
    items {
      orderId
      creator
      isSellerInitiated
      token
      tokenId
      tokenQuantity
      price
      targetCounterparty
      expiresAt
      block_timestamp
    }
  }
}
```

---

## Repository Integration

The frontend queries Ponder via `graphql-request`. Query constants are defined in `constants.ts` and consumed by repositories:

```typescript
// infrastructure/repositories/orders-repository.ts
import { request } from 'graphql-request';
import { UNIFIED_ORDERS_QUERY } from '@/constants';

class OrdersRepository implements IOrderRepository {
  async getBuyerOrders(buyer: string): Promise<Order[]> {
    const data = await request(
      process.env.NEXT_PUBLIC_INDEXER_URL,
      GET_BUYER_ORDERS_QUERY,
      { buyer: buyer.toLowerCase() },
    );
    return data.unifiedOrderCreatedEventss.items.map(transformToOrder);
  }
}
```

---

## Related Pages

- [[Indexer/Ponder Setup]]
- [[Architecture/Data Flow]]
- [[Architecture/System Overview]]
