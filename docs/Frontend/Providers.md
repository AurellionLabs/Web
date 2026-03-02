---
tags: [frontend, providers, react, context, state]
---

# React Providers

[[🏠 Home]] > [[Frontend/Application Structure]] > Providers

Aurellion uses a layered React Context system to manage global state. All providers are composed in `main.provider.tsx` and wrap the entire application. This page documents each provider's responsibilities, exposed values, and usage patterns.

---

## Provider Hierarchy

```
PrivyProvider (wallet/auth)
  └── DiamondProvider (contract instances)
        └── RepositoryProvider (data access)
              └── PlatformProvider (config)
                    └── NodesProvider (node data)
                          └── PoolsProvider (AMM pools)
                                └── CustomerProvider (customer state)
                                      └── DriverProvider (driver state)
                                            └── TradeProvider (CLOB state)
                                                  └── {children}
```

The ordering matters — lower providers can consume context from higher providers.

---

## PrivyProvider

**File:** `app/providers/privy.provider.tsx`

Wraps the entire application with Privy's authentication system.

**Exposed via:** `usePrivy()`, `useWallets()` hooks from `@privy-io/react-auth`

```typescript
const { user, authenticated, login, logout } = usePrivy();
const { wallets } = useWallets();
const activeWallet =
  wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0];
```

---

## DiamondProvider

**File:** `app/providers/diamond.provider.tsx`

Creates and exposes typed contract instances for the Diamond proxy and related tokens.

**Context values:**

| Value           | Type               | Description                            |
| --------------- | ------------------ | -------------------------------------- |
| `diamond`       | `Diamond \| null`  | Diamond contract with signer (write)   |
| `diamondRead`   | `Diamond`          | Diamond contract without signer (read) |
| `quoteToken`    | `IERC20 \| null`   | Quote token (USDC) with signer         |
| `auraAsset`     | `IERC1155 \| null` | Asset token contract                   |
| `signerAddress` | `string \| null`   | Connected wallet address               |
| `chainId`       | `number`           | Current chain ID                       |

**Usage:**

```typescript
const { diamond, signerAddress } = useDiamond();

// Write call
await diamond.placeOrder(
  baseToken,
  baseTokenId,
  quoteToken,
  price,
  amount,
  true,
  0,
  0,
);
```

---

## RepositoryProvider

**File:** `app/providers/RepositoryProvider.tsx`

Injects repository implementations into the React tree, allowing components to access data without knowing the implementation details (direct RPC vs indexer).

**Context values:**

| Value                | Type                  | Description           |
| -------------------- | --------------------- | --------------------- |
| `orderRepository`    | `IOrderRepository`    | Orders and journeys   |
| `nodeRepository`     | `INodeRepository`     | Node registry data    |
| `clobRepository`     | `ICLOBRepository`     | CLOB order book       |
| `rwyRepository`      | `IRWYRepository`      | Staking opportunities |
| `poolRepository`     | `IPoolRepository`     | AMM pool data         |
| `driverRepository`   | `IDriverRepository`   | Driver assignments    |
| `platformRepository` | `IPlatformRepository` | Platform config       |

**Usage:**

```typescript
const { orderRepository } = useRepositories();
const orders = await orderRepository.getBuyerOrders(address);
```

---

## PlatformProvider

**File:** `app/providers/platform.provider.tsx`

Fetches and caches platform-level configuration: supported asset classes, active markets, system status.

**Context values:**

| Value              | Type                                      | Description            |
| ------------------ | ----------------------------------------- | ---------------------- |
| `supportedClasses` | `string[]`                                | Active asset classes   |
| `activeMarkets`    | `Market[]`                                | Markets with liquidity |
| `systemStatus`     | `'operational' \| 'paused' \| 'degraded'` | System health          |
| `isPaused`         | `boolean`                                 | Is Diamond paused?     |
| `feeConfig`        | `FeeConfig`                               | Current fee rates      |

---

## NodesProvider

**File:** `app/providers/nodes.provider.tsx`

Fetches and caches all registered nodes. Provides filtering utilities.

**Context values:**

| Value           | Type                                      | Description                     |
| --------------- | ----------------------------------------- | ------------------------------- |
| `nodes`         | `NodeData[]`                              | All registered nodes            |
| `myNodes`       | `NodeData[]`                              | Nodes owned by connected wallet |
| `selectedNode`  | `NodeData \| null`                        | Currently selected node         |
| `loadingNodes`  | `boolean`                                 | Loading state                   |
| `refreshNodes`  | `() => void`                              | Trigger re-fetch                |
| `getNodeByHash` | `(hash: string) => NodeData \| undefined` | Lookup                          |

---

## SelectedNodeProvider

**File:** `app/providers/selected-node.provider.tsx`

Tracks which node the operator is currently managing.

**Context values:**

| Value              | Type                     | Description                |
| ------------------ | ------------------------ | -------------------------- |
| `selectedNodeHash` | `string \| null`         | Active node hash           |
| `setSelectedNode`  | `(hash: string) => void` | Select a node              |
| `selectedNodeData` | `NodeData \| null`       | Full data of selected node |

---

## PoolsProvider

**File:** `app/providers/pools.provider.tsx`

Fetches and manages AMM liquidity pool data.

**Context values:**

| Value           | Type                                    | Description              |
| --------------- | --------------------------------------- | ------------------------ |
| `pools`         | `Pool[]`                                | All active AMM pools     |
| `myLPPositions` | `LPPosition[]`                          | User's LP token holdings |
| `getPool`       | `(poolId: string) => Pool \| undefined` | Pool lookup              |
| `refreshPools`  | `() => void`                            | Re-fetch pools           |

---

## TradeProvider

**File:** `app/providers/trade.provider.tsx`

Manages CLOB trading state including order book data and active orders.

**Context values:**

| Value            | Type                          | Description             |
| ---------------- | ----------------------------- | ----------------------- |
| `orderBook`      | `OrderBook \| null`           | Current bids/asks       |
| `activeOrders`   | `CLOBOrder[]`                 | User's open orders      |
| `recentTrades`   | `Trade[]`                     | Recent trade history    |
| `selectedMarket` | `Market \| null`              | Active market           |
| `placeOrder`     | `(params) => Promise<string>` | Order placement wrapper |
| `cancelOrder`    | `(orderId) => Promise<void>`  | Order cancellation      |
| `isLoading`      | `boolean`                     | Loading state           |

---

## CustomerProvider

**File:** `app/providers/customer.provider.tsx`

Manages customer-specific state: portfolio, orders, P2P offers.

**Context values:**

| Value              | Type                | Description              |
| ------------------ | ------------------- | ------------------------ |
| `tokenBalances`    | `TokenBalance[]`    | ERC-1155 holdings        |
| `unifiedOrders`    | `UnifiedOrder[]`    | Active unified orders    |
| `journeys`         | `Journey[]`         | Active delivery journeys |
| `p2pOffers`        | `P2POffer[]`        | Active P2P offers        |
| `stakingPositions` | `StakingPosition[]` | RWY positions            |
| `lpPositions`      | `LPPosition[]`      | Liquidity positions      |
| `refreshAll`       | `() => void`        | Refresh all data         |

---

## DriverProvider

**File:** `app/providers/driver.provider.tsx`

Manages driver-specific state: assigned journeys, earnings.

**Context values:**

| Value               | Type                                   | Description            |
| ------------------- | -------------------------------------- | ---------------------- |
| `assignedJourneys`  | `Journey[]`                            | Active driver journeys |
| `completedJourneys` | `Journey[]`                            | Historical deliveries  |
| `totalEarnings`     | `bigint`                               | Total bounty received  |
| `pendingBounties`   | `bigint`                               | Uncollected bounties   |
| `signPickup`        | `(journeyId: string) => Promise<void>` | Sign pickup            |
| `completeDelivery`  | `(journeyId: string) => Promise<void>` | Complete journey       |

---

## Using Providers in Components

```typescript
// Example: Customer trading page
import { useTradeProvider } from '@/app/providers/trade.provider';
import { useCustomerProvider } from '@/app/providers/customer.provider';
import { useDiamond } from '@/app/providers/diamond.provider';

function TradingPage() {
  const { diamond } = useDiamond();
  const { orderBook, placeOrder } = useTradeProvider();
  const { tokenBalances } = useCustomerProvider();

  const handleBuy = async () => {
    await placeOrder({
      baseToken, baseTokenId, quoteToken,
      price, amount, isBuy: true
    });
  };

  return (
    <div>
      <OrderBook data={orderBook} />
      <OrderForm onSubmit={handleBuy} />
    </div>
  );
}
```

---

## Related Pages

- [[Frontend/Application Structure]]
- [[Frontend/Pages Reference]]
