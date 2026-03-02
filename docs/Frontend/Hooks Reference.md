# Hooks Reference

React hooks for Aurellion frontend development.

## Overview

The hooks directory contains custom React hooks for interacting with the Aurellion protocol. All hooks are located in `/hooks` and use the `/domain` and `/infrastructure` layers.

---

## Core Wallet Hook

### useWallet

Wallet connection and authentication using Privy.

```typescript
const {
  isConnected,
  connectedWallet,
  address,
  chainId,
  error,
  connect,
  disconnect,
  isReady,
  isInitialized,
} = useWallet();
```

**State:**

- `isConnected` - Whether wallet is connected
- `connectedWallet` - The connected Privy wallet object
- `address` - User's Ethereum address
- `chainId` - Current chain ID
- `isReady` - Whether Privy is initialized
- `isInitialized` - Whether wallet is fully initialized

**Actions:**

- `connect()` - Initiate wallet connection
- `disconnect()` - Disconnect wallet

---

## Trading Hooks

### useCLOBV2

CLOB V2 trading functionality - the primary hook for order book trading.

```typescript
const {
  orderBook,
  userOrders,
  trades,
  marketStats,
  placeLimitOrder,
  placeMarketOrder,
  cancelOrder,
  isLoading,
} = useCLOBV2({
  baseToken: '0x...',
  baseTokenId: '1',
  quoteToken: '0x...',
  levels: 15,
});
```

**Options:**

- `baseToken` - Base token address
- `baseTokenId` - Base token ID (for ERC-1155)
- `quoteToken` - Quote token address
- `levels` - Number of price levels to fetch

**State:**

- `orderBook` - Current order book (bids/asks)
- `userOrders` - User's active orders
- `trades` - Recent trades
- `marketStats` - Market statistics (spread, mid price, etc.)
- `isLoading` - Loading state

**Actions:**

- `placeLimitOrder(price, amount, isBuy, timeInForce?, expiry?)` - Place limit order
- `placeMarketOrder(amount, isBuy, maxSlippageBps)` - Place market order
- `cancelOrder(orderId)` - Cancel an order

### useOrderBook

Focused order book data fetching.

```typescript
const { bids, asks, spread, midPrice, isLoading } = useOrderBook({
  baseToken,
  baseTokenId,
  quoteToken,
  levels: 15,
});
```

### useMarketData

General market data including price, volume, and statistics.

```typescript
const { price, volume24h, change24h, isLoading } = useMarketData(marketId);
```

### useAssetPrice

Fetch price for a specific asset.

```typescript
const { price, formattedPrice, isLoading, error } = useAssetPrice(tokenId);
```

---

## Order Management Hooks

### useUnifiedOrder

Complete order lifecycle tracking - links CLOB trades to physical logistics.

```typescript
const { trackedOrder, allOrders, isLoading, error, refetch } =
  useUnifiedOrder(orderId);
```

**Features:**

- Tracks order status through: PENDING_TRADE → TRADE_MATCHED → LOGISTICS_CREATED → IN_TRANSIT → DELIVERED → SETTLED
- Provides status configuration (labels, colors, icons)
- Calculates progress percentage
- Determines if orders can be cancelled

**Returns:**

- `trackedOrder` - Single order with status config
- `allOrders` - All orders for connected user

### usePackageSignatureProcess

Manages the two-party package signature process (driver + sender).

```typescript
const { signAndListen, status, error, reset } = usePackageSignatureProcess({
  jobId,
  driverAddress,
  senderAddress,
});
```

**Status states:** `idle` | `signing` | `waiting` | `complete` | `error`

---

## User Holdings & Assets

### useUserAssets

User's asset holdings (ERC-1155 tokens).

```typescript
const { assets, isLoading, refetch } = useUserAssets(userAddress);
```

**Returns:**

- `assets` - Array of { tokenId, balance, metadata }
- `isLoading` - Loading state
- `refetch` - Manual refresh function

### useUserHoldings

User's token holdings across markets with valuations.

```typescript
const { holdings, totalValue, isLoading } = useUserHoldings(address);
```

### useAssetCustody

Tracks where an asset is held - in-wallet vs. custodied at nodes.

```typescript
const { inWallet, nodes, totalBalance, isLoading, error } = useAssetCustody(
  tokenId,
  walletAddress,
  walletBalance,
);
```

**Use case:** For RWA tokens that can be custodied at nodes, this hook shows:

- How much is in the user's wallet
- How much is custodied at each node
- Total balance

---

## RWY Staking Hooks

### useRWYActions

RWY token staking operations.

```typescript
const { stake, unstake, claimRewards, stakedAmount, pendingRewards } =
  useRWYActions();
```

### useRWYOpportunity

Fetch a single RWY opportunity with dynamic data.

```typescript
const { opportunity, loading, error, refetch } =
  useRWYOpportunity(opportunityId);
```

### useRWYOpportunities

Fetch all available RWY staking opportunities.

```typescript
const { opportunities, isLoading, refetch } = useRWYOpportunities();
```

---

## AURA Token Hook

### useAuraToken

AURA token balance and minting (testnet only).

```typescript
const {
  balance,
  balanceRaw,
  isLoadingBalance,
  isMinting,
  error,
  lastTxHash,
  refreshBalance,
  mintTokens,
  symbol,
  decimals,
} = useAuraToken();
```

**Actions:**

- `refreshBalance()` - Fetch latest balance
- `mintTokens(amount)` - Mint AURA tokens (max 10,000 per call)

**Note:** Minting is only available on testnet.

---

## Platform & Classification Hooks

### usePlatformClasses

Platform class metadata (asset classifications).

```typescript
const { classes, isLoading } = usePlatformClasses();
```

### useClassAssets

Assets belonging to a specific class.

```typescript
const { assets, isLoading } = useClassAssets(classId);
```

### useAttributeFilters

Filter assets by attributes.

```typescript
const { filteredAssets, filters, setFilter, clearFilters } =
  useAttributeFilters(assets);
```

---

## UI/Utility Hooks

### useMobile

Mobile device detection.

```typescript
const isMobile = useMobile();
```

### useToast

Toast notifications.

```typescript
const { toast, dismiss } = useToast();
```

### usePriceAnimation

Animated price display (for price change visualization).

```typescript
const { displayPrice, priceChange, direction } = usePriceAnimation(price);
```

---

## Adding New Hooks

1. Create hook in `/hooks` directory
2. Use repository layer for data fetching
3. Use service layer for transactions
4. Export types in `/types`
5. Document in this file
6. Add to navigation in `/lib/docs-nav.ts`

---

## Related

- [Application Structure](./Application%20Structure.md)
- [Providers](./Providers.md)
- [Pages Reference](./Pages%20Reference.md)
- [Architecture/Services Layer](../Architecture/Services%20Layer.md)
