---
tags: [frontend, hooks, react, clob, trading]
---

# React Hooks Reference

[[🏠 Home]] > Frontend > Hooks Reference

This document covers the custom React hooks in the Aurellion frontend. For provider documentation, see [[Frontend/Providers]].

---

## CLOB Hooks

### useCLOBV2

**File:** `hooks/useCLOBV2.ts`

Primary hook for interacting with CLOB V2 — order book, placing orders, managing positions.

```typescript
const {
  // Order book data
  orderBook,
  bids,
  asks,
  
  // Market data
  marketStats,
  lastPrice,
  volume24h,
  
  // User orders
  myOrders,
  myTrades,
  
  // Actions
  placeLimitOrder,
  placeMarketOrder,
  cancelOrder,
  refreshBook,
  
  // State
  isLoading,
  error,
} = useCLOBV2({
  baseToken: '0x...',
  baseTokenId: '1',
  quoteToken: USDC_ADDRESS,
  levels: 20,
  autoRefresh: true,
});
```

**Parameters:**
```typescript
interface UseCLOBV2Options {
  baseToken: string;        // ERC-1155 asset address
  baseTokenId: string;      // Token ID
  quoteToken: string;       // USDC address
  levels?: number;          // Order book depth (default: 20)
  refreshInterval?: number; // ms (default: 5000)
  autoRefresh?: boolean;    // default: true
}
```

**Returns:**
```typescript
interface UseCLOBV2Return {
  // Data
  orderBook: DisplayOrderBook;
  bids: PriceLevel[];
  asks: PriceLevel[];
  marketStats: MarketStats;
  lastPrice: string;
  volume24h: string;
  myOrders: DisplayOrder[];
  myTrades: DisplayTrade[];
  
  // Actions
  placeLimitOrder: (params: PlaceLimitOrderParams) => Promise<OrderPlacementResult>;
  placeMarketOrder: (params: PlaceMarketOrderParams) => Promise<OrderPlacementResult>;
  cancelOrder: (orderId: string) => Promise<OrderCancellationResult>;
  refreshBook: () => Promise<void>;
  
  // State
  isLoading: boolean;
  error: Error | null;
}
```

---

### useOrderBook

**File:** `hooks/useOrderBook.ts`

Lightweight hook for order book data only.

```typescript
const { bids, asks, spread, midPrice } = useOrderBook(marketId);
```

---

### useMarketData

**File:** `hooks/use-market-data.ts`

Market statistics and price data.

```typescript
const {
  lastPrice,
  priceChange24h,
  high24h,
  low24h,
  volume24h,
  trades24h,
} = useMarketData(marketId);
```

---

### useAssetPrice

**File:** `hooks/useAssetPrice.ts`

Fetches current asset price from oracle or CLOB.

```typescript
const price = useAssetPrice(tokenAddress, tokenId);
```

---

## Unified Order Hooks

### useUnifiedOrder

**File:** `hooks/useUnifiedOrder.ts`

Complete unified order lifecycle — bridging trades to logistics.

```typescript
const {
  // Orders
  orders,
  activeOrders,
  completedOrders,
  
  // Single order
  getOrder,
  getOrderProgress,
  
  // Actions
  createOrder,
  bridgeTrade,
  createLogistics,
  updateJourney,
  settleOrder,
  cancelOrder,
  
  // State
  isLoading,
  error,
} = useUnifiedOrder();
```

**Order Status Config:**
```typescript
type UnifiedOrderStatus = 
  | 'PENDING_TRADE'      // On order book
  | 'TRADE_MATCHED'      // Trade executed
  | 'LOGISTICS_CREATED'  // Delivery ordered
  | 'IN_TRANSIT'         // En route
  | 'DELIVERED'          // Arrived
  | 'SETTLED'            // Paid out
  | 'CANCELLED';         // Failed/cancelled
```

---

### useUserAssets

**File:** `hooks/useUserAssets.ts`

User's ERC-1155 token holdings.

```typescript
const {
  assets,
  balances,
  isLoading,
  refetch,
} = useUserAssets(address);
```

---

### useUserHoldings

**File:** `hooks/useUserHoldings.ts`

Aggregated portfolio view — tokens + staking + LP positions.

```typescript
const {
  totalValue,
  holdings,
  tokens,
  stakingPositions,
  lpPositions,
  isLoading,
  refetch,
} = useUserHoldings(address);
```

---

## Staking Hooks

### useRWYActions

**File:** `hooks/useRWYActions.ts`

RWY token staking actions.

```typescript
const {
  // Data
  stakedAmount,
  pendingRewards,
  lockEnd,
  
  // Actions
  stake,
  unstake,
  claimRewards,
  extendLock,
  
  // State
  isLoading,
  isApproving,
  isStaking,
} = useRWYActions();
```

---

### useRWYOpportunity

**File:** `hooks/useRWYOpportunity.ts`

Staking opportunity analysis and APY calculations.

```typescript
const {
  apy,
  totalStaked,
  rewardsPool,
  lockBonus,
  isLoading,
} = useRWYOpportunity();
```

---

### useRWYOpportunities

**File:** `hooks/useRWYOpportunities.ts`

Lists available RWY staking opportunities.

```typescript
const {
  opportunities,
  bestApy,
  refetch,
} = useRWYOpportunities();
```

---

### useAuraToken

**File:** `hooks/useAuraToken.ts`

AURA token balance and transfers.

```typescript
const {
  balance,
  allowance,
  transfer,
  approve,
  isLoading,
} = useAuraToken();
```

---

## Wallet Hooks

### useWallet

**File:** `hooks/useWallet.ts`

Wallet connection and authentication.

```typescript
const {
  address,
  chainId,
  isConnected,
  isConnecting,
  connect,
  disconnect,
  switchChain,
} = useWallet();
```

---

## Filter & Display Hooks

### useAttributeFilters

**File:** `hooks/useAttributeFilters.ts`

Filters for ERC-1155 attribute queries.

```typescript
const {
  filters,
  setAttribute,
  clearFilters,
  hasActiveFilters,
} = useAttributeFilters();
```

---

### usePlatformClasses

**File:** `hooks/usePlatformClasses.ts`

Available asset classes/platforms.

```typescript
const {
  classes,
  selectedClass,
  setClass,
} = usePlatformClasses();
```

---

### useClassAssets

**File:** `hooks/useClassAssets.ts`

Assets for a specific class.

```typescript
const {
  assets,
  isLoading,
} = useClassAssets(classId);
```

---

## Utility Hooks

### useMobile

**File:** `hooks/use-mobile.tsx`

Mobile device detection.

```typescript
const isMobile = useMobile();
const isTablet = useMobile(768);
```

---

### useToast

**File:** `hooks/use-toast.ts`

Notification system.

```typescript
const toast = useToast();

toast.success('Order placed!');
toast.error('Transaction failed');
toast.info('Processing...');
```

---

### usePriceAnimation

**File:** `hooks/usePriceAnimation.ts`

Animated price changes for UI.

```typescript
const { displayPrice, trend } = usePriceAnimation(price, {
  duration: 300,
  animate: true,
});
```

---

## Related Pages

- [[Frontend/Providers]]
- [[Frontend/Application Structure]]
- [[Frontend/Pages Reference]]
