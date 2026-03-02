# Hooks Reference

React hooks for Aurellion frontend development.

## Overview

The hooks directory contains custom React hooks for interacting with the Aurellion protocol. All hooks are located in `/hooks` and use the `/domain` and `/infrastructure` layers.

## Core Hooks

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
- `connectedWallet` - The connected wallet object
- `address` - User's address
- `chainId` - Current chain ID

**Actions:**

- `connect()` - Initiate wallet connection
- `disconnect()` - Disconnect wallet

### useCLOBV2

CLOB V2 trading functionality.

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

**Data:**

- `orderBook` - Current order book state
- `userOrders` - User's active orders
- `trades` - Recent trades
- `marketStats` - Market statistics

**Actions:**

- `placeLimitOrder(price, amount, isBuy, timeInForce, expiry)`
- `placeMarketOrder(amount, isBuy, maxSlippageBps)`
- `cancelOrder(orderId)`

### useRWYActions

RWY token staking and rewards.

```typescript
const { stake, unstake, claimRewards, stakedAmount, pendingRewards } =
  useRWYActions();
```

### useUserAssets

User's asset holdings.

```typescript
const { assets, isLoading, refetch } = useUserAssets(userAddress);
```

### useUserHoldings

User's token holdings across markets.

```typescript
const { holdings, totalValue } = useUserHoldings(address);
```

## Specialized Hooks

### useOrderBookDepth

Focused order book depth visualization.

```typescript
const { bids, asks, maxDepth, spread } = useOrderBookDepth(options);
```

### useUserCLOBOrders

User's CLOB orders with status filtering.

```typescript
const { orders, activeOrders, filledOrders, cancelledOrders } =
  useUserCLOBOrders(userAddress);
```

### useMarketTrades

Market trade history and statistics.

```typescript
const { trades, lastPrice, volume24h, tradeCount } = useMarketTrades(options);
```

## Data Hooks

### useMarketData

General market data.

### useOrderBook

Order book data fetching.

### useAssetPrice

Asset price fetching.

### usePlatformClasses

Platform class metadata.

### useClassAssets

Assets for a specific class.

## Utility Hooks

### useMobile

Mobile device detection.

```typescript
const isMobile = useMobile();
```

### useToast

Toast notifications.

## Adding New Hooks

1. Create hook in `/hooks` directory
2. Use repository layer for data fetching
3. Use service layer for transactions
4. Export types in `/types`
5. Document in this file

## Related

- [Application Structure](./Application%20Structure.md)
- [Providers](./Providers.md)
- [Pages Reference](./Pages%20Reference.md)
